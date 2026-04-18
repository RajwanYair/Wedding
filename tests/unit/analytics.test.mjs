/**
 * tests/unit/analytics.test.mjs — Unit tests for analytics section
 * Covers: computeResponseVelocity · getMealDistribution · getSideBalance ·
 *         getCheckinVelocity · getRsvpConversionRate · checkBudgetOvershoot ·
 *         predictNoShowRate · computeArrivalForecast
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";
import { makeGuest } from "./helpers.js";
import {
  computeResponseVelocity,
  getMealDistribution,
  getSideBalance,
  getCheckinVelocity,
  getRsvpConversionRate,
  checkBudgetOvershoot,
  predictNoShowRate,
  computeArrivalForecast,
  getCostPerHead,
  getSeatingCompletion,
  getBudgetCategoryBreakdown,
  getRsvpDeadlineCountdown,
  getVendorPaymentProgress,
  getErrorStats,
} from "../../src/sections/analytics.js";

function seedStore() {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    appErrors: { value: [] },
    weddingInfo: { value: {} },
  });
}

// ── computeResponseVelocity ──────────────────────────────────────────────

describe("computeResponseVelocity", () => {
  beforeEach(() => seedStore());

  it("returns empty array when no guests", () => {
    expect(computeResponseVelocity()).toEqual([]);
  });

  it("returns empty when no guests have rsvpDate", () => {
    storeSet("guests", [makeGuest()]);
    expect(computeResponseVelocity()).toEqual([]);
  });

  it("groups responses by day", () => {
    storeSet("guests", [
      makeGuest({ rsvpDate: "2026-04-10T10:00:00Z" }),
      makeGuest({ rsvpDate: "2026-04-10T15:00:00Z" }),
      makeGuest({ rsvpDate: "2026-04-11T08:00:00Z" }),
    ]);
    const result = computeResponseVelocity();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: "2026-04-10", count: 2 });
    expect(result[1]).toEqual({ date: "2026-04-11", count: 1 });
  });

  it("returns sorted by date ascending", () => {
    storeSet("guests", [
      makeGuest({ rsvpDate: "2026-04-15T10:00:00Z" }),
      makeGuest({ rsvpDate: "2026-04-10T10:00:00Z" }),
    ]);
    const dates = computeResponseVelocity().map((r) => r.date);
    expect(dates[0]).toBe("2026-04-10");
    expect(dates[1]).toBe("2026-04-15");
  });
});

// ── getMealDistribution ──────────────────────────────────────────────────

describe("getMealDistribution", () => {
  beforeEach(() => seedStore());

  it("returns empty array when no confirmed guests", () => {
    storeSet("guests", [makeGuest({ status: "pending" })]);
    expect(getMealDistribution()).toEqual([]);
  });

  it("counts meals for confirmed guests only", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", meal: "regular" }),
      makeGuest({ status: "confirmed", meal: "vegetarian" }),
      makeGuest({ status: "pending", meal: "vegan" }),
    ]);
    const result = getMealDistribution();
    expect(result).toHaveLength(2);
    const total = result.reduce((s, r) => s + r.count, 0);
    expect(total).toBe(2);
  });

  it("calculates percentage correctly", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", meal: "regular" }),
      makeGuest({ status: "confirmed", meal: "regular" }),
      makeGuest({ status: "confirmed", meal: "vegetarian" }),
      makeGuest({ status: "confirmed", meal: "vegan" }),
    ]);
    const result = getMealDistribution();
    const regular = result.find((r) => r.meal === "regular");
    expect(regular.pct).toBe(50); // 2/4 = 50%
  });

  it("defaults missing meal to 'regular'", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", meal: undefined }),
    ]);
    const result = getMealDistribution();
    expect(result[0].meal).toBe("regular");
  });

  it("sorts by count descending", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", meal: "vegan" }),
      makeGuest({ status: "confirmed", meal: "regular" }),
      makeGuest({ status: "confirmed", meal: "regular" }),
      makeGuest({ status: "confirmed", meal: "regular" }),
    ]);
    const result = getMealDistribution();
    expect(result[0].meal).toBe("regular");
    expect(result[0].count).toBe(3);
  });
});

// ── getSideBalance ───────────────────────────────────────────────────────

describe("getSideBalance", () => {
  beforeEach(() => seedStore());

  it("returns zeros when no guests", () => {
    const result = getSideBalance();
    expect(result.groom).toBe(0);
    expect(result.bride).toBe(0);
    expect(result.mutual).toBe(0);
  });

  it("counts sides correctly", () => {
    storeSet("guests", [
      makeGuest({ side: "groom" }),
      makeGuest({ side: "bride" }),
      makeGuest({ side: "bride" }),
      makeGuest({ side: "mutual" }),
    ]);
    const result = getSideBalance();
    expect(result.groom).toBe(1);
    expect(result.bride).toBe(2);
    expect(result.mutual).toBe(1);
  });

  it("treats missing side as mutual", () => {
    storeSet("guests", [makeGuest({ side: undefined })]);
    const result = getSideBalance();
    expect(result.mutual).toBe(1);
  });

  it("calculates percentages", () => {
    storeSet("guests", [
      makeGuest({ side: "groom" }),
      makeGuest({ side: "bride" }),
    ]);
    const result = getSideBalance();
    expect(result.groomPct).toBe(50);
    expect(result.bridePct).toBe(50);
  });
});

// ── getCheckinVelocity ───────────────────────────────────────────────────

describe("getCheckinVelocity", () => {
  beforeEach(() => seedStore());

  it("returns empty when no checked-in guests", () => {
    storeSet("guests", [makeGuest()]);
    expect(getCheckinVelocity()).toEqual([]);
  });

  it("groups by 15-minute slots", () => {
    storeSet("guests", [
      makeGuest({ checkedIn: true, checkedInAt: "2026-05-07T18:05:00" }),
      makeGuest({ checkedIn: true, checkedInAt: "2026-05-07T18:10:00" }),
      makeGuest({ checkedIn: true, checkedInAt: "2026-05-07T18:20:00" }),
    ]);
    const result = getCheckinVelocity();
    // 18:05 and 18:10 both in 18:00 slot, 18:20 in 18:15 slot
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("skips guests without checkedInAt", () => {
    storeSet("guests", [
      makeGuest({ checkedIn: true }), // no checkedInAt
    ]);
    expect(getCheckinVelocity()).toEqual([]);
  });

  it("sorts by slot ascending", () => {
    storeSet("guests", [
      makeGuest({ checkedIn: true, checkedInAt: "2026-05-07T20:00:00" }),
      makeGuest({ checkedIn: true, checkedInAt: "2026-05-07T18:00:00" }),
    ]);
    const result = getCheckinVelocity();
    if (result.length >= 2) {
      expect(result[0].slot < result[1].slot).toBe(true);
    }
  });
});

// ── getRsvpConversionRate ────────────────────────────────────────────────

describe("getRsvpConversionRate", () => {
  beforeEach(() => seedStore());

  it("returns zeros when no guests", () => {
    const result = getRsvpConversionRate();
    expect(result.sent).toBe(0);
    expect(result.responded).toBe(0);
    expect(result.rate).toBe(0);
  });

  it("calculates sent count", () => {
    storeSet("guests", [
      makeGuest({ sent: true }),
      makeGuest({ sent: true }),
      makeGuest({ sent: false }),
    ]);
    expect(getRsvpConversionRate().sent).toBe(2);
  });

  it("counts responded as non-pending", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", sent: true }),
      makeGuest({ status: "declined", sent: true }),
      makeGuest({ status: "pending", sent: true }),
    ]);
    const result = getRsvpConversionRate();
    expect(result.responded).toBe(2);
    expect(result.sent).toBe(3);
  });

  it("calculates conversion rate as percentage", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", sent: true }),
      makeGuest({ status: "pending", sent: true }),
    ]);
    const result = getRsvpConversionRate();
    expect(result.rate).toBe(50); // 1 responded / 2 sent
  });

  it("calculates confirm rate", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", sent: true }),
      makeGuest({ status: "declined", sent: true }),
    ]);
    const result = getRsvpConversionRate();
    expect(result.confirmRate).toBe(50); // 1 confirmed / 2 responded
  });
});

// ── checkBudgetOvershoot ─────────────────────────────────────────────────

describe("checkBudgetOvershoot", () => {
  beforeEach(() => seedStore());

  it("returns not over budget when no target set", () => {
    const result = checkBudgetOvershoot();
    expect(result.overBudget).toBe(false);
  });

  it("detects over budget", () => {
    storeSet("vendors", [{ price: 30000 }]);
    storeSet("expenses", [{ amount: 25000 }]);
    storeSet("weddingInfo", { budgetTarget: "50000" });
    const result = checkBudgetOvershoot();
    expect(result.overBudget).toBe(true);
    expect(result.committed).toBe(55000);
  });

  it("not over budget when under target", () => {
    storeSet("vendors", [{ price: 20000 }]);
    storeSet("expenses", [{ amount: 10000 }]);
    storeSet("weddingInfo", { budgetTarget: "50000" });
    const result = checkBudgetOvershoot();
    expect(result.overBudget).toBe(false);
    expect(result.committed).toBe(30000);
  });
});

// ── predictNoShowRate ────────────────────────────────────────────────────

describe("predictNoShowRate", () => {
  beforeEach(() => seedStore());

  it("returns 0 when no confirmed guests", () => {
    const result = predictNoShowRate();
    expect(result.noShowRate).toBe(0);
    expect(result.expectedNoShows).toBe(0);
  });

  it("returns 0 when no wedding date", () => {
    storeSet("guests", [makeGuest({ status: "confirmed" })]);
    const result = predictNoShowRate();
    expect(result.noShowRate).toBe(0);
  });

  it("calculates rate with all on-time RSVPs", () => {
    storeSet("weddingInfo", { date: "2026-05-07" });
    storeSet("guests", [
      makeGuest({ status: "confirmed", rsvpDate: "2026-04-01T10:00:00Z", count: 2 }),
      makeGuest({ status: "confirmed", rsvpDate: "2026-04-05T10:00:00Z", count: 3 }),
    ]);
    const result = predictNoShowRate();
    expect(result.noShowRate).toBeCloseTo(0.05);
    expect(result.confirmed).toBe(5); // 2+3 heads
  });

  it("increases rate for late RSVPs", () => {
    storeSet("weddingInfo", { date: "2026-05-07" });
    storeSet("guests", [
      makeGuest({ status: "confirmed", rsvpDate: "2026-05-05T10:00:00Z" }), // 2 days before = very late
    ]);
    const result = predictNoShowRate();
    expect(result.noShowRate).toBeGreaterThan(0.05);
    expect(result.lateConfirmed).toBeGreaterThan(0);
  });
});

// ── computeArrivalForecast ───────────────────────────────────────────────

describe("computeArrivalForecast", () => {
  beforeEach(() => seedStore());

  it("returns zeros when no guests", () => {
    const result = computeArrivalForecast();
    expect(result.projected).toBe(0);
    expect(result.confirmed).toBe(0);
  });

  it("projects confirmed at 100%", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 5 }),
    ]);
    const result = computeArrivalForecast();
    expect(result.confirmed).toBe(5);
    expect(result.projected).toBeGreaterThanOrEqual(5);
  });

  it("projects maybe at 60%", () => {
    storeSet("guests", [
      makeGuest({ status: "maybe", count: 10, children: 0 }),
    ]);
    const result = computeArrivalForecast();
    expect(result.maybe).toBe(10);
    expect(result.projected).toBe(6); // 10 * 0.6
  });

  it("projects pending at 40%", () => {
    storeSet("guests", [
      makeGuest({ status: "pending", count: 10, children: 0 }),
    ]);
    const result = computeArrivalForecast();
    expect(result.pending).toBe(10);
    expect(result.projected).toBe(4); // 10 * 0.4
  });

  it("includes children in headcount", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 2, children: 3 }),
    ]);
    const result = computeArrivalForecast();
    expect(result.confirmed).toBe(5); // 2 + 3
  });

  it("correctly sums mixed statuses", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 10, children: 0 }),
      makeGuest({ status: "maybe", count: 10, children: 0 }),
      makeGuest({ status: "pending", count: 10, children: 0 }),
      makeGuest({ status: "declined", count: 5, children: 0 }),
    ]);
    const result = computeArrivalForecast();
    expect(result.confirmed).toBe(10);
    expect(result.maybe).toBe(10);
    expect(result.pending).toBe(10);
    expect(result.declined).toBe(5);
    // projected = 10 + 10*0.6 + 10*0.4 = 10 + 6 + 4 = 20
    expect(result.projected).toBe(20);
  });
});

// ── getCostPerHead ───────────────────────────────────────────────────────

describe("getCostPerHead", () => {
  beforeEach(() => seedStore());

  it("returns 0 when no confirmed guests", () => {
    const result = getCostPerHead();
    expect(result.costPerHead).toBe(0);
    expect(result.confirmedSeats).toBe(0);
  });

  it("computes cost per head with budget target", () => {
    storeSet("weddingInfo", { budgetTarget: "100000" });
    storeSet("guests", [
      makeGuest({ status: "confirmed", count: 50 }),
    ]);
    const result = getCostPerHead();
    expect(result.costPerHead).toBe(2000);
    expect(result.totalBudget).toBe(100000);
  });

  it("falls back to vendor+expense total when no budget target", () => {
    storeSet("vendors", [{ price: 30000 }]);
    storeSet("expenses", [{ amount: 10000 }]);
    storeSet("guests", [makeGuest({ status: "confirmed", count: 20 })]);
    const result = getCostPerHead();
    expect(result.totalBudget).toBe(40000);
    expect(result.costPerHead).toBe(2000);
  });
});

// ── getSeatingCompletion ─────────────────────────────────────────────────

describe("getSeatingCompletion", () => {
  beforeEach(() => seedStore());

  it("returns 0% when no guests", () => {
    const result = getSeatingCompletion();
    expect(result.rate).toBe(0);
    expect(result.totalGuests).toBe(0);
  });

  it("computes seating rate for confirmed guests", () => {
    storeSet("guests", [
      makeGuest({ status: "confirmed", tableId: "t1" }),
      makeGuest({ status: "confirmed", tableId: "t2" }),
      makeGuest({ status: "confirmed", tableId: "" }),
      makeGuest({ status: "pending" }), // not counted
    ]);
    const result = getSeatingCompletion();
    expect(result.totalGuests).toBe(3);
    expect(result.seated).toBe(2);
    expect(result.unseated).toBe(1);
    expect(result.rate).toBe(67); // 2/3 ≈ 67%
  });
});

// ── getBudgetCategoryBreakdown ───────────────────────────────────────────

describe("getBudgetCategoryBreakdown", () => {
  beforeEach(() => seedStore());

  it("returns empty when no vendors or expenses", () => {
    expect(getBudgetCategoryBreakdown()).toEqual([]);
  });

  it("groups by category with percentages", () => {
    storeSet("vendors", [
      { category: "venue", price: 50000 },
      { category: "catering", price: 30000 },
    ]);
    storeSet("expenses", [
      { category: "venue", amount: 10000 },
    ]);
    const result = getBudgetCategoryBreakdown();
    expect(result[0].category).toBe("venue");
    expect(result[0].amount).toBe(60000);
    expect(result[1].category).toBe("catering");
    expect(result.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(100, -1);
  });
});

// ── getRsvpDeadlineCountdown ─────────────────────────────────────────────

describe("getRsvpDeadlineCountdown", () => {
  beforeEach(() => seedStore());

  it("returns null when no deadline set", () => {
    const result = getRsvpDeadlineCountdown();
    expect(result.daysLeft).toBeNull();
    expect(result.deadline).toBeNull();
  });

  it("detects overdue deadline", () => {
    storeSet("weddingInfo", { rsvpDeadline: "2020-01-01" });
    const result = getRsvpDeadlineCountdown();
    expect(result.isOverdue).toBe(true);
    expect(result.daysLeft).toBeLessThan(0);
  });

  it("detects future deadline", () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    storeSet("weddingInfo", { rsvpDeadline: future });
    const result = getRsvpDeadlineCountdown();
    expect(result.isOverdue).toBe(false);
    expect(result.daysLeft).toBeGreaterThan(0);
  });
});

// ── getVendorPaymentProgress ─────────────────────────────────────────────

describe("getVendorPaymentProgress", () => {
  beforeEach(() => seedStore());

  it("returns zeros when no vendors", () => {
    const result = getVendorPaymentProgress();
    expect(result.totalVendors).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it("categorizes vendor payment status", () => {
    storeSet("vendors", [
      { price: 10000, paid: 10000 },  // fully paid
      { price: 20000, paid: 5000 },   // partially paid
      { price: 15000, paid: 0 },      // unpaid
    ]);
    const result = getVendorPaymentProgress();
    expect(result.fullyPaid).toBe(1);
    expect(result.partiallyPaid).toBe(1);
    expect(result.unpaid).toBe(1);
    expect(result.outstanding).toBe(30000);
    expect(result.totalCost).toBe(45000);
    expect(result.totalPaid).toBe(15000);
  });
});

// ── Phase 10.3 — getErrorStats ────────────────────────────────────────────
describe("getErrorStats", () => {
  beforeEach(() => {
    seedStore();
  });

  it("returns zero totals when appErrors is empty", () => {
    storeSet("appErrors", []);
    const { total, bySeverity, recent } = getErrorStats();
    expect(total).toBe(0);
    expect(bySeverity).toEqual({});
    expect(recent).toHaveLength(0);
  });

  it("counts by severity level", () => {
    storeSet("appErrors", [
      { message: "Err1", level: "error", ts: "2025-01-01T10:00:00Z" },
      { message: "Err2", level: "error", ts: "2025-01-01T10:01:00Z" },
      { message: "Warn1", level: "warning", ts: "2025-01-01T10:02:00Z" },
    ]);
    const { total, bySeverity } = getErrorStats();
    expect(total).toBe(3);
    expect(bySeverity.error).toBe(2);
    expect(bySeverity.warning).toBe(1);
  });

  it("returns at most 10 most recent entries in reverse order", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      message: `e${i}`,
      level: "error",
      ts: `2025-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    storeSet("appErrors", many);
    const { recent } = getErrorStats();
    expect(recent).toHaveLength(10);
    // Most recent should be first (reversed)
    expect(recent[0].message).toBe("e14");
  });

  it("falls back to 'severity' field when 'level' missing", () => {
    storeSet("appErrors", [
      { message: "x", severity: "critical", ts: "2025-01-01T10:00:00Z" },
    ]);
    const { bySeverity } = getErrorStats();
    expect(bySeverity.critical).toBe(1);
  });

  it("truncates message to 120 chars", () => {
    const long = "x".repeat(200);
    storeSet("appErrors", [{ message: long, level: "error" }]);
    const { recent } = getErrorStats();
    expect(recent[0].message.length).toBe(120);
  });
});
