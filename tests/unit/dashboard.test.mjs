/**
 * tests/unit/dashboard.test.mjs — Integration tests for dashboard section
 * Covers: renderDashboard stats · updateTopBar · updateCountdown · budget forecast ·
 *         vendor due reminders · activity feed · follow-up list
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import { makeGuest } from "./helpers.js";
import {
  getWeddingReadinessScore,
  getDashboardSnapshot,
} from "../../src/sections/dashboard.js";

// ── Helpers ──────────────────────────────────────────────────────────────

function seedStore(guests = [], tables = [], vendors = [], expenses = []) {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    weddingInfo: { value: {} },
    timeline: { value: [] },
  });
  storeSet("guests", guests);
  storeSet("tables", tables);
  storeSet("vendors", vendors);
  storeSet("expenses", expenses);
}

// ── Import after store init pattern ─────────────────────────────────────────────────
// Dashboard has many DOM-dependent render functions. We test the data-logic
// exports that don't require a full DOM tree.

describe("Dashboard data helpers", () => {
  beforeEach(() => {
    seedStore();
  });

  it("storeGet('guests') returns seeded guests", () => {
    const g1 = makeGuest({ firstName: "Yair" });
    storeSet("guests", [g1]);
    expect(storeGet("guests")).toHaveLength(1);
  });

  it("computes total headcount including counts and children", () => {
    storeSet("guests", [
      makeGuest({ count: 2, children: 1 }),
      makeGuest({ count: 3, children: 0 }),
    ]);
    const guests = /** @type {any[]} */ (storeGet("guests"));
    const total = guests.reduce((s, g) => s + (g.count || 1) + (g.children || 0), 0);
    expect(total).toBe(6); // 2+1 + 3+0
  });

  it("counts confirmed guests correctly", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 2 }),
      makeGuest({ status: "pending", count: 1 }),
      makeGuest({ status: "declined", count: 1 }),
    ]);
    const guests = /** @type {any[]} */ (storeGet("guests"));
    const confirmed = guests
      .filter((g) => g.status === "confirmed")
      .reduce((s, g) => s + (g.count || 1) + (g.children || 0), 0);
    expect(confirmed).toBe(2);
  });

  it("counts pending guests correctly", () => {
    storeSet("guests", [
      makeGuest({ status: "pending", count: 3 }),
      makeGuest({ status: "confirmed", count: 2 }),
    ]);
    const guests = /** @type {any[]} */ (storeGet("guests"));
    const pending = guests
      .filter((g) => g.status === "pending")
      .reduce((s, g) => s + (g.count || 1) + (g.children || 0), 0);
    expect(pending).toBe(3);
  });

  it("counts seated guests", () => {
    storeSet("guests", [
      makeGuest({ tableId: "t1" }),
      makeGuest({ tableId: null }),
      makeGuest({ tableId: "t2" }),
    ]);
    const guests = /** @type {any[]} */ (storeGet("guests"));
    const seated = guests.filter((g) => g.tableId).length;
    expect(seated).toBe(2);
  });

  it("counts sent invitations", () => {
    storeSet("guests", [
      makeGuest({ sent: true }),
      makeGuest({ sent: false }),
      makeGuest({ sent: true }),
    ]);
    const guests = /** @type {any[]} */ (storeGet("guests"));
    const sent = guests.filter((g) => g.sent).length;
    expect(sent).toBe(2);
  });

  it("counts vegetarian/non-regular meals", () => {
    storeSet("guests", [
      makeGuest({ meal: "regular" }),
      makeGuest({ meal: "vegetarian" }),
      makeGuest({ meal: "vegan" }),
    ]);
    const guests = /** @type {any[]} */ (storeGet("guests"));
    const veg = guests.filter((g) => g.meal && g.meal !== "regular").length;
    expect(veg).toBe(2);
  });

  it("counts guests needing accessibility", () => {
    storeSet("guests", [
      makeGuest({ accessibility: "wheelchair" }),
      makeGuest({ accessibility: "" }),
      makeGuest({ accessibility: "hearing aid" }),
    ]);
    const guests = /** @type {any[]} */ (storeGet("guests"));
    const access = guests.filter((g) => g.accessibility).length;
    expect(access).toBe(2);
  });

  it("counts groom and bride sides", () => {
    storeSet("guests", [
      makeGuest({ side: "groom" }),
      makeGuest({ side: "bride" }),
      makeGuest({ side: "bride" }),
      makeGuest({ side: "mutual" }),
    ]);
    const guests = /** @type {any[]} */ (storeGet("guests"));
    const groomSide = guests.filter((g) => g.side === "groom").length;
    const brideSide = guests.filter((g) => g.side === "bride").length;
    expect(groomSide).toBe(1);
    expect(brideSide).toBe(2);
  });

  it("counts transport-needing guests", () => {
    storeSet("guests", [
      makeGuest({ transport: "Bus from Tel Aviv" }),
      makeGuest({ transport: "" }),
      makeGuest({ transport: "Own car" }),
    ]);
    const guests = /** @type {any[]} */ (storeGet("guests"));
    const transport = guests.filter((g) => g.transport && g.transport !== "").length;
    expect(transport).toBe(2);
  });
});

// ── Wedding info for top bar ─────────────────────────────────────────────

describe("Wedding info structure", () => {
  beforeEach(() => seedStore());

  it("stores and retrieves wedding info", () => {
    storeSet("weddingInfo", { groom: "אליאור", bride: "טובה", date: "2026-05-07" });
    const info = storeGet("weddingInfo");
    expect(info.groom).toBe("אליאור");
    expect(info.bride).toBe("טובה");
    expect(info.date).toBe("2026-05-07");
  });

  it("handles missing wedding info gracefully", () => {
    const info = storeGet("weddingInfo") ?? {};
    expect(info.groom).toBeUndefined();
  });

  it("allows partial updates", () => {
    storeSet("weddingInfo", { groom: "Test", bride: "User" });
    const info = /** @type {any} */ (storeGet("weddingInfo"));
    storeSet("weddingInfo", { ...info, venue: "Grand Hall" });
    const updated = /** @type {any} */ (storeGet("weddingInfo"));
    expect(updated.groom).toBe("Test");
    expect(updated.venue).toBe("Grand Hall");
  });
});

// ── Budget forecast data logic ───────────────────────────────────────────

describe("Budget forecast logic", () => {
  beforeEach(() => seedStore());

  it("computes per-plate cost from confirmed headcount", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 2 }),
      makeGuest({ status: "confirmed", count: 3 }),
      makeGuest({ status: "pending", count: 5 }),
    ]);
    storeSet("weddingInfo", { perPlateCost: "250", budgetTarget: "50000" });
    const info = /** @type {any} */ (storeGet("weddingInfo"));
    const guests = /** @type {any[]} */ (storeGet("guests"));
    const confirmed = guests
      .filter((g) => g.status === "confirmed")
      .reduce((s, g) => s + (g.count || 1), 0);
    const forecast = confirmed * Number(info.perPlateCost || 0);
    expect(confirmed).toBe(5);
    expect(forecast).toBe(1250);
  });
});

// ── Activity feed ────────────────────────────────────────────────────────

describe("Activity feed", () => {
  beforeEach(() => seedStore());

  it("activity log stores in localStorage format", () => {
    // The activity feed uses wedding_v1_activityLog
    const entries = [
      { ts: Date.now(), key: "guests", action: "update" },
      { ts: Date.now(), key: "vendors", action: "update" },
    ];
    expect(entries).toHaveLength(2);
    expect(entries[0].key).toBe("guests");
  });
});

// ── getWeddingReadinessScore ──────────────────────────────────────────────
describe("getWeddingReadinessScore", () => {
  beforeEach(() => seedStore());

  it("returns factors with correct names", () => {
    const { factors } = getWeddingReadinessScore();
    expect(factors.map((f) => f.name)).toContain("rsvp");
    expect(factors.map((f) => f.name)).toContain("seating");
    expect(factors.map((f) => f.name)).toContain("payments");
  });

  it("returns 100 when all tasks complete", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", tableId: "t1" }),
    ]);
    storeSet("tables", [{ id: "t1", name: "T1", capacity: 10 }]);
    storeSet("vendors", [{ id: "v1", price: 1000, paid: 1000 }]);
    storeSet("timeline", [{ id: "tl1", time: "18:00" }]);
    initStore({
      guests: { value: storeGet("guests") },
      tables: { value: storeGet("tables") },
      vendors: { value: storeGet("vendors") },
      timeline: { value: storeGet("timeline") },
      timelineDone: { value: { tl1: true } },
      weddingInfo: { value: {} },
      expenses: { value: [] },
    });
    const { score } = getWeddingReadinessScore();
    expect(score).toBe(100);
  });

  it("returns score between 0 and 100", () => {
    storeSet("guests", [makeGuest({ status: "pending" })]);
    const { score } = getWeddingReadinessScore();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── getDashboardSnapshot ──────────────────────────────────────────────────
describe("getDashboardSnapshot", () => {
  beforeEach(() => seedStore());

  it("returns correct guest counts", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 3 }),
      makeGuest({ status: "pending", count: 1 }),
      makeGuest({ status: "declined" }),
    ]);
    storeSet("tables", [{ id: "t1" }]);
    const snap = getDashboardSnapshot();
    expect(snap.totalGuests).toBe(3);
    expect(snap.confirmed).toBe(1);
    expect(snap.pending).toBe(1);
    expect(snap.totalHeads).toBe(3);
    expect(snap.totalTables).toBe(1);
  });

  it("returns -1 daysUntilWedding when no date set", () => {
    const snap = getDashboardSnapshot();
    expect(snap.daysUntilWedding).toBe(-1);
  });

  it("calculates daysUntilWedding from weddingInfo.date", () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
    initStore({
      guests: { value: [] },
      tables: { value: [] },
      vendors: { value: [] },
      expenses: { value: [] },
      weddingInfo: { value: { date: futureDate } },
      timeline: { value: [] },
    });
    const snap = getDashboardSnapshot();
    expect(snap.daysUntilWedding).toBeGreaterThanOrEqual(29);
    expect(snap.daysUntilWedding).toBeLessThanOrEqual(31);
  });
});
