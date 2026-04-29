/**
 * tests/unit/rsvp-funnel.test.mjs — S123 RSVP funnel.
 */
import { describe, it, expect } from "vitest";
import { buildRsvpFunnel, rsvpConversionRate } from "../../src/services/guest-analytics.js";

const sample = [
  { id: "1", invited: true, sent: true, opened: true, status: "confirmed", respondedAt: "2026-04-01" },
  { id: "2", invited: true, sent: true, opened: true, status: "declined", respondedAt: "2026-04-02" },
  { id: "3", invited: true, sent: true, opened: false, status: "pending" },
  { id: "4", invited: true, sent: false, opened: false, status: "pending" },
  { id: "5", invited: false, status: "pending" },
];

describe("S123 — rsvp-funnel", () => {
  it("buildRsvpFunnel returns 5 ordered steps with counts", () => {
    const out = buildRsvpFunnel(sample);
    expect(out.map((s) => s.key)).toEqual([
      "invited", "sent", "opened", "responded", "confirmed",
    ]);
    expect(out.map((s) => s.count)).toEqual([4, 3, 2, 2, 1]);
  });

  it("buildRsvpFunnel computes pct relative to top + dropoff per step", () => {
    const out = buildRsvpFunnel(sample);
    expect(out[0].pct).toBeCloseTo(1.0);
    expect(out[1].pct).toBeCloseTo(0.75); // 3/4
    expect(out[1].dropoff).toBeCloseTo(0.25); // 1 of 4 lost
    expect(out[2].dropoff).toBeCloseTo(1 / 3); // 1 of 3 lost
  });

  it("buildRsvpFunnel handles empty input", () => {
    const out = buildRsvpFunnel([]);
    expect(out).toHaveLength(5);
    for (const s of out) {
      expect(s.count).toBe(0);
      expect(s.pct).toBe(0);
    }
  });

  it("rsvpConversionRate confirmed/responded", () => {
    expect(rsvpConversionRate(sample)).toBeCloseTo(0.5);
    expect(rsvpConversionRate([])).toBe(0);
  });

  it("treats status=confirmed without respondedAt as a response", () => {
    const r = buildRsvpFunnel([
      { id: "1", invited: true, status: "confirmed" },
    ]);
    expect(r.find((s) => s.key === "responded").count).toBe(1);
  });
});
