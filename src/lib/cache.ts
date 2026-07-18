const DB = 'aurora-live'; const STORE = 'feeds';

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  if (!('indexedDB' in globalThis)) return;
  const db = await open(); await new Promise<void>((resolve, reject) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(value, key); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!('indexedDB' in globalThis)) return null;
  const db = await open(); const value = await new Promise<T | null>((resolve, reject) => { const request = db.transaction(STORE).objectStore(STORE).get(key); request.onsuccess = () => resolve((request.result as T | undefined) ?? null); request.onerror = () => reject(request.error); }); db.close(); return value;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => { const request = indexedDB.open(DB, 1); request.onupgradeneeded = () => request.result.createObjectStore(STORE); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
