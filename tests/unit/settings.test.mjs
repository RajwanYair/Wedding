/**
 * tests/unit/settings.test.mjs — Unit tests for settings section helpers
 * Covers: getDataCompletenessScore · getStoreSizes
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  getDataCompletenessScore,
  getStoreSizes,
} from "../../src/sections/settings.js";

function seedStore() {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    timeline: { value: [] },
    weddingInfo: { value: {} },
    gallery: { value: [] },
  });
}

function makeGuest(overrides = {}) {
  return {
    id: `g-${Math.random().toString(36).slice(2)}`,
    firstName: "Test",
    lastName: "User",
    phone: "972501234567",
    status: "confirmed",
    meal: "regular",
    tableId: "t1",
    ...overrides,
  };
}

// ── getDataCompletenessScore ──────────────────────────────────────────────
describe("getDataCompletenessScore", () => {
  beforeEach(() => seedStore());

  it("returns zeros when no guests", () => {
    const s = getDataCompletenessScore();
    expect(s.total).toBe(0);
    expect(s.rate).toBe(0);
  });

  it("returns 100% when all fields present", () => {
    storeSet("guests", [makeGuest()]);
    const s = getDataCompletenessScore();
    expect(s.complete).toBe(1);
    expect(s.rate).toBe(100);
  });

  it("detects missing fields", () => {
    storeSet("guests", [
      makeGuest({ phone: "", meal: "" }),
      makeGuest(),
    ]);
    const s = getDataCompletenessScore();
    expect(s.complete).toBe(1);
    expect(s.rate).toBe(50);
    expect(s.missingFields.phone).toBe(1);
    expect(s.missingFields.meal).toBe(1);
  });
});

// ── getStoreSizes ─────────────────────────────────────────────────────────
describe("getStoreSizes", () => {
  beforeEach(() => seedStore());

  it("returns sizes for all store keys", () => {
    const sizes = getStoreSizes();
    expect(sizes.length).toBeGreaterThanOrEqual(7);
    expect(sizes[0]).toHaveProperty("key");
    expect(sizes[0]).toHaveProperty("bytes");
  });

  it("returns larger size for populated stores", () => {
    storeSet("guests", [makeGuest(), makeGuest()]);
    const sizes = getStoreSizes();
    const guestSize = sizes.find((s) => s.key === "guests");
    expect(guestSize.bytes).toBeGreaterThan(0);
  });

  it("sorts by largest first", () => {
    storeSet("guests", [makeGuest(), makeGuest(), makeGuest()]);
    const sizes = getStoreSizes();
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i - 1].bytes).toBeGreaterThanOrEqual(sizes[i].bytes);
    }
  });
});
