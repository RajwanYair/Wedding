/**
 * src/utils/idb-queue.js — S203 lightweight IndexedDB persistence for the
 * offline queue.
 *
 * Stores the serialised queue array as a single JSON blob under the key
 * "queue" so that it survives page reloads and browser crashes — unlike
 * localStorage / storeSet which can be cleared by the browser.
 *
 * API:
 *   idbQueueRead()               → Promise<items[]>
 *   idbQueueWrite(items)         → Promise<void>
 *   idbQueueClear()              → Promise<void>
 *
 * Falls back silently to an empty result if IDB is unavailable (SSR / test).
 * @owner services
 */

const DB_NAME = "wedding_offline_queue";
const DB_VERSION = 1;
const STORE = "items";
const KEY = "queue";

/** @type {IDBDatabase | null} */
let _db = null;
let _opening = false;
const _waiters = /** @type {Array<(db: IDBDatabase | null) => void>} */ ([]);

/**
 * Open (or reuse) the IDB database.
 * @returns {Promise<IDBDatabase | null>}
 */
function _open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve) => {
    _waiters.push(resolve);
    if (_opening) return;
    _opening = true;

    if (typeof indexedDB === "undefined") {
      _opening = false;
      _waiters.splice(0).forEach((r) => r(null));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => {
      _db = req.result;
      _opening = false;
      _waiters.splice(0).forEach((r) => r(_db));
    };
    req.onerror = () => {
      _opening = false;
      _waiters.splice(0).forEach((r) => r(null));
    };
  });
}

/**
 * Read the persisted queue from IDB.
 * @returns {Promise<Array<{ type: string, payload: unknown, addedAt: string, retries: number }>>}
 */
export async function idbQueueRead() {
  const db = await _open();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => resolve([]);
  });
}

/**
 * Persist the entire queue array to IDB.
 * @param {Array<unknown>} items
 * @returns {Promise<void>}
 */
export async function idbQueueWrite(items) {
  const db = await _open();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(items, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/**
 * Remove all items from the IDB store.
 * @returns {Promise<void>}
 */
async function _idbQueueClear() {
  const db = await _open();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
