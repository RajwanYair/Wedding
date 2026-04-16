/**
 * tests/unit/rsvp.test.mjs — Unit tests for src/sections/rsvp.js
 * Covers: lookupRsvpByPhone · submitRsvp
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  lookupRsvpByPhone,
  submitRsvp,
  getRsvpRateBySide,
  getRsvpResponseTime,
  getRsvpDailyTrend,
} from "../../src/sections/rsvp.js";

// Mock the sheets service so enqueueWrite/appendToRsvpLog are no-ops in tests
vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: vi.fn(),
  appendToRsvpLog: vi.fn(() => Promise.resolve()),
  syncStoreKeyToSheets: vi.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  vi.useFakeTimers();
  initStore({ guests: { value: [] } });
  storeSet("guests", []);
  // Set up minimal DOM for _prefillForm and _showConfirmation
  document.body.innerHTML = `
    <input id="rsvpPhone" />
    <input id="rsvpFirstName" />
    <input id="rsvpLastName" />
    <select id="rsvpStatus"><option value="confirmed">confirmed</option></select>
    <select id="rsvpMeal"><option value="regular">regular</option></select>
    <input id="rsvpCount" type="number" />
    <input id="rsvpChildren" type="number" />
    <div id="rsvpConfirmMsg" class="u-hidden"></div>
  `;
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ── lookupRsvpByPhone ─────────────────────────────────────────────────────────

describe("lookupRsvpByPhone", () => {
  it("returns found:false for invalid phone", () => {
    const result = lookupRsvpByPhone("abc");
    expect(result.found).toBe(false);
  });

  it("returns found:false when no matching guest exists", () => {
    const result = lookupRsvpByPhone("0501234567");
    expect(result.found).toBe(false);
  });

  it("returns found:true and guest when phone matches", () => {
    storeSet("guests", [{
      id: "g1",
      firstName: "Alice",
      lastName: "Smith",
      phone: "972501234567",
      status: "pending",
      count: 2,
    }]);
    const result = lookupRsvpByPhone("0501234567");
    expect(result.found).toBe(true);
    expect(result.guest.firstName).toBe("Alice");
  });

  it("normalises phone before lookup (054 format)", () => {
    storeSet("guests", [{
      id: "g1",
      firstName: "Bob",
      phone: "972541111111",
      status: "pending",
    }]);
    // isValidPhone checks digits-only; use cleaned format (no dashes)
    const result = lookupRsvpByPhone("0541111111");
    expect(result.found).toBe(true);
  });
});

// ── submitRsvp ────────────────────────────────────────────────────────────────

describe("submitRsvp", () => {
  it("returns ok:false for missing phone", () => {
    const result = submitRsvp({ status: "confirmed" });
    expect(result.ok).toBe(false);
  });

  it("returns ok:false for missing status", () => {
    const result = submitRsvp({ phone: "0501234567" });
    expect(result.ok).toBe(false);
  });

  it("updates existing guest status when phone matches", () => {
    storeSet("guests", [{
      id: "g1",
      firstName: "Alice",
      phone: "972501234567",
      status: "pending",
      count: 1,
    }]);
    const result = submitRsvp({
      phone: "0501234567",
      status: "confirmed",
      count: 2,
      meal: "regular",
    });
    expect(result.ok).toBe(true);
    const guest = storeGet("guests")[0];
    expect(guest.status).toBe("confirmed");
    expect(guest.count).toBe(2);
  });

  it("creates a new guest record for unknown phone", () => {
    const result = submitRsvp({
      phone: "0507777777",
      status: "confirmed",
      firstName: "New",
      count: 1,
      meal: "vegan",
    });
    expect(result.ok).toBe(true);
    expect(storeGet("guests").length).toBe(1);
    expect(storeGet("guests")[0].firstName).toBe("New");
  });

  it("sets rsvpDate on successful submission", () => {
    submitRsvp({
      phone: "0509999999",
      status: "confirmed",
      count: 1,
      meal: "regular",
    });
    const guest = storeGet("guests")[0];
    expect(guest.rsvpDate).toBeTruthy();
  });

  it("returns ok:false when both phone and status are missing", () => {
    const result = submitRsvp({});
    expect(result.ok).toBe(false);
  });
});

// ── getRsvpRateBySide ─────────────────────────────────────────────────────
describe("getRsvpRateBySide", () => {
  it("returns empty when no guests", () => {
    storeSet("guests", []);
    expect(getRsvpRateBySide()).toHaveLength(0);
  });

  it("groups response rate by side", () => {
    storeSet("guests", [
      { id: "1", side: "groom", status: "confirmed" },
      { id: "2", side: "groom", status: "pending" },
      { id: "3", side: "bride", status: "confirmed" },
      { id: "4", side: "bride", status: "declined" },
    ]);
    const rates = getRsvpRateBySide();
    const groom = rates.find((r) => r.side === "groom");
    expect(groom.total).toBe(2);
    expect(groom.responded).toBe(1);
    expect(groom.rate).toBe(50);
    const bride = rates.find((r) => r.side === "bride");
    expect(bride.responded).toBe(2);
    expect(bride.rate).toBe(100);
  });
});

// ── getRsvpResponseTime ───────────────────────────────────────────────────
describe("getRsvpResponseTime", () => {
  it("returns zeros when no guests have timestamps", () => {
    storeSet("guests", [{ id: "1" }]);
    const r = getRsvpResponseTime();
    expect(r.count).toBe(0);
    expect(r.avgDays).toBe(0);
  });

  it("calculates average response time in days", () => {
    const base = new Date("2025-01-01T00:00:00Z").toISOString();
    storeSet("guests", [
      { id: "1", createdAt: base, rsvpDate: new Date("2025-01-04T00:00:00Z").toISOString() },
      { id: "2", createdAt: base, rsvpDate: new Date("2025-01-11T00:00:00Z").toISOString() },
    ]);
    const r = getRsvpResponseTime();
    expect(r.count).toBe(2);
    expect(r.fastest).toBe(3);
    expect(r.slowest).toBe(10);
    expect(r.avgDays).toBe(7); // (3+10)/2 = 6.5 → 7
  });
});

// ── getRsvpDailyTrend ─────────────────────────────────────────────────────
describe("getRsvpDailyTrend", () => {
  it("returns empty when no rsvpDate present", () => {
    storeSet("guests", [{ id: "1" }]);
    expect(getRsvpDailyTrend()).toHaveLength(0);
  });

  it("counts submissions per day sorted chronologically", () => {
    storeSet("guests", [
      { id: "1", rsvpDate: "2025-03-15T10:00:00Z" },
      { id: "2", rsvpDate: "2025-03-15T14:00:00Z" },
      { id: "3", rsvpDate: "2025-03-16T08:00:00Z" },
    ]);
    const trend = getRsvpDailyTrend();
    expect(trend).toHaveLength(2);
    expect(trend[0].date).toBe("2025-03-15");
    expect(trend[0].count).toBe(2);
    expect(trend[1].count).toBe(1);
  });
});
