/**
 * tests/unit/idb-queue.test.mjs — Unit tests for src/utils/idb-queue.js
 * Covers: idbQueueRead · idbQueueWrite — fallback + mock-IDB happy paths
 *
 * Run: npm test
 */

// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// ── Mock IDB factory ──────────────────────────────────────────────────────
function _createMockIDB() {
  /** @type {Map<string, unknown>} */
  const _storeData = new Map();

  const _db = {
    createObjectStore: vi.fn(),
    transaction(_storeNames, _mode) {
      const tx = {
        oncomplete: /** @type {(() => void) | null} */ (null),
        onerror: /** @type {(() => void) | null} */ (null),
        objectStore() {
          return {
            get(key) {
              const req = { result: _storeData.get(key), onsuccess: null, onerror: null };
              queueMicrotask(() => { if (req.onsuccess) req.onsuccess(); });
              return req;
            },
            put(val, key) {
              _storeData.set(key, val);
              queueMicrotask(() => { if (tx.oncomplete) tx.oncomplete(); });
              return {};
            },
            clear() {
              _storeData.clear();
              queueMicrotask(() => { if (tx.oncomplete) tx.oncomplete(); });
              return {};
            },
          };
        },
      };
      return tx;
    },
  };

  const mockIDB = {
    open(_name, _version) {
      const req = { result: _db, onsuccess: null, onupgradeneeded: null, onerror: null };
      queueMicrotask(() => {
        if (req.onupgradeneeded) req.onupgradeneeded();
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
  };

  return { mockIDB, _storeData };
}

// ── Fallback tests (happy-dom has no indexedDB) ────────────────────────────

describe("idb-queue — fallback when indexedDB unavailable", () => {
  let idbQueueRead, idbQueueWrite;

  beforeAll(async () => {
    // Ensure indexedDB is NOT defined (happy-dom default)
    vi.resetModules();
    ({ idbQueueRead, idbQueueWrite } = await import("../../src/utils/idb-queue.js"));
  });

  afterAll(() => {
    vi.resetModules();
  });

  it("idbQueueRead returns [] when indexedDB is unavailable", async () => {
    const result = await idbQueueRead();
    expect(result).toEqual([]);
  });

  it("idbQueueWrite resolves silently when indexedDB is unavailable", async () => {
    await expect(idbQueueWrite([{ type: "test" }])).resolves.toBeUndefined();
  });

  it("idbQueueRead returns [] on repeated calls (no crash)", async () => {
    const r1 = await idbQueueRead();
    const r2 = await idbQueueRead();
    expect(r1).toEqual([]);
    expect(r2).toEqual([]);
  });
});

// ── Happy-path tests (with mock IDB) ─────────────────────────────────────

describe("idb-queue — happy path with mock IDB", () => {
  let idbQueueRead, idbQueueWrite;
  let _storeData;

  beforeAll(async () => {
    vi.resetModules();
    const { mockIDB, _storeData: sd } = _createMockIDB();
    _storeData = sd;
    vi.stubGlobal("indexedDB", mockIDB);
    // Import fresh module so it picks up the stubbed indexedDB
    ({ idbQueueRead, idbQueueWrite } = await import("../../src/utils/idb-queue.js?v=mock"));
  });

  afterAll(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("idbQueueRead returns [] when store is empty", async () => {
    const result = await idbQueueRead();
    expect(result).toEqual([]);
  });

  it("idbQueueWrite stores items", async () => {
    const items = [{ type: "sync_guests", payload: { id: "1" }, addedAt: "2025-01-01", retries: 0 }];
    await idbQueueWrite(items);
    expect(_storeData.has("queue")).toBe(true);
  });

  it("idbQueueRead reads back written items", async () => {
    const items = [{ type: "sync_tables", payload: {}, addedAt: "2025-01-02", retries: 1 }];
    await idbQueueWrite(items);
    const result = await idbQueueRead();
    expect(result).toEqual(items);
  });

  it("idbQueueWrite with empty array writes empty array", async () => {
    await idbQueueWrite([]);
    const result = await idbQueueRead();
    expect(result).toEqual([]);
  });

  it("idbQueueWrite overwrites previous items", async () => {
    await idbQueueWrite([{ type: "a" }]);
    await idbQueueWrite([{ type: "b" }, { type: "c" }]);
    const result = await idbQueueRead();
    expect(result).toEqual([{ type: "b" }, { type: "c" }]);
  });

  it("idbQueueRead returns [] if store has non-array value", async () => {
    _storeData.set("queue", "not-an-array");
    const result = await idbQueueRead();
    expect(result).toEqual([]);
  });
});
