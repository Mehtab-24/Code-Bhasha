/**
 * WorkerPool manages a pool of Web Workers executing Pyodide Python code.
 * It implements a "warm-standby" design: maintaining one active worker and
 * preloading a backup worker in the background to ensure that if the active worker
 * times out (e.g. from an infinite loop) and is terminated, the backup takes its place
 * instantly, eliminating Pyodide load latency.
 */
export class WorkerPool {
  private activeWorker: Worker | null = null;
  private backupWorker: Worker | null = null;
  private isWorkerReady = false;
  private isBackupReady = false;

  constructor(
    private onMessage: (event: MessageEvent<any>) => void,
    private onError: (error: any) => void,
    private onExit: () => void
  ) {
    this.initializeActiveWorker();
    this.preloadBackupWorker();
  }

  private createWorker(): Worker {
    return new Worker(new URL('../workers/pyodide.worker.ts', import.meta.url));
  }

  private initializeActiveWorker() {
    this.activeWorker = this.createWorker();
    this.wireWorker(this.activeWorker, true);
  }

  private preloadBackupWorker() {
    this.backupWorker = this.createWorker();
    this.wireWorker(this.backupWorker, false);
  }

  private wireWorker(worker: Worker, isActive: boolean) {
    worker.onmessage = (event: MessageEvent<any>) => {
      if (event.data.type === 'READY') {
        if (isActive) {
          this.isWorkerReady = true;
          this.onMessage(event);
        } else {
          this.isBackupReady = true;
        }
        return;
      }
      
      if (isActive) {
        this.onMessage(event);
      }
    };

    worker.onerror = (error: any) => {
      if (isActive) {
        this.onError(error);
      }
    };
  }

  public getActiveWorker(): Worker | null {
    return this.activeWorker;
  }

  public isReady(): boolean {
    return this.isWorkerReady;
  }

  public postMessage(message: any) {
    this.activeWorker?.postMessage(message);
  }

  /**
   * Recycles the active worker by terminating it.
   * Promotes the pre-initialized backup worker to active instantly,
   * then spawns a new backup worker in the background.
   */
  public recycleActiveWorker() {
    console.log('[WorkerPool] Terminating active worker...');
    this.isWorkerReady = false;
    
    if (this.activeWorker) {
      this.activeWorker.terminate();
    }

    if (this.backupWorker && this.isBackupReady) {
      console.log('[WorkerPool] Promoting warm backup worker to active');
      this.activeWorker = this.backupWorker;
      this.isWorkerReady = true;
      
      // Wire active callbacks to this worker
      this.wireWorker(this.activeWorker, true);
      
      // Notify main thread that the worker is ready immediately
      this.onMessage(new MessageEvent('message', { 
        data: { type: 'READY' } 
      }));
      
      // Preload a new backup worker in the background
      this.isBackupReady = false;
      this.preloadBackupWorker();
    } else {
      console.log('[WorkerPool] Warm backup not ready yet. Rebuilding active worker from scratch...');
      if (this.backupWorker) {
        this.backupWorker.terminate();
      }
      this.isBackupReady = false;
      
      this.initializeActiveWorker();
      this.preloadBackupWorker();
      
      // Notify main thread of exit/restarting state
      this.onExit();
    }
  }

  /**
   * Terminates all active and backup workers.
   */
  public terminateAll() {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
    if (this.backupWorker) {
      
      this.backupWorker.terminate();
      this.backupWorker = null;
    }
    this.isWorkerReady = false;
    this.isBackupReady = false;
  }
}
