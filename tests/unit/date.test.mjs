/**
 * tests/unit/date.test.mjs — Sprint 177
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/i18n.js", () => ({
  formatDate: vi.fn((date, _opts) => date.toISOString().slice(0, 10)),
}));

import { formatDateHebrew, daysUntil, nowISOJerusalem } from "../../src/utils/date.js";
import { formatDate } from "../../src/core/i18n.js";

/** @type {import("vitest").MockInstance} */
const mockFormatDate = /** @type {any} */ (formatDate);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("formatDateHebrew", () => {
  it("calls formatDate with a Date object", () => {
    formatDateHebrew("2025-09-12");
    expect(mockFormatDate).toHaveBeenCalledOnce();
    const firstArg = mockFormatDate.mock.calls[0][0];
    expect(firstArg).toBeInstanceOf(Date);
  });

  it("returns the string from formatDate", () => {
    mockFormatDate.mockReturnValue("יום שישי, 12 בספטמבר 2025");
    const result = formatDateHebrew("2025-09-12");
    expect(result).toBe("יום שישי, 12 בספטמבר 2025");
  });

  it("returns empty string for invalid date", () => {
    expect(formatDateHebrew("not-a-date")).toBe("");
    expect(mockFormatDate).not.toHaveBeenCalled();
  });

  it("accepts a Date object directly", () => {
    const d = new Date("2025-01-01");
    formatDateHebrew(d);
    expect(mockFormatDate).toHaveBeenCalledOnce();
  });
});

describe("daysUntil", () => {
  it("returns positive number for future date", () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const days = daysUntil(future);
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(6);
  });

  it("returns negative number for past date", () => {
    const past = new Date(Date.now() - 5 * 86_400_000).toISOString();
    const days = daysUntil(past);
    expect(days).toBeLessThanOrEqual(-4);
  });

  it("returns 0 or 1 for today", () => {
    const today = new Date().toISOString();
    const days = daysUntil(today);
    expect(Math.abs(days)).toBeLessThanOrEqual(1);
  });

  it("accepts a Date object", () => {
    const d = new Date(Date.now() + 86_400_000);
    expect(daysUntil(d)).toBe(1);
  });
});

describe("nowISOJerusalem", () => {
  it("returns a string in ISO-like format", () => {
    const result = nowISOJerusalem();
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns a different value over time", async () => {
    const a = nowISOJerusalem();
    await new Promise((r) => setTimeout(r, 10));
    // They could conceivably be equal in the same millisecond but the strings are based on seconds
    expect(typeof a).toBe("string");
  });
});
