/**
 * S715 + S716 integration tests
 * - getRsvpAnalytics / getResponseRate / getConfirmedHeadcount (rsvp.js ← rsvp-analytics.js)
 * - getRsvpCountdown / isRsvpOverdue                           (rsvp.js ← rsvp-deadline.js)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeSet } from "../../src/core/store.js";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
  appendToRsvpLog: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn(), vibrate: vi.fn() }));

beforeEach(() => {
  initStore({ guests: { value: [] }, weddingInfo: { value: {} } });
});

describe("S715 — getRsvpAnalytics + getResponseRate + getConfirmedHeadcount", () => {
  it("getRsvpAnalytics returns correct distribution", async () => {
    storeSet("guests", [
      { id: "1", status: "confirmed" },
      { id: "2", status: "confirmed", seats: 3 },
      { id: "3", status: "declined" },
      { id: "4", status: "pending" },
    ]);
    const { getRsvpAnalytics } = await import("../../src/sections/rsvp.js");
    const r = getRsvpAnalytics();
    expect(r.confirmed).toBe(2);
    expect(r.declined).toBe(1);
    expect(r.pending).toBe(1);
    expect(r.total).toBe(4);
  });

  it("getResponseRate calculates percentage", async () => {
    storeSet("guests", [
      { id: "1", status: "confirmed" },
      { id: "2", status: "declined" },
      { id: "3", status: "pending" },
      { id: "4", status: "pending" },
    ]);
    const { getResponseRate } = await import("../../src/sections/rsvp.js");
    expect(getResponseRate()).toBe(50);
  });

  it("getConfirmedHeadcount sums party sizes", async () => {
    storeSet("guests", [
      { id: "1", status: "confirmed", seats: 2 },
      { id: "2", status: "confirmed", seats: 3 },
      { id: "3", status: "declined", seats: 2 },
    ]);
    const { getConfirmedHeadcount } = await import("../../src/sections/rsvp.js");
    expect(getConfirmedHeadcount()).toBe(5);
  });
});

describe("S716 — getRsvpCountdown + isRsvpOverdue", () => {
  it("getRsvpCountdown returns days/hours/minutes/seconds/isPast", async () => {
    const futureDeadline = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const { getRsvpCountdown } = await import("../../src/sections/rsvp.js");
    const c = getRsvpCountdown(futureDeadline);
    expect(c).toHaveProperty("days");
    expect(c).toHaveProperty("isPast");
    expect(c.isPast).toBe(false);
    expect(c.days).toBeGreaterThanOrEqual(1);
  });

  it("isRsvpOverdue returns true for past date", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const { isRsvpOverdue } = await import("../../src/sections/rsvp.js");
    expect(isRsvpOverdue(past)).toBe(true);
  });

  it("isRsvpOverdue returns false for future date", async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const { isRsvpOverdue } = await import("../../src/sections/rsvp.js");
    expect(isRsvpOverdue(future)).toBe(false);
  });
});
