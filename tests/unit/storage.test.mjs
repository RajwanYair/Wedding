/**
 * tests/unit/storage.test.mjs — Unit tests for src/core/storage.js (F2.3)
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  initStorage,
  getAdapterType,
  storageGet,
  storageSet,
  storageRemove,
  storageClear,
  auditLocalStorageRemnants,
  cleanupLocalStorageRemnants,
  readBrowserStorage,
  writeBrowserStorage,
  removeBrowserStorage,
  readBrowserStorageJson,
  writeBrowserStorageJson,
  readSessionStorage,
  writeSessionStorage,
  migrateFromLocalStorage,
} from "../../src/core/storage.js";

describe("storage abstraction (F2.3)", () => {
  beforeEach(async () => {
    await storageClear();
  });

  it("initStorage returns a valid adapter type", async () => {
    const type = await initStorage();
    expect(["indexeddb", "localstorage", "memory"]).toContain(type);
  });

  it("getAdapterType matches initStorage result", async () => {
    const type = await initStorage();
    expect(getAdapterType()).toBe(type);
  });

  it("storageSet + storageGet round trip", async () => {
    await initStorage();
    await storageSet("test_key", "hello");
    const val = await storageGet("test_key");
    expect(val).toBe("hello");
  });

  it("storageGet returns null for missing key", async () => {
    await initStorage();
    const val = await storageGet("nonexistent_key_42");
    expect(val).toBeNull();
  });

  it("storageRemove deletes a key", async () => {
    await initStorage();
    await storageSet("to_delete", "value");
    await storageRemove("to_delete");
    const val = await storageGet("to_delete");
    expect(val).toBeNull();
  });

  it("storageClear removes all keys", async () => {
    await initStorage();
    await storageSet("k1", "v1");
    await storageSet("k2", "v2");
    await storageClear();
    expect(await storageGet("k1")).toBeNull();
    expect(await storageGet("k2")).toBeNull();
  });

  it("re-calling initStorage is idempotent", async () => {
    const t1 = await initStorage();
    const t2 = await initStorage();
    expect(t1).toBe(t2);
  });

  describe("auditLocalStorageRemnants / cleanupLocalStorageRemnants (S88)", () => {
    it("returns empty array when adapter is not indexeddb", async () => {
      await initStorage();
      if (getAdapterType() !== "indexeddb") {
        expect(await auditLocalStorageRemnants("wedding_v1_")).toEqual([]);
      }
    });

    it("detects orphans when key exists in both localStorage and IDB", async () => {
      await initStorage();
      if (getAdapterType() !== "indexeddb") return;
      try {
        localStorage.setItem("wedding_v1_audit_probe", "x");
      } catch {
        return;
      }
      await storageSet("wedding_v1_audit_probe", "x");
      const orphans = await auditLocalStorageRemnants("wedding_v1_");
      expect(orphans).toContain("wedding_v1_audit_probe");
      const removed = await cleanupLocalStorageRemnants("wedding_v1_");
      expect(removed).toBeGreaterThan(0);
      expect(localStorage.getItem("wedding_v1_audit_probe")).toBeNull();
    });

    it("ignores keys outside the prefix", async () => {
      await initStorage();
      if (getAdapterType() !== "indexeddb") return;
      try {
        localStorage.setItem("other_app_key", "y");
      } catch {
        return;
      }
      const orphans = await auditLocalStorageRemnants("wedding_v1_");
      expect(orphans).not.toContain("other_app_key");
      try {
        localStorage.removeItem("other_app_key");
      } catch {
        /* ignore */
      }
    });
  });
});

// ── Browser storage helpers (S336) ────────────────────────────────────────

describe("readBrowserStorage / writeBrowserStorage / removeBrowserStorage", () => {
  const KEY = "test_browser_storage_key";

  beforeEach(() => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  });

  it("writeBrowserStorage stores a string value", () => {
    writeBrowserStorage(KEY, "hello");
    expect(localStorage.getItem(KEY)).toBe("hello");
  });

  it("readBrowserStorage retrieves a stored value", () => {
    localStorage.setItem(KEY, "world");
    expect(readBrowserStorage(KEY)).toBe("world");
  });

  it("readBrowserStorage returns fallback for missing key", () => {
    expect(readBrowserStorage("__nonexistent__", "default")).toBe("default");
  });

  it("readBrowserStorage returns null by default for missing key", () => {
    expect(readBrowserStorage("__nonexistent__")).toBeNull();
  });

  it("removeBrowserStorage deletes a key", () => {
    localStorage.setItem(KEY, "to_delete");
    removeBrowserStorage(KEY);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("removeBrowserStorage is a no-op for missing key", () => {
    expect(() => removeBrowserStorage("__nonexistent__")).not.toThrow();
  });
});

describe("readBrowserStorageJson / writeBrowserStorageJson", () => {
  const KEY = "test_json_storage_key";

  beforeEach(() => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  });

  it("writeBrowserStorageJson persists an object", () => {
    writeBrowserStorageJson(KEY, { a: 1, b: "two" });
    const raw = localStorage.getItem(KEY);
    expect(JSON.parse(raw)).toEqual({ a: 1, b: "two" });
  });

  it("readBrowserStorageJson parses a stored object", () => {
    localStorage.setItem(KEY, JSON.stringify({ x: 42 }));
    expect(readBrowserStorageJson(KEY, null)).toEqual({ x: 42 });
  });

  it("readBrowserStorageJson returns fallback for missing key", () => {
    expect(readBrowserStorageJson("__missing__", [])).toEqual([]);
  });

  it("readBrowserStorageJson returns fallback for invalid JSON", () => {
    localStorage.setItem(KEY, "not-valid-json{");
    expect(readBrowserStorageJson(KEY, "fallback")).toBe("fallback");
  });

  it("writeBrowserStorageJson handles arrays", () => {
    writeBrowserStorageJson(KEY, [1, 2, 3]);
    expect(readBrowserStorageJson(KEY, [])).toEqual([1, 2, 3]);
  });
});

describe("readSessionStorage / writeSessionStorage", () => {
  const KEY = "test_session_storage_key";

  beforeEach(() => {
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  });

  it("writeSessionStorage stores a string value", () => {
    writeSessionStorage(KEY, "session_value");
    expect(sessionStorage.getItem(KEY)).toBe("session_value");
  });

  it("readSessionStorage retrieves a stored value", () => {
    sessionStorage.setItem(KEY, "retrieved");
    expect(readSessionStorage(KEY)).toBe("retrieved");
  });

  it("readSessionStorage returns fallback for missing key", () => {
    expect(readSessionStorage("__nonexistent__", "fb")).toBe("fb");
  });

  it("readSessionStorage returns null by default for missing key", () => {
    expect(readSessionStorage("__nonexistent__")).toBeNull();
  });

  it("writeSessionStorage overwrites an existing value", () => {
    writeSessionStorage(KEY, "first");
    writeSessionStorage(KEY, "second");
    expect(readSessionStorage(KEY)).toBe("second");
  });
});

describe("migrateFromLocalStorage", () => {
  it("returns 0 when adapter is not indexeddb", async () => {
    await initStorage();
    if (getAdapterType() !== "indexeddb") {
      const count = await migrateFromLocalStorage("wedding_v1_");
      expect(count).toBe(0);
    }
  });

  it("migrates prefixed keys to IDB", async () => {
    await initStorage();
    if (getAdapterType() !== "indexeddb") return;
    try {
      localStorage.setItem("wedding_v1_migrate_probe", "migval");
    } catch {
      return;
    }
    const count = await migrateFromLocalStorage("wedding_v1_");
    expect(count).toBeGreaterThanOrEqual(1);
    const val = await storageGet("wedding_v1_migrate_probe");
    expect(val).toBe("migval");
    try { localStorage.removeItem("wedding_v1_migrate_probe"); } catch { /* ignore */ }
  });
});
