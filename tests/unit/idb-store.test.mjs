/**
 * tests/unit/idb-store.test.mjs — Sprint 41: IndexedDB adapter
 *
 * Uses a lightweight in-memory IDB mock (vi.stubGlobal) because
 * happy-dom does not implement indexedDB.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  openDB,
  closeDB,
  deleteDB,
  idbGet,
  idbSet,
  idbDel,
  idbGetAll,
  idbGetAllKeys,
  idbCount,
  idbClear,
  idbAdd,
  idbGetByIndex,
  idbSetMany,
  idbDelMany,
} from '../../src/utils/idb-store.js';

// ---------------------------------------------------------------------------
// Minimal in-memory IndexedDB mock
// ---------------------------------------------------------------------------

/**
 * Build a fake IDB environment backed by plain Maps.
 * Returns a fake `indexedDB` object suitable for vi.stubGlobal.
 */
function buildFakeIdb() {
  // databases keyed by name → { stores: Map<storeName, { data: Map, indexes: Map, keyPath?, autoIncrement }> }
  const _dbs = new Map();

  function getOrCreate(name) {
    if (!_dbs.has(name)) _dbs.set(name, { stores: new Map() });
    return _dbs.get(name);
  }

  function makeRequest(result) {
    const req = { result: undefined, error: null, onsuccess: null, onerror: null };
    Promise.resolve().then(() => {
      req.result = typeof result === 'function' ? result() : result;
      req.onsuccess?.({ target: req });
    });
    return req;
  }

  function makeObjectStore(storeData) {
    const { data, indexes, keyPath } = storeData;

    function resolveKey(value, explicitKey) {
      if (keyPath) return value[keyPath];
      return explicitKey;
    }

    return {
      keyPath,
      indexNames: { contains: (n) => indexes.has(n) },
      createIndex(name, kp, _opts) {
        indexes.set(name, { keyPath: kp });
        return { name, keyPath: kp };
      },
      get: (key) => makeRequest(() => data.get(key)),
      put(value, key) {
        const k = resolveKey(value, key);
        data.set(k, value);
        return makeRequest(() => k);
      },
      add(value, key) {
        const k = resolveKey(value, key);
        if (data.has(k)) {
          const req = { result: undefined, error: new Error(`Key ${k} exists`), onsuccess: null, onerror: null };
          Promise.resolve().then(() => req.onerror?.({ target: req }));
          return req;
        }
        data.set(k, value);
        return makeRequest(() => k);
      },
      delete: (key) => { data.delete(key); return makeRequest(() => undefined); },
      getAll: () => makeRequest(() => [...data.values()]),
      getAllKeys: () => makeRequest(() => [...data.keys()]),
      count: () => makeRequest(() => data.size),
      clear: () => { data.clear(); return makeRequest(() => undefined); },
      index(idxName) {
        const idx = indexes.get(idxName);
        return {
          getAll: (val) => makeRequest(() => [...data.values()].filter((v) => v[idx.keyPath] === val)),
        };
      },
    };
  }

  function makeTx(dbEntry, storeNames, _mode) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const tx = {
      oncomplete: null,
      onerror: null,
      error: null,
      objectStore(name) { return makeObjectStore(dbEntry.stores.get(name)); },
    };
    // auto-complete on next tick
    Promise.resolve().then(() => tx.oncomplete?.());
    return tx;
  }

  function makeDB(name, dbEntry) {
    return {
      objectStoreNames: {
        contains: (n) => dbEntry.stores.has(n),
      },
      createObjectStore(storeName, opts) {
        const storeData = { data: new Map(), indexes: new Map(), keyPath: opts?.keyPath, autoIncrement: opts?.autoIncrement };
        dbEntry.stores.set(storeName, storeData);
        return makeObjectStore(storeData);
      },
      transaction: (storeNames, mode) => makeTx(dbEntry, storeNames, mode),
      close: vi.fn(),
    };
  }

  return {
    open(name, version) {
      const dbEntry = getOrCreate(name);
      const db = makeDB(name, dbEntry);

      const req = {
        result: db,
        error: null,
        transaction: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      Promise.resolve().then(() => {
        req.transaction = { objectStore: (n) => makeObjectStore(dbEntry.stores.get(n) ?? { data: new Map(), indexes: new Map() }) };
        req.onupgradeneeded?.({ target: req });
      }).then(() => {
        req.onsuccess?.({ target: req });
      });

      return req;
    },
    deleteDatabase(name) {
      _dbs.delete(name);
      const req = { result: undefined, error: null, onsuccess: null, onerror: null, onblocked: null };
      Promise.resolve().then(() => req.onsuccess?.({ target: req }));
      return req;
    },
  };
}

const DB_NAME = 'test-wedding-idb';
const STORE = 'guests';
const SCHEMA = {
  guests: {
    keyPath: 'id',
    indexes: [{ name: 'byPhone', keyPath: 'phone', unique: false }],
  },
};

/** @type {ReturnType<typeof openDB> extends Promise<infer T> ? T : never} */
let db;

beforeEach(async () => {
  vi.stubGlobal('indexedDB', buildFakeIdb());
  db = await openDB(DB_NAME, 1, SCHEMA);
});


describe('openDB', () => {
  it('opens a database and returns an IDBDatabase', async () => {
    expect(db).toBeDefined();
    expect(typeof db.transaction).toBe('function');
  });

  it('creates the declared object store', () => {
    expect(db.objectStoreNames.contains(STORE)).toBe(true);
  });

  it('creates the declared index', async () => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    expect(store.indexNames.contains('byPhone')).toBe(true);
  });
});

describe('idbSet / idbGet', () => {
  it('stores and retrieves a record', async () => {
    await idbSet(db, STORE, { id: '1', name: 'Alice' });
    const result = await idbGet(db, STORE, '1');
    expect(result).toEqual({ id: '1', name: 'Alice' });
  });

  it('returns undefined for missing key', async () => {
    const result = await idbGet(db, STORE, 'nonexistent');
    expect(result).toBeUndefined();
  });

  it('overwrites an existing record', async () => {
    await idbSet(db, STORE, { id: '2', name: 'Bob' });
    await idbSet(db, STORE, { id: '2', name: 'Bobby' });
    const result = await idbGet(db, STORE, '2');
    expect(result.name).toBe('Bobby');
  });
});

describe('idbAdd', () => {
  it('adds a new record', async () => {
    const key = await idbAdd(db, STORE, { id: 'a1', name: 'Carol' });
    expect(key).toBe('a1');
  });

  it('rejects when key already exists', async () => {
    await idbSet(db, STORE, { id: 'dup', name: 'Dup' });
    await expect(idbAdd(db, STORE, { id: 'dup', name: 'Dup2' })).rejects.toThrow();
  });
});

describe('idbDel', () => {
  it('deletes a record', async () => {
    await idbSet(db, STORE, { id: '3', name: 'Dave' });
    await idbDel(db, STORE, '3');
    expect(await idbGet(db, STORE, '3')).toBeUndefined();
  });

  it('does not throw when deleting a non-existent key', async () => {
    await expect(idbDel(db, STORE, 'ghost')).resolves.toBeUndefined();
  });
});

describe('idbGetAll', () => {
  it('returns all records', async () => {
    await idbSet(db, STORE, { id: 'g1', name: 'Eve' });
    await idbSet(db, STORE, { id: 'g2', name: 'Frank' });
    const all = await idbGetAll(db, STORE);
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array for empty store', async () => {
    expect(await idbGetAll(db, STORE)).toEqual([]);
  });
});

describe('idbGetAllKeys', () => {
  it('returns all keys', async () => {
    await idbSet(db, STORE, { id: 'k1', name: 'Gina' });
    await idbSet(db, STORE, { id: 'k2', name: 'Hank' });
    const keys = await idbGetAllKeys(db, STORE);
    expect(keys).toContain('k1');
    expect(keys).toContain('k2');
  });
});

describe('idbCount', () => {
  it('returns the number of records', async () => {
    await idbSet(db, STORE, { id: 'c1', name: 'Iris' });
    await idbSet(db, STORE, { id: 'c2', name: 'Jack' });
    expect(await idbCount(db, STORE)).toBeGreaterThanOrEqual(2);
  });

  it('returns 0 for empty store', async () => {
    expect(await idbCount(db, STORE)).toBe(0);
  });
});

describe('idbClear', () => {
  it('removes all records', async () => {
    await idbSet(db, STORE, { id: 'x1', name: 'Karl' });
    await idbClear(db, STORE);
    expect(await idbCount(db, STORE)).toBe(0);
  });
});

describe('idbGetByIndex', () => {
  it('retrieves records matching an index value', async () => {
    await idbSet(db, STORE, { id: 'p1', name: 'Lena', phone: '972501000001' });
    await idbSet(db, STORE, { id: 'p2', name: 'Mark', phone: '972501000001' });
    const results = await idbGetByIndex(db, STORE, 'byPhone', '972501000001');
    expect(results.length).toBe(2);
  });

  it('returns empty array for no matches', async () => {
    const results = await idbGetByIndex(db, STORE, 'byPhone', '0000000000');
    expect(results).toEqual([]);
  });
});

describe('idbSetMany', () => {
  it('stores multiple records atomically', async () => {
    // store uses keyPath so pass value as-is but we use explicit-key store variant
    const SIMPLE_STORE = 'kv';
    const schemaKv = { kv: { autoIncrement: false } };
    const kvDb = await openDB(`${DB_NAME}-kv`, 1, schemaKv);
    await idbSetMany(kvDb, SIMPLE_STORE, [
      { key: 'alpha', value: 1 },
      { key: 'beta', value: 2 },
    ]);
    expect(await idbGet(kvDb, SIMPLE_STORE, 'alpha')).toBe(1);
    expect(await idbGet(kvDb, SIMPLE_STORE, 'beta')).toBe(2);
    closeDB(kvDb);
    await deleteDB(`${DB_NAME}-kv`);
  });
});

describe('idbDelMany', () => {
  it('deletes multiple keys atomically', async () => {
    const SIMPLE_STORE = 'kv';
    const schemaKv = { kv: { autoIncrement: false } };
    const kvDb = await openDB(`${DB_NAME}-kv2`, 1, schemaKv);
    await idbSetMany(kvDb, SIMPLE_STORE, [
      { key: 'm1', value: 'a' },
      { key: 'm2', value: 'b' },
      { key: 'm3', value: 'c' },
    ]);
    await idbDelMany(kvDb, SIMPLE_STORE, ['m1', 'm3']);
    expect(await idbGet(kvDb, SIMPLE_STORE, 'm1')).toBeUndefined();
    expect(await idbGet(kvDb, SIMPLE_STORE, 'm2')).toBe('b');
    expect(await idbGet(kvDb, SIMPLE_STORE, 'm3')).toBeUndefined();
    closeDB(kvDb);
    await deleteDB(`${DB_NAME}-kv2`);
  });
});
