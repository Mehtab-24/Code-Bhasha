/**
 * LocalProjectsDB manages browser IndexedDB storage for CodeBhasha projects and version history.
 * Runs on the client, providing offline-first capabilities and keeping cloud costs at zero
 * until an explicit cloud sync is triggered.
 */

export interface FileSnapshot {
  id: string;
  timestamp: number;
  content: string;
}

export class LocalProjectsDB {
  private dbName = 'codebhasha-projects';
  private filesStore = 'files';
  private checkpointsStore = 'checkpoints';
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.dbPromise = new Promise((resolve, reject) => {
        try {
          const request = indexedDB.open(this.dbName, 1);
          
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(this.filesStore)) {
              db.createObjectStore(this.filesStore, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(this.checkpointsStore)) {
              db.createObjectStore(this.checkpointsStore, { keyPath: 'fileId' });
            }
          };

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });
    }
  }

  /**
   * Save the entire workspace files list to IndexedDB.
   */
  public async saveFiles(files: { id: string; name: string; content: string }[]): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    return new Promise<void>((resolve) => {
      const transaction = db.transaction(this.filesStore, 'readwrite');
      const store = transaction.objectStore(this.filesStore);
      
      // Clear the store first so deleted files are removed from disk
      store.clear();
      files.forEach((file) => store.put(file));
      
      transaction.oncomplete = () => resolve();
    });
  }

  /**
   * Retrieve all saved files from IndexedDB.
   */
  public async getFiles(): Promise<{ id: string; name: string; content: string }[]> {
    if (!this.dbPromise) return [];
    try {
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const transaction = db.transaction(this.filesStore, 'readonly');
        const store = transaction.objectStore(this.filesStore);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetch all version checkpoints for a specific file.
   */
  public async getCheckpoints(fileId: string): Promise<FileSnapshot[]> {
    if (!this.dbPromise) return [];
    try {
      const db = await this.dbPromise;
      return new Promise((resolve) => {
        const transaction = db.transaction(this.checkpointsStore, 'readonly');
        const store = transaction.objectStore(this.checkpointsStore);
        const request = store.get(fileId);
        
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.snapshots : []);
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Create a new version checkpoint for a file. 
   * Capped at 10 snapshots per file. Deduplicates redundant checkpoints.
   */
  public async createCheckpoint(fileId: string, content: string): Promise<void> {
    if (!this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      const existing = await this.getCheckpoints(fileId);
      
      // Prevent duplicating identical content
      if (existing.length > 0 && existing[existing.length - 1].content === content) {
        return;
      }

      const newSnapshot: FileSnapshot = {
        id: `cp_${Date.now()}`,
        timestamp: Date.now(),
        content
      };

      // Cap to the last 10 snapshots
      const updatedSnapshots = [...existing, newSnapshot].slice(-10);

      return new Promise<void>((resolve) => {
        const transaction = db.transaction(this.checkpointsStore, 'readwrite');
        const store = transaction.objectStore(this.checkpointsStore);
        store.put({ fileId, snapshots: updatedSnapshots });
        
        transaction.oncomplete = () => resolve();
      });
    } catch (err) {
      console.error('[LocalProjectsDB] Failed to create checkpoint:', err);
    }
  }
}

export const localDB = new LocalProjectsDB();
export default localDB;
