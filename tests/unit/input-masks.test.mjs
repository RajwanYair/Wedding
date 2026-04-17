/**
 * tests/unit/input-masks.test.mjs — Sprint 207
 */

import { describe, it, expect } from "vitest";
import {
  formatPhone,
  formatDate,
  applyMask,
  stripMask,
  formatCurrency,
  matchesMask,
  maskSensitive,
} from "../../src/utils/input-masks.js";

describe("formatPhone", () => {
  it("formats Israeli mobile 10 digit", () => {
    expect(formatPhone("0501234567")).toBe("050-123-4567");
  });
  it("strips non-digits before formatting", () => {
    expect(formatPhone("050-123-4567")).toBe("050-123-4567");
  });
  it("returns digits as-is for short/unusual numbers", () => {
    expect(formatPhone("12345")).toBe("12345");
  });
  it("formats international 972", () => {
    const r = formatPhone("972501234567", { international: true });
    expect(r).toContain("+972");
  });
});

describe("formatDate", () => {
  it("formats ISO date to DD/MM/YYYY", () => {
    expect(formatDate("2026-04-18")).toBe("18/04/2026");
  });
  it("formats YYYYMMDD digits", () => {
    expect(formatDate("20260418")).toBe("18/04/2026");
  });
  it("returns raw value for unrecognized format", () => {
    expect(formatDate("hello")).toBe("hello");
  });
});

describe("applyMask", () => {
  it("applies credit-card mask", () => {
    expect(applyMask("1234567890123456", "####-####-####-####")).toBe("1234-5678-9012-3456");
  });
  it("stops at end of input", () => {
    expect(applyMask("123", "##-##-##")).toBe("12-3");
  });
  it("strips non-digits from input", () => {
    expect(applyMask("123-456", "######")).toBe("123456");
  });
});

describe("stripMask", () => {
  it("removes all non-digit chars", () => {
    expect(stripMask("050-123-4567")).toBe("0501234567");
  });
  it("returns only digits", () => {
    expect(stripMask("abc123def")).toBe("123");
  });
});

describe("formatCurrency", () => {
  it("formats ILS amount", () => {
    const r = formatCurrency(1500, "ILS", "he-IL");
    expect(r).toContain("1");
    expect(typeof r).toBe("string");
  });
  it("defaults to ILS", () => {
    const r = formatCurrency(100);
    expect(typeof r).toBe("string");
  });
});

describe("matchesMask", () => {
  it("returns true when digit count matches pattern", () => {
    expect(matchesMask("1234567890", "##########")).toBe(true);
  });
  it("returns false for partial input", () => {
    expect(matchesMask("123", "##########")).toBe(false);
  });
  it("ignores separators in value", () => {
    expect(matchesMask("050-123-4567", "###-###-####")).toBe(true);
  });
});

describe("maskSensitive", () => {
  it("masks all but last 4", () => {
    expect(maskSensitive("0501234567")).toBe("******4567");
  });
  it("custom visible count", () => {
    expect(maskSensitive("abcdef", 2)).toBe("****ef");
  });
  it("returns value as-is when short", () => {
    expect(maskSensitive("abc", 4)).toBe("abc");
  });
  it("returns empty for empty input", () => {
    expect(maskSensitive("")).toBe("");
  });
});
