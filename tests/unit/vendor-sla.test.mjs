// @ts-check
/** tests/unit/vendor-sla.test.mjs — S595 */
import { describe, it, expect } from "vitest";
import {
  avgResponseMinutes,
  onTimeRate,
  acceptanceRate,
  scoreVendor,
  scoreTier,
} from "../../src/utils/vendor-sla.js";

describe("S595 vendor-sla", () => {
  it("avgResponseMinutes ignores undefined samples", () => {
    expect(
      avgResponseMinutes([
        { vendorId: "v", responseMinutes: 30 },
        { vendorId: "v" },
        { vendorId: "v", responseMinutes: 90 },
      ]),
    ).toBe(60);
  });

  it("avgResponseMinutes returns 0 with no samples", () => {
    expect(avgResponseMinutes([])).toBe(0);
    expect(avgResponseMinutes(/** @type {any} */ (null))).toBe(0);
  });

  it("onTimeRate computes ratio", () => {
    expect(onTimeRate([{ vendorId: "v", onTime: true }, { vendorId: "v", onTime: false }])).toBe(0.5);
  });

  it("acceptanceRate computes ratio", () => {
    expect(
      acceptanceRate([
        { vendorId: "v", accepted: true },
        { vendorId: "v", accepted: true },
        { vendorId: "v", accepted: false },
        { vendorId: "v", accepted: false },
      ]),
    ).toBe(0.5);
  });

  it("scoreVendor blends speed + onTime + accept (0..100)", () => {
    const score = scoreVendor(
      [
        { vendorId: "v", responseMinutes: 60, onTime: true, accepted: true },
        { vendorId: "v", responseMinutes: 60, onTime: true, accepted: true },
      ],
      { targetMinutes: 60 },
    );
    expect(score).toBe(100);
  });

  it("scoreVendor punishes slow response", () => {
    const score = scoreVendor(
      [{ vendorId: "v", responseMinutes: 600, onTime: true, accepted: true }],
      { targetMinutes: 60 },
    );
    // speed = 100*(60/600) = 10 → blended = 4 + 40 + 20 = 64
    expect(score).toBe(64);
  });

  it("scoreTier maps to gold/silver/bronze/watch", () => {
    expect(scoreTier(95)).toBe("gold");
    expect(scoreTier(70)).toBe("silver");
    expect(scoreTier(50)).toBe("bronze");
    expect(scoreTier(20)).toBe("watch");
    expect(scoreTier(Number.NaN)).toBe("watch");
  });
});
