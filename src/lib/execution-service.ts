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

  constructor() {
    this.initializeWorker();
  }

  private async initializeWorker() {
    try {
      // Create worker with inline code to avoid module loading issues
      const workerCode = `
        let pyodide = null;
        let isInitialized = false;
        
        // Load Pyodide from CDN
        importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');
        
        async function initializePyodide() {
          try {
            console.log('[Worker] Loading Pyodide...');
            
            pyodide = await loadPyodide({
              indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
            });

            // Set up stdout/stderr capture
            pyodide.runPython(\`
import sys
import io

class OutputCapture:
    def __init__(self, message_type):
        self.message_type = message_type
    
    def write(self, text):
        if text.strip():
            # Use postMessage to send to main thread
            import js
            js.self.postMessage({
                'type': self.message_type,
                'line': text.rstrip(),
                'id': js.current_execution_id
            })
    
    def flush(self):
        pass

stdout_capture = OutputCapture('STDOUT')
stderr_capture = OutputCapture('STDERR')
\`);

            isInitialized = true;
            console.log('[Worker] Pyodide initialized successfully');
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
          
          // Set up 10-second timeout
          const timeoutId = setTimeout(() => {
            console.log('[Worker] Execution timeout - terminating worker');
            self.close();
          }, 10000);

          try {
            // Set current execution ID for output capture
            self.current_execution_id = executionId;
            
            // Redirect stdout/stderr to our custom handlers
            pyodide.runPython(\`
import sys
sys.stdout = stdout_capture
sys.stderr = stderr_capture
\`);

            // Execute the user's code
            await pyodide.runPythonAsync(code);
            
            // Restore original stdout/stderr
            pyodide.runPython(\`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
\`);

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
            let errorMessage = error.message || 'Unknown error occurred';
            let lineNumber = 0;
            let lineText = '';
            
            // Extract line number from traceback if available
            if (error.message) {
              const lineMatch = error.message.match(/line (\\d+)/);
              if (lineMatch) {
                lineNumber = parseInt(lineMatch[1], 10);
              }
              
              // Extract error type
              const typeMatch = error.message.match(/^(\\w+Error?):/);
              if (typeMatch) {
                errorType = typeMatch[1];
              }
            }
            
            // Get the problematic line from code if possible
            if (lineNumber > 0) {
              const lines = code.split('\\n');
              if (lineNumber <= lines.length) {
                lineText = lines[lineNumber - 1].trim();
              }
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
        
        // Handle messages from main thread
        self.onmessage = async (event) => {
          const { type, code, id } = event.data;
          if (type === 'EXECUTE') {
            await executePythonCode(code, id);
          }
        };
        
        // Initialize Pyodide when worker starts
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

      // Handle worker termination (timeout case)
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
            text: message.line
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
        line_text: ''
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
        line_text: ''
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
      status: 'running'
    };

    if (!this.isWorkerReady || this.currentExecution) {
      // Queue the execution
      this.executionQueue.push({ code, callback });
      return executionId;
    }

    this.currentExecution = {
      id: executionId,
      callback,
      result
    };

    // Send execution request to worker
    this.worker?.postMessage({
      type: 'EXECUTE',
      code,
      id: executionId
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