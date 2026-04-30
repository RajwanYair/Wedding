import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatCompact,
  formatPercent,
  roundTo,
} from "../../src/utils/number-format.js";

describe("number-format", () => {
  it("formatNumber adds thousands grouping", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formatNumber respects decimals", () => {
    expect(formatNumber(1.5, { decimals: 2 })).toBe("1.50");
  });

  it("formatNumber can disable grouping", () => {
    expect(formatNumber(1000, { grouping: false })).toBe("1000");
  });

  it("formatNumber adds + sign when signed", () => {
    expect(formatNumber(5, { signed: true })).toBe("+5");
    expect(formatNumber(-5, { signed: true })).toBe("-5");
    expect(formatNumber(0, { signed: true })).toBe("0");
  });

  it("formatNumber returns empty for non-finite", () => {
    expect(formatNumber(Number.NaN)).toBe("");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("formatCompact uses k/M/B suffixes", () => {
    expect(formatCompact(1500)).toBe("1.5k");
    expect(formatCompact(2_500_000)).toBe("2.5M");
    expect(formatCompact(1_500_000_000)).toBe("1.5B");
  });

  it("formatCompact handles small numbers without suffix", () => {
    expect(formatCompact(42)).toBe("42");
  });

  it("formatCompact respects custom decimals", () => {
    expect(formatCompact(1234, { decimals: 2 })).toBe("1.23k");
  });

  it("formatCompact handles negatives", () => {
    expect(formatCompact(-1500)).toBe("-1.5k");
  });

  it("formatPercent", () => {
    expect(formatPercent(0.42)).toBe("42%");
  });

  it("formatPercent with decimals", () => {
    expect(formatPercent(0.4256, { decimals: 1 })).toBe("42.6%");
  });

  it("formatPercent returns empty for non-finite", () => {
    expect(formatPercent(Number.NaN)).toBe("");
  });

  it("roundTo rounds half-up", () => {
    expect(roundTo(1.235, 2)).toBe(1.24);
  });

  it("roundTo with zero decimals", () => {
    expect(roundTo(1.5)).toBe(2);
  });

  it("roundTo handles non-finite", () => {
    expect(Number.isNaN(roundTo(Number.NaN))).toBe(true);
  });
});
