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
