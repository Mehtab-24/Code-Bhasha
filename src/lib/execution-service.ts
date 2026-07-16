// Execution service to manage Pyodide Web Worker
'use client';

// Message types matching the worker
interface OutputMessage {
  type: 'STDOUT' | 'STDERR';
  line: string;
  id: string;
}

interface TraceStep {
  line: number;
  variables: Record<string, string>;
}

interface ErrorMessage {
  type: 'ERROR';
  payload: {
    type: string;
    message: string;
    lineno: number;
    line_text: string;
  };
  trace?: TraceStep[];
  id: string;
}

interface DoneMessage {
  type: 'DONE';
  executionTime: number;
  trace: TraceStep[];
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
  trace?: TraceStep[];
  executionTime?: number;
  status: 'running' | 'completed' | 'error' | 'timeout';
}

export type ExecutionCallback = (result: ExecutionResult) => void;

import { WorkerPool } from './worker-pool';

class ExecutionService {
  private pool: WorkerPool | null = null;
  private isWorkerReady = false;
  private currentExecution: {
    id: string;
    callback: ExecutionCallback;
    result: ExecutionResult;
    timeoutId?: NodeJS.Timeout;
  } | null = null;
  private executionQueue: Array<{
    code: string;
    stdin: string;
    callback: ExecutionCallback;
  }> = [];

  // Subscriber list for the READY event.
  private readyListeners: Array<() => void> = [];

  constructor() {
    this.initializeWorker();
  }

  // ── Public API: subscribe to the worker-ready event ──────────────────────────
  // Returns an unsubscribe function for cleanup in useEffect.
  // If the worker is already ready when this is called,
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
      this.pool = new WorkerPool(
        (event) => this.handleWorkerMessage(event.data),
        (error) => {
          console.error('[ExecutionService] Worker error:', error);
          this.handleWorkerError();
        },
        () => {
          console.log('[ExecutionService] Worker exited');
          this.handleWorkerTimeout();
        }
      );
    } catch (error) {
      console.error('[ExecutionService] Failed to initialize worker:', error);
    }
  }

  private handleWorkerMessage(message: WorkerMessage) {
    if (message.type === 'READY') {
      this.isWorkerReady = true;
      console.log('[ExecutionService] Worker is ready');
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
          result.trace = message.trace;
          result.status = 'error';
          this.completeExecution();
        }
        break;

      case 'DONE':
        if (message.id === result.id) {
          result.executionTime = message.executionTime;
          result.trace = message.trace;
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
    if (this.pool) {
      this.pool.recycleActiveWorker();
    }
    // Reset ready listeners so new subscribers after reinit work correctly
    this.readyListeners = [];
  }

  private processQueue() {
    if (!this.isWorkerReady || this.currentExecution || this.executionQueue.length === 0) {
      return;
    }
    const { code, stdin, callback } = this.executionQueue.shift()!;
    this.executeCode(code, stdin, callback);
  }

  public executeCode(code: string, stdin: string, callback: ExecutionCallback): string {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result: ExecutionResult = {
      id: executionId,
      output: [],
      status: 'running',
    };

    if (!this.isWorkerReady || this.currentExecution) {
      this.executionQueue.push({ code, stdin, callback });
      return executionId;
    }

    this.currentExecution = {
      id: executionId,
      callback,
      result,
    };

    this.pool?.postMessage({
      type: 'EXECUTE',
      code,
      stdin,
      id: executionId,
    });

    return executionId;
  }

  public isReady(): boolean {
    return this.isWorkerReady;
  }

  public terminate() {
    if (this.pool) {
      this.pool.terminateAll();
      this.pool = null;
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