/**
 * tests/unit/storage-helpers.test.mjs — Sprint 186
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Provide an in-memory localStorage mock so tests run in any Vitest environment.
const _store = new Map();
const mockLocalStorage = {
  getItem: (k) => (_store.has(k) ? _store.get(k) : null),
  setItem: (k, v) => { _store.set(k, v); },
  removeItem: (k) => { _store.delete(k); },
  get length() { return _store.size; },
  key: (i) => [..._store.keys()][i] ?? null,
};
vi.stubGlobal("localStorage", mockLocalStorage);

import { storageSet, storageGet, storageRemove, storageHas, storageKeys, storageMerge } from "../../src/utils/storage-helpers.js";

const TEST_KEYS = ["name", "config", "bad", "x", "temp", "exists", "zero", "a", "b", "settings", "prefs"];

beforeEach(() => {
  _store.clear();
});

describe("storageSet / storageGet", () => {
  it("persists and retrieves a string", () => {
    storageSet("name", "Alice");
    expect(storageGet("name")).toBe("Alice");
  });

  it("persists and retrieves an object", () => {
    storageSet("config", { theme: "gold" });
    expect(storageGet("config")).toEqual({ theme: "gold" });
  });

  it("returns defaultValue when key is absent", () => {
    expect(storageGet("missing", "fallback")).toBe("fallback");
    expect(storageGet("missing2")).toBeUndefined();
  });

  it("returns defaultValue on corrupt JSON", () => {
    _store.set("wedding_v1_bad", "{{NOT JSON}}");
    expect(storageGet("bad", null)).toBeNull();
  });

  it("uses wedding_v1_ prefix (verifiable via raw store)", () => {
    storageSet("x", 1);
    expect(_store.get("wedding_v1_x")).toBe("1");
  });
});

describe("storageRemove", () => {
  it("removes an existing key", () => {
    storageSet("temp", "value");
    storageRemove("temp");
    expect(storageGet("temp")).toBeUndefined();
  });

  it("does not throw for non-existent key", () => {
    expect(() => storageRemove("nonexistent")).not.toThrow();
  });
});

describe("storageHas", () => {
  it("returns true when key exists", () => {
    storageSet("exists", true);
    expect(storageHas("exists")).toBe(true);
  });

  it("returns false when key is absent", () => {
    expect(storageHas("absent")).toBe(false);
  });

  it("returns true for key with falsy value", () => {
    storageSet("zero", 0);
    expect(storageHas("zero")).toBe(true);
  });
});

describe("storageKeys", () => {
  it("lists keys set via storageSet", () => {
    storageSet("a", 1);
    storageSet("b", 2);
    _store.set("other_key", "x"); // non-prefixed
    const keys = storageKeys();
    expect(keys).toContain("a");
    expect(keys).toContain("b");
    expect(keys).not.toContain("other_key");
  });

  it("returns empty array when no wedding keys exist", () => {
    expect(storageKeys()).toEqual([]);
  });
});

describe("storageMerge", () => {
  it("creates initial value from patch when key is absent", () => {
    const result = storageMerge("settings", { theme: "gold" });
    expect(result).toEqual({ theme: "gold" });
  });

  it("merges patch into existing value", () => {
    storageSet("settings", { theme: "gold", lang: "he" });
    const result = storageMerge("settings", { theme: "rosegold" });
    expect(result).toEqual({ theme: "rosegold", lang: "he" });
  });

  it("persists the merged value", () => {
    storageMerge("prefs", { a: 1 });
    storageMerge("prefs", { b: 2 });
    expect(storageGet("prefs")).toEqual({ a: 1, b: 2 });
  });
});
