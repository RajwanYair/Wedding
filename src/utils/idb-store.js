/**
 * idb-store.js — Promise-based IndexedDB adapter (Phase 1.3)
 *
 * Thin, zero-dependency wrappers around the raw IndexedDB API.
 * All operations return Promises; errors are converted to rejections.
 *
 * Usage:
 *   const db = await openDB('wedding', 1, { guests: { keyPath: 'id' } });
 *   await idbSet(db, 'guests', guest);
 *   const g = await idbGet(db, 'guests', guest.id);
 *
 * Pure functions — no module-level state; each consumer manages its own db handle.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {{ keyPath?: string, autoIncrement?: boolean, indexes?: Array<{ name: string, keyPath: string, unique?: boolean }> }} StoreSchema
 * @typedef {Record<string, StoreSchema>} DBSchema
 */

// ---------------------------------------------------------------------------
// Open / upgrade
// ---------------------------------------------------------------------------

/**
 * Open (or create) an IndexedDB database.
 * Creates object stores and indexes declared in `schema` during `onupgradeneeded`.
 *
 * @param {string} dbName
 * @param {number} version
 * @param {DBSchema} [schema]   Map of storeName → StoreSchema
 * @returns {Promise<IDBDatabase>}
 */
export function openDB(dbName, version, schema = {}) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, version);

    req.onerror = () => reject(new Error(`IDB open failed: ${req.error?.message ?? 'unknown'}`));
    req.onsuccess = () => resolve(/** @type {IDBDatabase} */ (req.result));

    req.onupgradeneeded = (event) => {
      const db = /** @type {IDBDatabase} */ (/** @type {IDBOpenDBRequest} */ (event.target).result);
      for (const [storeName, opts] of Object.entries(schema)) {
        let store;
        if (!db.objectStoreNames.contains(storeName)) {
          store = db.createObjectStore(storeName, {
            keyPath: opts.keyPath,
            autoIncrement: opts.autoIncrement ?? false,
          });
        } else {
          store = /** @type {IDBOpenDBRequest} */ (event.target)
            .transaction?.objectStore(storeName);
        }
        for (const idx of opts.indexes ?? []) {
          if (store && !store.indexNames.contains(idx.name)) {
            store.createIndex(idx.name, idx.keyPath, { unique: idx.unique ?? false });
          }
        }
      }
    };
  });
}

/**
 * Close a database connection.
 * @param {IDBDatabase} db
 */
export function closeDB(db) {
  db.close();
}

/**
 * Delete an entire database.
 * @param {string} dbName
 * @returns {Promise<void>}
 */
export function deleteDB(dbName) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onerror = () => reject(new Error(`IDB delete failed: ${req.error?.message ?? 'unknown'}`));
    req.onsuccess = () => resolve();
    req.onblocked = () => reject(new Error(`IDB delete blocked: another connection is open`));
  });
}

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

/**
 * Wrap an IDBRequest in a Promise.
 * @template T
 * @param {IDBRequest<T>} req
 * @returns {Promise<T>}
 */
function _promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error(req.error?.message ?? 'IDB error'));
  });
}

/**
 * Get a single record by key.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<unknown>}
 */
export function idbGet(db, storeName, key) {
  const tx = db.transaction(storeName, 'readonly');
  return _promisify(tx.objectStore(storeName).get(key));
}

/**
 * Store (put) a value. Replaces existing record with the same key.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {unknown} value
 * @param {IDBValidKey} [key]  Required when the store has no keyPath
 * @returns {Promise<IDBValidKey>}
 */
export function idbSet(db, storeName, value, key) {
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  const req = key !== undefined ? store.put(value, key) : store.put(value);
  return _promisify(req);
}

/**
 * Delete a record by key.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {IDBValidKey} key
 * @returns {Promise<void>}
 */
export function idbDel(db, storeName, key) {
  const tx = db.transaction(storeName, 'readwrite');
  return _promisify(tx.objectStore(storeName).delete(key));
}

/**
 * Get all records from a store.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<unknown[]>}
 */
export function idbGetAll(db, storeName) {
  const tx = db.transaction(storeName, 'readonly');
  return _promisify(tx.objectStore(storeName).getAll());
}

/**
 * Get all keys in a store.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<IDBValidKey[]>}
 */
export function idbGetAllKeys(db, storeName) {
  const tx = db.transaction(storeName, 'readonly');
  return _promisify(tx.objectStore(storeName).getAllKeys());
}

/**
 * Count records in a store.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<number>}
 */
export function idbCount(db, storeName) {
  const tx = db.transaction(storeName, 'readonly');
  return _promisify(tx.objectStore(storeName).count());
}

/**
 * Clear all records from a store.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<void>}
 */
export function idbClear(db, storeName) {
  const tx = db.transaction(storeName, 'readwrite');
  return _promisify(tx.objectStore(storeName).clear());
}

/**
 * Add a record (fails if a record with the same key already exists).
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {unknown} value
 * @param {IDBValidKey} [key]
 * @returns {Promise<IDBValidKey>}
 */
export function idbAdd(db, storeName, value, key) {
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  const req = key !== undefined ? store.add(value, key) : store.add(value);
  return _promisify(req);
}

// ---------------------------------------------------------------------------
// Index queries
// ---------------------------------------------------------------------------

/**
 * Get records from a store by an index value.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {string} indexName
 * @param {IDBValidKey} indexValue
 * @returns {Promise<unknown[]>}
 */
export function idbGetByIndex(db, storeName, indexName, indexValue) {
  const tx = db.transaction(storeName, 'readonly');
  const index = tx.objectStore(storeName).index(indexName);
  return _promisify(index.getAll(indexValue));
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------

/**
 * Set multiple key-value pairs in a single transaction.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {Array<{ key: IDBValidKey, value: unknown }>} entries
 * @returns {Promise<void>}
 */
export function idbSetMany(db, storeName, entries) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const { key, value } of entries) {
      store.put(value, key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(tx.error?.message ?? 'IDB batch write error'));
  });
}

/**
 * Delete multiple keys in a single transaction.
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {IDBValidKey[]} keys
 * @returns {Promise<void>}
 */
export function idbDelMany(db, storeName, keys) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const key of keys) {
      store.delete(key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(tx.error?.message ?? 'IDB batch delete error'));
  });
}
