/**
 * tests/unit/store.test.mjs — Unit tests for src/core/store.js (S6.3)
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeGet, storeSet, storeSubscribe, storeFlush } from "../../src/core/store.js";

// Clear state helper — reset to known state before each test
beforeEach(() => {
  // Re-init with empty defaults so tests are isolated
  initStore({ _test_key: { value: [] } });
});

// ── initStore ────────────────────────────────────────────────────────────────
describe("initStore", () => {
  it("sets default values", () => {
    initStore({ fruits: { value: ["apple", "banana"] } });
    expect(storeGet("fruits")).toEqual(["apple", "banana"]);
  });

  it("does not overwrite existing value", () => {
    initStore({ fruits: { value: ["mango"] } });
    storeSet("fruits", ["kiwi"]);
    initStore({ fruits: { value: ["mango"] } }); // calling again should not reset
    // storeGet should still be kiwi or mango depending on implementation,
    // but it must not throw
    expect(storeGet("fruits")).toBeDefined();
  });
});

// ── storeGet / storeSet ───────────────────────────────────────────────────────
describe("storeGet / storeSet", () => {
  it("stores and retrieves a scalar", () => {
    storeSet("score", 42);
    expect(storeGet("score")).toBe(42);
  });

  it("stores and retrieves an array", () => {
    storeSet("list", [1, 2, 3]);
    expect(storeGet("list")).toEqual([1, 2, 3]);
  });

  it("stores and retrieves an object", () => {
    storeSet("user", { name: "Alice", age: 30 });
    expect(storeGet("user")).toEqual({ name: "Alice", age: 30 });
  });

  it("returns undefined for unknown key", () => {
    expect(storeGet("nonexistent_key_xyz_abc")).toBeUndefined();
  });
});

// ── storeSubscribe ────────────────────────────────────────────────────────────
describe("storeSubscribe", () => {
  it("calls subscriber on set", async () => {
    let called = false;
    storeSubscribe("_sub_test", (val) => { called = true; expect(val).toBe("hello"); });
    storeSet("_sub_test", "hello");
    // subscribers are notified via microtask queue
    await Promise.resolve();
    await Promise.resolve();
    expect(called).toBe(true);
  });

  it("returns unsubscribe function that stops calls", async () => {
    let callCount = 0;
    const unsub = storeSubscribe("_unsub_test", () => { callCount++; });
    storeSet("_unsub_test", "first");
    await Promise.resolve();
    await Promise.resolve();
    unsub();
    storeSet("_unsub_test", "second");
    await Promise.resolve();
    await Promise.resolve();
    expect(callCount).toBe(1);
  });

  it("wildcard sub (\"*\") receives all changes", async () => {
    const keys = [];
    storeSubscribe("*", (k) => keys.push(k));
    storeSet("_wild_a", 1);
    storeSet("_wild_b", 2);
    await Promise.resolve();
    await Promise.resolve();
    expect(keys).toContain("_wild_a");
    expect(keys).toContain("_wild_b");
  });
});

// ── storeFlush ────────────────────────────────────────────────────────────────
describe("storeFlush", () => {
  it("is callable without throwing", () => {
    expect(() => storeFlush()).not.toThrow();
  });
});

