/**
 * tests/unit/storage.test.mjs — Unit tests for src/core/storage.js (F2.3)
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
