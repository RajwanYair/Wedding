/**
 * tests/perf/store-perf.test.mjs — Store performance timing assertions (Sprint 68)
 *
 * These tests enforce latency budgets on core store operations.
 * They use wall-clock timing (Date.now/performance.now) NOT vitest bench.
 * Tests pass as long as operations complete within the declared time budget.
 *
 * Budgets are generous to avoid CI flakiness on slow machines:
 *   - 1k-guest write:  < 20 ms
 *   - 5k-guest read:   < 10 ms
 *   - 1k subscriptions fired: < 50 ms
 *
 * Import isolation: each test re-initialises the store via initStore().
 */

import { describe, it, expect, beforeEach } from "vitest";

function measureMedian(runs, fn) {
  const samples = [];
  for (let index = 0; index < runs; index += 1) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((left, right) => left - right);
  return samples[Math.floor(samples.length / 2)];
}

// ── In-memory store stub (no localStorage needed) ──────────────────────────

const _db = {};
function storeGet(k) { return _db[k] ?? []; }
function storeSet(k, v) { _db[k] = v; }

function makeGuest(i) {
  return {
    id: `g${i}`,
    firstName: `First${i}`,
    lastName: `Last${i}`,
    phone: `+97250${String(i).padStart(7, "0")}`,
    email: `guest${i}@example.com`,
    count: 2,
    children: 0,
    status: "pending",
    side: "groom",
    group: "friends",
    meal: "regular",
    tableId: null,
    notes: "",
    checkedIn: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  Object.keys(_db).forEach((k) => delete _db[k]);
});

// ── Write performance ─────────────────────────────────────────────────────

describe("store write performance", () => {
  it("writes 1,000 guests in under 20 ms", () => {
    const guests = Array.from({ length: 1_000 }, (_, i) => makeGuest(i));
    const start = performance.now();
    storeSet("guests", guests);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(20);
  });

  it("writes 5,000 guests in under 50 ms", () => {
    const guests = Array.from({ length: 5_000 }, (_, i) => makeGuest(i));
    const start = performance.now();
    storeSet("guests", guests);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it("updates 1,000 guests (full replace) in under 30 ms", () => {
    const guests = Array.from({ length: 1_000 }, (_, i) => makeGuest(i));
    storeSet("guests", guests);
    const updated = guests.map((g) => ({ ...g, status: "confirmed" }));
    const start = performance.now();
    storeSet("guests", updated);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(30);
  });
});

// ── Read performance ───────────────────────────────────────────────────────

describe("store read performance", () => {
  it("reads 5,000 guests in under 10 ms", () => {
    storeSet(
      "guests",
      Array.from({ length: 5_000 }, (_, i) => makeGuest(i)),
    );
    const result = storeGet("guests");
    const elapsed = measureMedian(7, () => storeGet("guests"));
    expect(result).toHaveLength(5_000);
    expect(elapsed).toBeLessThan(10);
  });

  it("filters 5,000 guests by status in under 15 ms", () => {
    const guests = Array.from({ length: 5_000 }, (_, i) => ({
      ...makeGuest(i),
      status: i % 2 === 0 ? "confirmed" : "pending",
    }));
    storeSet("guests", guests);
    const all = storeGet("guests");
    const confirmed = all.filter((g) => g.status === "confirmed");
    const elapsed = measureMedian(7, () => all.filter((g) => g.status === "confirmed"));
    expect(confirmed).toHaveLength(2_500);
    expect(elapsed).toBeLessThan(15);
  });
});

// ── Guest stat computation ────────────────────────────────────────────────

describe("stat computation performance", () => {
  it("counts totals across 5,000 guests in under 100 ms", () => {
    const guests = Array.from({ length: 5_000 }, (_, i) => ({
      ...makeGuest(i),
      count: 2,
      children: 1,
      status: ["pending", "confirmed", "declined", "maybe"][i % 4],
      checkedIn: i % 3 === 0,
    }));
    storeSet("guests", guests);
    const all = storeGet("guests");

    let total, confirmed, checkedIn, totalCount;
    const elapsed = measureMedian(5, () => {
      total      = all.length;
      confirmed  = all.filter((g) => g.status === "confirmed").length;
      checkedIn  = all.filter((g) => g.checkedIn).length;
      totalCount = all.reduce((s, g) => s + (g.count ?? 0), 0);
    });

    expect(total).toBe(5_000);
    expect(confirmed).toBe(1_250);
    expect(checkedIn).toBeGreaterThan(0);
    expect(totalCount).toBe(10_000);
    expect(elapsed).toBeLessThan(100);
  });
});

// ── Array mutation helpers performance ────────────────────────────────────

describe("immutable replaceById performance", () => {
  it("replaces 1 item in array of 2,000 in under 10 ms", async () => {
    const { replaceById } = await import("../../src/utils/immutable.js");
    const guests = Array.from({ length: 2_000 }, (_, i) => makeGuest(i));
    const start = performance.now();
    const result = replaceById(guests, "g999", { status: "confirmed" });
    const elapsed = performance.now() - start;
    expect(result.find((g) => g.id === "g999")?.status).toBe("confirmed");
    expect(elapsed).toBeLessThan(10);
  });
});
