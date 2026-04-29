/**
 * tests/unit/rsvp-funnel-chart.test.mjs — Sprint 146 RSVP outreach funnel
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const _store = new Map();
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: (k) => _store.get(k) ?? null,
  writeBrowserStorageJson: (k, v) => {
    _store.set(k, JSON.parse(JSON.stringify(v)));
  },
}));

beforeEach(() => {
  _store.clear();
});

const { buildRsvpFunnel, rsvpConversionRate } = await import(
  "../../src/services/analytics.js"
);

describe("RsvpFunnelChart (Sprint 146)", () => {
  describe("buildRsvpFunnel", () => {
    it("returns 5 steps for empty guest list", () => {
      const steps = buildRsvpFunnel([]);
      expect(steps).toHaveLength(5);
      expect(steps.every((s) => s.count === 0)).toBe(true);
    });

    it("counts invited guests correctly", () => {
      const guests = [
        { id: "1", invited: true, status: "pending" },
        { id: "2", invited: true, sent: true, status: "pending" },
        { id: "3", invited: true, sent: true, opened: true, status: "confirmed", respondedAt: "2025-06-01" },
      ];
      const steps = buildRsvpFunnel(guests);
      expect(steps[0].count).toBe(3); // invited
      expect(steps[1].count).toBe(2); // sent
      expect(steps[2].count).toBe(1); // opened
      expect(steps[3].count).toBe(1); // responded
      expect(steps[4].count).toBe(1); // confirmed
    });

    it("computes pct relative to invited count", () => {
      const guests = [
        { id: "1", invited: true, sent: true, status: "confirmed", respondedAt: "2025-06-01" },
        { id: "2", invited: true, status: "pending" },
      ];
      const steps = buildRsvpFunnel(guests);
      expect(steps[0].pct).toBe(1);
      expect(steps[4].pct).toBe(0.5);
    });

    it("computes dropoff between stages", () => {
      const guests = [
        { id: "1", invited: true, sent: true, opened: true, status: "confirmed", respondedAt: "2025-06-01" },
        { id: "2", invited: true, sent: true, status: "pending" },
        { id: "3", invited: true, status: "pending" },
      ];
      const steps = buildRsvpFunnel(guests);
      // invited=3, sent=2, dropoff from invited→sent = 1/3
      expect(steps[1].dropoff).toBeCloseTo(1 / 3, 5);
    });
  });

  describe("rsvpConversionRate", () => {
    it("returns 0 for empty list", () => {
      expect(rsvpConversionRate([])).toBe(0);
    });

    it("returns 1 when all responders confirmed", () => {
      const guests = [
        { id: "1", status: "confirmed", respondedAt: "2025-06-01" },
        { id: "2", status: "confirmed", respondedAt: "2025-06-02" },
      ];
      expect(rsvpConversionRate(guests)).toBe(1);
    });

    it("returns 0.5 when half confirmed half declined", () => {
      const guests = [
        { id: "1", status: "confirmed", respondedAt: "2025-06-01" },
        { id: "2", status: "declined", respondedAt: "2025-06-02" },
      ];
      expect(rsvpConversionRate(guests)).toBe(0.5);
    });

    it("ignores non-responders", () => {
      const guests = [
        { id: "1", status: "confirmed", respondedAt: "2025-06-01" },
        { id: "2", status: "pending" },
      ];
      expect(rsvpConversionRate(guests)).toBe(1);
    });
  });
});
