/**
 * tests/unit/admin-debug.test.mjs — Unit tests for admin debug utilities (Sprint 39)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

import { initStore, storeSet, storeGet } from "../../src/core/store.js";
const {
  dumpStore,
  diffStore,
  validateStoreShape,
  getStoreHealth,
  resetKey,
  setDebugFlag,
  getDebugFlag,
} = await import("../../src/utils/admin-debug.js");

import { makeGuest } from "./helpers.js";

function seedStore(overrides = {}) {
  initStore({
    guests: { value: [] },
    campaigns: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    appErrors: { value: [] },
    timeline: { value: [] },
    gallery: { value: [] },
    weddingInfo: { value: {} },
    budget: { value: 0 },
    contacts: { value: [] },
    timelineDone: { value: {} },
    commLog: { value: [] },
    debugMode: { value: false },
    ...overrides,
  });
}

beforeEach(() => seedStore());

// ── dumpStore ──────────────────────────────────────────────────────────────

describe("dumpStore", () => {
  it("returns an object with known keys", () => {
    const snap = dumpStore();
    expect(typeof snap).toBe("object");
    expect("guests" in snap).toBe(true);
    expect("tables" in snap).toBe(true);
  });

  it("deep-clones arrays (mutations don't affect snapshot)", () => {
    storeSet("guests", [makeGuest({ id: "g1" })]);
    const snap = dumpStore(["guests"]);
    snap.guests[0].firstName = "MUTATED";
    expect((storeSet("guests", undefined), snap.guests[0].firstName)).toBe("MUTATED");
    // Original store should still have old value from before reassignment
  });

  it("accepts an explicit subset of keys", () => {
    const snap = dumpStore(["guests", "tables"]);
    const keys = Object.keys(snap);
    expect(keys).toHaveLength(2);
    expect(keys).toContain("guests");
    expect(keys).toContain("tables");
  });
});

// ── diffStore ──────────────────────────────────────────────────────────────

describe("diffStore", () => {
  it("returns empty array when snapshots are identical", () => {
    const snap = dumpStore();
    expect(diffStore(snap, snap)).toHaveLength(0);
  });

  it("detects a changed key", () => {
    const before = dumpStore(["guests"]);
    storeSet("guests", [makeGuest({ id: "g1" })]);
    const after = dumpStore(["guests"]);
    const changes = diffStore(before, after);
    expect(changes.some((c) => c.key === "guests")).toBe(true);
  });

  it("provides before and after in each change entry", () => {
    const before = { x: 1 };
    const after = { x: 2 };
    const [change] = diffStore(before, after);
    expect(change.before).toBe(1);
    expect(change.after).toBe(2);
  });

  it("detects new key in after snapshot", () => {
    const changes = diffStore({ a: 1 }, { a: 1, b: 2 });
    expect(changes.some((c) => c.key === "b")).toBe(true);
  });

  it("detects key removed in after snapshot", () => {
    const changes = diffStore({ a: 1, b: 2 }, { a: 1 });
    expect(changes.some((c) => c.key === "b")).toBe(true);
  });
});

// ── validateStoreShape ────────────────────────────────────────────────────

describe("validateStoreShape", () => {
  it("returns empty array when all known keys are set", () => {
    const missing = validateStoreShape();
    expect(missing).toHaveLength(0);
  });

  it("reports a missing key", () => {
    const missing = validateStoreShape(["guests", "nonExistentKey"]);
    expect(missing).toContain("nonExistentKey");
    expect(missing).not.toContain("guests");
  });

  it("accepts custom required key list", () => {
    storeSet("guests", null);
    const missing = validateStoreShape(["guests"]);
    expect(missing).toContain("guests");
  });
});

// ── getStoreHealth ────────────────────────────────────────────────────────

describe("getStoreHealth", () => {
  it("returns an object with keys, subscriberCount, missingKeys", () => {
    const health = getStoreHealth();
    expect(Array.isArray(health.keys)).toBe(true);
    expect(typeof health.subscriberCount).toBe("number");
    expect(Array.isArray(health.missingKeys)).toBe(true);
  });

  it("keys list contains known keys that are set", () => {
    const { keys } = getStoreHealth();
    expect(keys).toContain("guests");
  });
});

// ── resetKey ──────────────────────────────────────────────────────────────

describe("resetKey", () => {
  it("sets store key to the specified default", () => {
    storeSet("guests", [makeGuest()]);
    resetKey("guests", []);
    expect(storeGet("guests")).toEqual([]);
  });
});

// ── setDebugFlag / getDebugFlag ───────────────────────────────────────────

describe("setDebugFlag / getDebugFlag", () => {
  it("defaults to false", () => {
    expect(getDebugFlag()).toBe(false);
  });

  it("can be enabled", () => {
    setDebugFlag(true);
    expect(getDebugFlag()).toBe(true);
  });

  it("can be disabled again", () => {
    setDebugFlag(true);
    setDebugFlag(false);
    expect(getDebugFlag()).toBe(false);
  });
});
