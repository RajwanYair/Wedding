/**
 * tests/unit/store-subscriptions.test.mjs — Store subscription scope & leak tests (Phase 2)
 *
 * Validates that storeSubscribeScoped and cleanupScope prevent subscriber
 * leaks that would otherwise accumulate on repeated section mount/unmount cycles.
 *
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/state.js", () => ({
  getActiveEventId: () => "default",
}));

const {
  storeSet,
  storeSubscribe,
  storeSubscribeScoped,
  cleanupScope,
  getSubscriberStats,
  getSubscriptionCount,
  reinitStore,
} = await import("../../src/core/store.js");

function seed() {
  reinitStore({
    guests: { value: [], storageKey: "guests" },
    tables: { value: [], storageKey: "tables" },
  });
}

// ── getSubscriptionCount ───────────────────────────────────────────────────

describe("getSubscriptionCount", () => {
  beforeEach(seed);

  it("returns 0 when no scoped subscriptions exist", () => {
    expect(getSubscriptionCount()).toBe(0);
  });

  it("returns 0 for unknown scope", () => {
    expect(getSubscriptionCount("nonexistent")).toBe(0);
  });

  it("counts subscriptions under a scope", () => {
    storeSubscribeScoped("guests", vi.fn(), "guests-section");
    storeSubscribeScoped("guests", vi.fn(), "guests-section");
    expect(getSubscriptionCount("guests-section")).toBe(2);
  });

  it("returns total across all scopes when no scope argument", () => {
    // Start from a known baseline within this test
    cleanupScope("scope-a");
    cleanupScope("scope-b");
    const before = getSubscriptionCount();
    storeSubscribeScoped("guests", vi.fn(), "scope-a");
    storeSubscribeScoped("tables", vi.fn(), "scope-a");
    storeSubscribeScoped("guests", vi.fn(), "scope-b");
    expect(getSubscriptionCount()).toBe(before + 3);
    cleanupScope("scope-a");
    cleanupScope("scope-b");
  });
});

// ── Scope lifecycle ────────────────────────────────────────────────────────

describe("storeSubscribeScoped — no leak on cleanup", () => {
  beforeEach(seed);

  it("does not fire after cleanupScope", async () => {
    const spy = vi.fn();
    storeSubscribeScoped("guests", spy, "test-section");
    cleanupScope("test-section");
    storeSet("guests", [{ id: "g1" }]);
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });

  it("subscription count drops to 0 after cleanup", () => {
    storeSubscribeScoped("guests", vi.fn(), "section-x");
    storeSubscribeScoped("tables", vi.fn(), "section-x");
    expect(getSubscriptionCount("section-x")).toBe(2);
    cleanupScope("section-x");
    expect(getSubscriptionCount("section-x")).toBe(0);
  });

  it("getSubscriptionCount total decreases after cleanup", () => {
    storeSubscribeScoped("guests", vi.fn(), "s1");
    storeSubscribeScoped("guests", vi.fn(), "s2");
    expect(getSubscriptionCount()).toBeGreaterThanOrEqual(2);
    cleanupScope("s1");
    expect(getSubscriptionCount("s1")).toBe(0);
    expect(getSubscriptionCount("s2")).toBe(1);
  });

  it("cleanupScope is idempotent", () => {
    storeSubscribeScoped("guests", vi.fn(), "idem");
    cleanupScope("idem");
    expect(() => cleanupScope("idem")).not.toThrow();
    expect(getSubscriptionCount("idem")).toBe(0);
  });
});

// ── Simulated mount/unmount cycle ─────────────────────────────────────────

describe("No subscriber leak across N mount/unmount cycles", () => {
  beforeEach(seed);

  it("subscriber count stays stable across 10 mount/unmount cycles", async () => {
    const baseStats = getSubscriberStats();
    const baseTotal = baseStats.total;

    for (let i = 0; i < 10; i++) {
      storeSubscribeScoped("guests", vi.fn(), "section-cycle");
      storeSubscribeScoped("tables", vi.fn(), "section-cycle");
      cleanupScope("section-cycle");
    }

    const finalStats = getSubscriberStats();
    expect(finalStats.total).toBe(baseTotal);
  });

  it("manual unsub returned from storeSubscribeScoped also works", async () => {
    const spy = vi.fn();
    const unsub = storeSubscribeScoped("guests", spy, "manual-scope");
    // Manually call unsub instead of cleanupScope
    unsub();
    storeSet("guests", [{ id: "g1" }]);
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ── Unscoped subscriptions (storeSubscribe) ────────────────────────────────

describe("storeSubscribe returns working unsub function", () => {
  beforeEach(seed);

  it("fires before unsub", async () => {
    const spy = vi.fn();
    storeSubscribe("guests", spy);
    storeSet("guests", [{ id: "g1" }]);
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalled();
  });

  it("does not fire after unsub", async () => {
    const spy = vi.fn();
    const unsub = storeSubscribe("guests", spy);
    unsub();
    storeSet("guests", [{ id: "g1" }]);
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).not.toHaveBeenCalled();
  });
});

// ── getSubscriberStats ─────────────────────────────────────────────────────

describe("getSubscriberStats", () => {
  beforeEach(seed);

  it("returns per-key counts and total", () => {
    storeSubscribe("guests", vi.fn());
    storeSubscribe("guests", vi.fn());
    storeSubscribe("tables", vi.fn());
    const stats = getSubscriberStats();
    expect(stats.perKey["guests"]).toBeGreaterThanOrEqual(2);
    expect(stats.perKey["tables"]).toBeGreaterThanOrEqual(1);
    expect(stats.total).toBeGreaterThanOrEqual(3);
  });

  it("includes scopes count", () => {
    storeSubscribeScoped("guests", vi.fn(), "scope-stat");
    const stats = getSubscriberStats();
    expect(stats.scopes).toBeGreaterThanOrEqual(1);
    cleanupScope("scope-stat");
  });
});
