/**
 * tests/unit/invitation-analytics.test.mjs — Sprint 122
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  recordEvent, getGuestEvents, getEventsByType,
  uniqueOpens, uniqueClicks, uniqueRsvps,
  getFunnelStats, clearAnalytics,
} = await import("../../src/services/analytics.js");

function seed() {
  initStore({
    invitationAnalytics: { value: [] },
    guests:              { value: [] },
    weddingInfo:         { value: {} },
  });
}

beforeEach(seed);

describe("recordEvent", () => {
  it("records an open event", () => {
    recordEvent("g1", "open");
    expect(getEventsByType("open")).toHaveLength(1);
  });

  it("records a click event with meta", () => {
    recordEvent("g1", "click", { link: "rsvp" });
    expect(getGuestEvents("g1")[0].meta?.link).toBe("rsvp");
  });

  it("throws for missing guestId", () => {
    expect(() => recordEvent("", "open")).toThrow();
  });

  it("throws for unknown event type", () => {
    expect(() => recordEvent("g1", /** @type {any} */ ("view"))).toThrow();
  });
});

describe("getGuestEvents", () => {
  it("returns only events for that guest", () => {
    recordEvent("g1", "open");
    recordEvent("g2", "open");
    recordEvent("g1", "rsvp");
    expect(getGuestEvents("g1")).toHaveLength(2);
  });
});

describe("unique counts", () => {
  it("deduplicates multiple opens by same guest", () => {
    recordEvent("g1", "open");
    recordEvent("g1", "open");
    expect(uniqueOpens()).toBe(1);
  });

  it("uniqueClicks counts distinct guests", () => {
    recordEvent("g1", "click");
    recordEvent("g2", "click");
    expect(uniqueClicks()).toBe(2);
  });

  it("uniqueRsvps counts distinct guests", () => {
    recordEvent("g1", "rsvp");
    recordEvent("g1", "rsvp");
    expect(uniqueRsvps()).toBe(1);
  });
});

describe("getFunnelStats", () => {
  it("returns zeros when no invited guests", () => {
    const stats = getFunnelStats(0);
    expect(stats.openRate).toBe(0);
    expect(stats.conversionRate).toBe(0);
  });

  it("calculates correct rates", () => {
    recordEvent("g1", "open");
    recordEvent("g2", "open");
    recordEvent("g1", "click");
    recordEvent("g1", "rsvp");
    const stats = getFunnelStats(4); // 4 invited
    expect(stats.openRate).toBeCloseTo(0.5);
    expect(stats.clickRate).toBeCloseTo(0.25);
    expect(stats.conversionRate).toBeCloseTo(0.25);
  });
});

describe("clearAnalytics", () => {
  it("removes all events", () => {
    recordEvent("g1", "open");
    clearAnalytics();
    expect(getEventsByType("open")).toHaveLength(0);
  });
});
