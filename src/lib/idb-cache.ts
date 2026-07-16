/**
 * Promise-wrapped lightweight IndexedDB utility for caching Bedrock AI responses locally.
 * Degrades gracefully on SSR (Server-Side Rendering) and private browsing modes.
 */
export class IndexedDBCache {
  private dbName = 'codebhasha-cache';
  private storeName = 'responses';
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.dbPromise = new Promise((resolve, reject) => {
        try {
          const request = indexedDB.open(this.dbName, 1);
          
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(this.storeName)) {
              db.createObjectStore(this.storeName);
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

  public async get<T>(key: string): Promise<T | null> {
    if (!this.dbPromise) return null;
    try {
      const db = await this.dbPromise;
      return new Promise<T | null>((resolve) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result as T || null);
        request.onerror = () => resolve(null); // Fallback to cache miss
      });
    } catch {
      return null;
    }
  }

  public async set<T>(key: string, value: T): Promise<void> {
    if (!this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      return new Promise<void>((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => resolve(); // Ignore write errors
      });
    } catch {
      // Degrade gracefully on write failures
    }
  }
}

export const idbCache = new IndexedDBCache();
export default idbCache;
