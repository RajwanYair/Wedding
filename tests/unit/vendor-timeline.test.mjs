/**
 * tests/unit/vendor-timeline.test.mjs — S122 vendor payment timeline.
 */
import { describe, it, expect } from "vitest";
import {
  buildPaymentTimeline,
  buildOutstandingByVendor,
  topVendorsByCost,
} from "../../src/services/financial-analytics.js";

describe("S122 — vendor-timeline", () => {
  it("buildPaymentTimeline aggregates per day and accumulates", () => {
    const out = buildPaymentTimeline([
      { vendorId: "v1", amount: 100, paidAt: "2026-04-01T09:00:00Z" },
      { vendorId: "v2", amount: 50,  paidAt: "2026-04-01T15:00:00Z" },
      { vendorId: "v1", amount: 200, paidAt: "2026-04-03T08:00:00Z" },
    ]);
    expect(out).toEqual([
      { date: "2026-04-01", paid: 150, cumulative: 150 },
      { date: "2026-04-03", paid: 200, cumulative: 350 },
    ]);
  });

  it("buildPaymentTimeline ignores invalid amounts and dates", () => {
    const out = buildPaymentTimeline([
      { vendorId: "v1", amount: 0,   paidAt: "2026-04-01" },
      { vendorId: "v1", amount: -5,  paidAt: "2026-04-01" },
      { vendorId: "v1", amount: 10,  paidAt: "garbage" },
      { vendorId: "v1", amount: 25,  paidAt: "2026-04-02" },
    ]);
    expect(out).toEqual([
      { date: "2026-04-02", paid: 25, cumulative: 25 },
    ]);
  });

  it("buildOutstandingByVendor computes outstanding/overpaid", () => {
    const out = buildOutstandingByVendor([
      { id: "v1", name: "DJ", cost: 1000, paid: 600 },
      { id: "v2", name: "Catering", cost: 5000, paid: 5500 },
      { id: "v3", name: "Flowers", cost: 800, paid: 0 },
    ]);
    expect(out[0]).toMatchObject({ vendorId: "v3", outstanding: 800 });
    expect(out[1]).toMatchObject({ vendorId: "v1", outstanding: 400 });
    expect(out[2]).toMatchObject({ vendorId: "v2", outstanding: 0, overpaid: 500 });
  });

  it("topVendorsByCost limits and filters zero-cost", () => {
    const out = topVendorsByCost(
      [
        { id: "a", name: "A", cost: 100 },
        { id: "b", name: "B", cost: 0 },
        { id: "c", name: "C", cost: 500 },
        { id: "d", name: "D", cost: 200 },
      ],
      2,
    );
    expect(out.map((v) => v.id)).toEqual(["c", "d"]);
  });

  it("handles empty/nullish input arrays", () => {
    expect(buildPaymentTimeline()).toEqual([]);
    expect(buildOutstandingByVendor()).toEqual([]);
    expect(topVendorsByCost()).toEqual([]);
  });
});
