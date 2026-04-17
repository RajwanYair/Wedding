/**
 * src/core/storage.js — Async storage abstraction (F2.3)
 *
 * Provides a unified key-value storage API with a priority fallback chain:
 *   1. IndexedDB (best capacity, async)
 *   2. localStorage (sync, 5-10 MB limit)
 *   3. In-memory (volatile, for broken environments)
 *
 * All methods are async. The adapter is chosen once on init and cached.
 * Zero runtime dependencies.
 */

/** @typedef {"indexeddb" | "localstorage" | "memory"} AdapterType */

// ── In-memory adapter ─────────────────────────────────────────────────────

/** @type {Map<string, string>} */
const _memStore = new Map();

/** @type {{ getItem(k: string): Promise<string|null>, setItem(k: string, v: string): Promise<void>, removeItem(k: string): Promise<void>, clear(): Promise<void> }} */
const _memAdapter = {
  async getItem(k) {
    return _memStore.get(k) ?? null;
  },
  async setItem(k, v) {
    _memStore.set(k, v);
  },
  async removeItem(k) {
    _memStore.delete(k);
  },
  async clear() {
    _memStore.clear();
  },
};

// ── localStorage adapter ──────────────────────────────────────────────────

/** @type {typeof _memAdapter} */
const _lsAdapter = {
  async getItem(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  async setItem(k, v) {
    localStorage.setItem(k, v);
  },
  async removeItem(k) {
    localStorage.removeItem(k);
  },
  async clear() {
    localStorage.clear();
  },
};

// ── IndexedDB adapter ─────────────────────────────────────────────────────

const _IDB_NAME = "wedding_storage";
const _IDB_STORE = "kv";
const _IDB_VERSION = 1;

/**
 * Open the IndexedDB database (cached promise).
 * @returns {Promise<IDBDatabase>}
 */
let _dbPromise = /** @type {Promise<IDBDatabase> | null} */ (null);

function _openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, _IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(_IDB_STORE)) {
        db.createObjectStore(_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

/**
 * Run an IndexedDB transaction and return a promise.
 * @param {"readonly" | "readwrite"} mode
 * @param {(store: IDBObjectStore) => IDBRequest | void} fn
 * @returns {Promise<unknown>}
 */
async function _idbTx(mode, fn) {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(_IDB_STORE, mode);
    const store = tx.objectStore(_IDB_STORE);
    const req = fn(store);
    if (req) {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } else {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    }
  });
}

/** @type {typeof _memAdapter} */
const _idbAdapter = {
  async getItem(k) {
    const val = await _idbTx("readonly", (s) => s.get(k));
    return /** @type {string | null} */ (val ?? null);
  },
  async setItem(k, v) {
    await _idbTx("readwrite", (s) => s.put(v, k));
  },
  async removeItem(k) {
    await _idbTx("readwrite", (s) => s.delete(k));
  },
  async clear() {
    await _idbTx("readwrite", (s) => s.clear());
  },
  /**
   * Write multiple key-value pairs in a single transaction (batch write).
   * @param {Array<[string, string]>} entries
   * @returns {Promise<void>}
   */
  async setItemBatch(entries) {
    if (entries.length === 0) return;
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(_IDB_STORE, "readwrite");
      const store = tx.objectStore(_IDB_STORE);
      for (const [k, v] of entries) store.put(v, k);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

// ── Adapter selection ─────────────────────────────────────────────────────

/** @type {typeof _memAdapter} */
let _adapter = _memAdapter;

/** @type {AdapterType} */
let _adapterType = "memory";

/**
 * Detect the best available adapter. Run once during init.
 * @returns {Promise<AdapterType>}
 */
async function _detectAdapter() {
  // Try IndexedDB
  if (typeof indexedDB !== "undefined") {
    try {
      await _openDB();
      // Quick smoke test — write then read
      await _idbAdapter.setItem("__probe__", "1");
      const v = await _idbAdapter.getItem("__probe__");
      await _idbAdapter.removeItem("__probe__");
      if (v === "1") return "indexeddb";
    } catch {
      // IndexedDB not usable (private mode, broken env)
      _dbPromise = null;
    }
  }
  // Try localStorage
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem("__probe__", "1");
      localStorage.removeItem("__probe__");
      return "localstorage";
    } catch {
      // localStorage blocked
    }
  }
  return "memory";
}

// ── Public API ────────────────────────────────────────────────────────────

/** @type {boolean} */
let _initialised = false;

/**
 * Initialise the storage layer. Call once during app bootstrap.
 * Selects the best adapter and optionally migrates data from localStorage.
 * @returns {Promise<AdapterType>} The chosen adapter type
 */
export async function initStorage() {
  if (_initialised) return _adapterType;
  _adapterType = await _detectAdapter();
  _adapter =
    _adapterType === "indexeddb"
      ? _idbAdapter
      : _adapterType === "localstorage"
        ? _lsAdapter
        : _memAdapter;
  _initialised = true;
  return _adapterType;
}

/**
 * Returns the active adapter type.
 * @returns {AdapterType}
 */
export function getAdapterType() {
  return _adapterType;
}

/**
 * Get a value from storage by key.
 * @param {string} key
 * @returns {Promise<string | null>}
 */
export async function storageGet(key) {
  return _adapter.getItem(key);
}

/**
 * Set a value in storage.
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
export async function storageSet(key, value) {
  return _adapter.setItem(key, value);
}

/**
 * Write multiple key-value pairs in a single transaction when using IndexedDB,
 * or falls back to sequential writes for other adapters.
 * Cheaper than N individual storageSet() calls when writing many keys at once.
 * @param {Array<[string, string]>} entries  Array of [key, value] tuples
 * @returns {Promise<void>}
 */
export async function storageSetBatch(entries) {
  if (entries.length === 0) return;
  if (_adapterType === "indexeddb" && "setItemBatch" in _adapter) {
    return /** @type {typeof _idbAdapter} */ (_adapter).setItemBatch(entries);
  }
  // Fallback: sequential writes
  for (const [k, v] of entries) await _adapter.setItem(k, v);
}

/**
 * Remove a value from storage.
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function storageRemove(key) {
  return _adapter.removeItem(key);
}

/**
 * Clear all storage.
 * @returns {Promise<void>}
 */
export async function storageClear() {
  return _adapter.clear();
}

/**
 * Migrate all wedding_v1_* keys from localStorage to IndexedDB.
 * No-op if the active adapter is not IndexedDB.
 * @param {string} [prefix="wedding_v1_"]
 * @returns {Promise<number>} Number of keys migrated
 */
export async function migrateFromLocalStorage(prefix = "wedding_v1_") {
  if (_adapterType !== "indexeddb") return 0;
  if (typeof localStorage === "undefined") return 0;
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const val = localStorage.getItem(key);
    if (val !== null) {
      await _idbAdapter.setItem(key, val);
      count++;
    }
  }
  return count;
}
