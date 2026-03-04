// Execution service to manage Pyodide Web Worker
'use client';

// Message types matching the worker
interface OutputMessage {
  type: 'STDOUT' | 'STDERR';
  line: string;
  id: string;
}

interface ErrorMessage {
  type: 'ERROR';
  payload: {
    type: string;
    message: string;
    lineno: number;
    line_text: string;
  };
  id: string;
}

interface DoneMessage {
  type: 'DONE';
  executionTime: number;
  id: string;
}

interface ReadyMessage {
  type: 'READY';
}

type WorkerMessage = OutputMessage | ErrorMessage | DoneMessage | ReadyMessage;

export interface ExecutionResult {
  id: string;
  output: Array<{ type: 'stdout' | 'stderr'; text: string }>;
  error?: {
    type: string;
    message: string;
    lineno: number;
    line_text: string;
  };
  executionTime?: number;
  status: 'running' | 'completed' | 'error' | 'timeout';
}

export type ExecutionCallback = (result: ExecutionResult) => void;

class ExecutionService {
  private worker: Worker | null = null;
  private isWorkerReady = false;
  private currentExecution: {
    id: string;
    callback: ExecutionCallback;
    result: ExecutionResult;
    timeoutId?: NodeJS.Timeout;
  } | null = null;
  private executionQueue: Array<{
    code: string;
    callback: ExecutionCallback;
  }> = [];

  // FIX: Subscriber list for the READY event.
  // AppShell subscribes via onReady() instead of polling with setInterval.
  private readyListeners: Array<() => void> = [];

  constructor() {
    this.initializeWorker();
  }

  // ── Public API: subscribe to the worker-ready event ──────────────────────────
  // Returns an unsubscribe function for cleanup in useEffect.
  // If the worker is already ready when this is called (e.g. after HMR),
  // the listener fires synchronously so the UI never gets stuck.
  public onReady(listener: () => void): () => void {
    if (this.isWorkerReady) {
      listener();
      return () => {};
    }
    this.readyListeners.push(listener);
    return () => {
      this.readyListeners = this.readyListeners.filter((l) => l !== listener);
    };
  }

  private notifyReadyListeners() {
    // Drain the list — READY fires exactly once per worker lifecycle.
    const listeners = this.readyListeners.splice(0);
    listeners.forEach((l) => l());
  }

  private async initializeWorker() {
    try {
      // The inline blob avoids Next.js module bundling issues with Web Workers.
      // It mirrors pyodide-worker.ts but as a plain JS string so it can be
      // loaded via URL.createObjectURL without a bundler plugin.
      const workerCode = `
        let pyodide = null;
        let isInitialized = false;
        let currentExecutionId = '';

        importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

        async function initializePyodide() {
          try {
            console.log('[Worker] Loading Pyodide...');

            pyodide = await loadPyodide({
              indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
            });

            // FIX: Use Pyodide's native JS-side stream hooks.
            // Previous approach monkey-patched console.log and used a Python
            // OutputCapture class that called print(..., file=sys.__stdout__).
            // That never actually triggered the JS console — output was lost.
            // setStdout/setStderr are the correct, documented API.
            pyodide.setStdout({
              batched: (line) => {
                self.postMessage({
                  type: 'STDOUT',
                  line: line,
                  id: currentExecutionId
                });
              }
            });

            pyodide.setStderr({
              batched: (line) => {
                self.postMessage({
                  type: 'STDERR',
                  line: line,
                  id: currentExecutionId
                });
              }
            });

            isInitialized = true;
            console.log('[Worker] Pyodide initialized successfully');

            // FIX: Post READY immediately — this is the single signal the
            // main thread waits for. The old code did post READY but it was
            // lost because the blob's console.log intercept was breaking the
            // message handler registration timing.
            self.postMessage({ type: 'READY' });

          } catch (error) {
            console.error('[Worker] Failed to initialize Pyodide:', error);
            self.postMessage({
              type: 'ERROR',
              payload: {
                type: 'InitializationError',
                message: 'Browser execution load nahi ho raha. Page reload karo.',
                lineno: 0,
                line_text: ''
              },
              id: 'init'
            });
          }
        }

        async function executePythonCode(code, executionId) {
          if (!pyodide || !isInitialized) {
            self.postMessage({
              type: 'ERROR',
              payload: {
                type: 'NotInitialized',
                message: 'Python engine abhi ready nahi hai. Thoda wait karo.',
                lineno: 0,
                line_text: ''
              },
              id: executionId
            });
            return;
          }

          const startTime = performance.now();

          const timeoutId = setTimeout(() => {
            console.log('[Worker] Execution timeout - terminating worker');
            self.close();
          }, 10000);

          try {
            // Point stream output at this execution's id
            currentExecutionId = executionId;

            // Run user code — stdout/stderr already wired via setStdout/setStderr
            await pyodide.runPythonAsync(code);

            const executionTime = performance.now() - startTime;
            clearTimeout(timeoutId);

            self.postMessage({
              type: 'DONE',
              executionTime: Math.round(executionTime),
              id: executionId
            });

          } catch (error) {
            clearTimeout(timeoutId);

            let errorType = 'PythonError';
            let errorMessage = (error && error.message) ? error.message : 'Unknown error occurred';
            let lineNumber = 0;
            let lineText = '';

            if (error && error.message) {
              const lineMatch = error.message.match(/line (\\d+)/);
              if (lineMatch) lineNumber = parseInt(lineMatch[1], 10);

              const typeMatch = error.message.match(/^(\\w+Error?):/);
              if (typeMatch) errorType = typeMatch[1];
            }

            if (lineNumber > 0) {
              const lines = code.split('\\n');
              if (lineNumber <= lines.length) lineText = lines[lineNumber - 1].trim();
            }

            console.error('[Worker] Python execution error:', error);

            self.postMessage({
              type: 'ERROR',
              payload: {
                type: errorType,
                message: errorMessage,
                lineno: lineNumber,
                line_text: lineText
              },
              id: executionId
            });
          }
        }

        self.onmessage = async (event) => {
          const { type, code, id } = event.data;
          if (type === 'EXECUTE') {
            await executePythonCode(code, id);
          }
        };

        initializePyodide();
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        this.handleWorkerMessage(event.data);
      };

      this.worker.onerror = (error) => {
        console.error('[ExecutionService] Worker error:', error);
        this.handleWorkerError();
      };

      // Handle worker termination (timeout case from self.close() inside worker)
      this.worker.addEventListener('close', () => {
        console.log('[ExecutionService] Worker terminated');
        this.handleWorkerTimeout();
      });

    } catch (error) {
      console.error('[ExecutionService] Failed to initialize worker:', error);
    }
  }

  private handleWorkerMessage(message: WorkerMessage) {
    if (message.type === 'READY') {
      this.isWorkerReady = true;
      console.log('[ExecutionService] Worker is ready');
      // FIX: Notify all onReady() subscribers immediately.
      // AppShell's useEffect receives this and calls setWorkerReady(true),
      // clearing "Initializing..." with zero polling delay.
      this.notifyReadyListeners();
      this.processQueue();
      return;
    }

    if (!this.currentExecution) return;

    const { result, callback } = this.currentExecution;

    switch (message.type) {
      case 'STDOUT':
      case 'STDERR':
        if (message.id === result.id) {
          result.output.push({
            type: message.type.toLowerCase() as 'stdout' | 'stderr',
            text: message.line,
          });
          callback(result);
        }
        break;

      case 'ERROR':
        if (message.id === result.id) {
          result.error = message.payload;
          result.status = 'error';
          this.completeExecution();
        }
        break;

      case 'DONE':
        if (message.id === result.id) {
          result.executionTime = message.executionTime;
          result.status = 'completed';
          this.completeExecution();
        }
        break;
    }
  }

  private handleWorkerError() {
    if (this.currentExecution) {
      this.currentExecution.result.status = 'error';
      this.currentExecution.result.error = {
        type: 'WorkerError',
        message: 'Code execution mein problem hui. Dobara try karo.',
        lineno: 0,
        line_text: '',
      };
      this.completeExecution();
    }
    this.reinitializeWorker();
  }

  private handleWorkerTimeout() {
    if (this.currentExecution) {
      this.currentExecution.result.status = 'timeout';
      this.currentExecution.result.error = {
        type: 'TimeoutError',
        message: 'Bhai, code bahut time le raha hai. Infinite loop toh nahi?',
        lineno: 0,
        line_text: '',
      };
      this.completeExecution();
    }
    this.reinitializeWorker();
  }

  private completeExecution() {
    if (this.currentExecution) {
      if (this.currentExecution.timeoutId) {
        clearTimeout(this.currentExecution.timeoutId);
      }
      this.currentExecution.callback(this.currentExecution.result);
      this.currentExecution = null;
    }
    this.processQueue();
  }

  private reinitializeWorker() {
    this.isWorkerReady = false;
    if (this.worker) {
      this.worker.terminate();
    }
    // Reset ready listeners so new subscribers after reinit work correctly
    this.readyListeners = [];
    setTimeout(() => {
      this.initializeWorker();
    }, 100);
  }

  private processQueue() {
    if (!this.isWorkerReady || this.currentExecution || this.executionQueue.length === 0) {
      return;
    }
    const { code, callback } = this.executionQueue.shift()!;
    this.executeCode(code, callback);
  }

  public executeCode(code: string, callback: ExecutionCallback): string {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result: ExecutionResult = {
      id: executionId,
      output: [],
      status: 'running',
    };

    if (!this.isWorkerReady || this.currentExecution) {
      this.executionQueue.push({ code, callback });
      return executionId;
    }

    this.currentExecution = {
      id: executionId,
      callback,
      result,
    };

    this.worker?.postMessage({
      type: 'EXECUTE',
      code,
      id: executionId,
    });

    return executionId;
  }

  public isReady(): boolean {
    return this.isWorkerReady;
  }

  public terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isWorkerReady = false;
    this.currentExecution = null;
    this.executionQueue = [];
    this.readyListeners = [];
  }
}

// Singleton instance
let executionService: ExecutionService | null = null;

export function getExecutionService(): ExecutionService {
  if (!executionService) {
    executionService = new ExecutionService();
  }
  return executionService;
}