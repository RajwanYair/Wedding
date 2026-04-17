/**
 * tests/unit/number-formatter.test.mjs — Sprint 108
 */

import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatCount,
  formatFileSize,
  formatCompact,
  formatInteger,
} from "../../src/utils/number-formatter.js";

describe("formatCurrency", () => {
  it("formats ILS with shekel sign (he-IL default)", () => {
    const result = formatCurrency(1000);
    expect(result).toContain("1");
    expect(result).toContain("000");
  });

  it("accepts other currencies", () => {
    const result = formatCurrency(99.99, "USD", "en-US");
    expect(result).toContain("99.99");
    expect(result).toContain("$");
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
  });

  it("formats negative amounts", () => {
    const result = formatCurrency(-500, "ILS", "en-US");
    expect(typeof result).toBe("string");
    expect(result).toContain("500");
  });
});

describe("formatPercent", () => {
  it("formats ratio 0.75 as ~75%", () => {
    const result = formatPercent(0.75);
    expect(result).toContain("75");
    expect(result).toContain("%");
  });

  it("formats non-ratio value (isRatio=false)", () => {
    const result = formatPercent(75, 0, false);
    expect(result).toContain("75");
    expect(result).toContain("%");
  });

  it("respects decimal places", () => {
    const result = formatPercent(0.3333, 1);
    expect(result).toMatch(/33.\d%/);
  });
});

describe("formatCount", () => {
  it("pluralises correctly", () => {
    expect(formatCount(5, "guest", "en-US")).toBe("5 guests");
    expect(formatCount(1, "guest", "en-US")).toBe("1 guest");
  });

  it("handles zero", () => {
    expect(formatCount(0, "table", "en-US")).toBe("0 tables");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats KB", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });

  it("formats MB", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("formats GB", () => {
    expect(formatFileSize(1024 ** 3)).toBe("1.0 GB");
  });

  it("handles 0 bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("handles negative bytes as 0 B", () => {
    expect(formatFileSize(-1)).toBe("0 B");
  });
});

describe("formatCompact", () => {
  it("formats thousands", () => {
    const result = formatCompact(1500, "en-US");
    // Intl compact "1.5K" in en-US
    expect(result.toLowerCase()).toMatch(/1.?5k/i);
  });

  it("formats millions", () => {
    const result = formatCompact(1_200_000, "en-US");
    expect(result.toLowerCase()).toMatch(/1.?2m/i);
  });
});

describe("formatInteger", () => {
  it("adds thousand separators", () => {
    const result = formatInteger(10_000, "en-US");
    expect(result).toBe("10,000");
  });

  it("handles zero", () => {
    expect(formatInteger(0, "en-US")).toBe("0");
  });
});
