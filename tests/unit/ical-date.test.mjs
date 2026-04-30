import { describe, it, expect } from "vitest";
import {
  formatIcalUtc,
  formatIcalDate,
  parseIcal,
  escapeIcalText,
} from "../../src/utils/ical-date.js";

describe("ical-date", () => {
  it("formatIcalUtc produces YYYYMMDDTHHMMSSZ", () => {
    expect(formatIcalUtc(new Date("2026-04-30T15:30:45Z"))).toBe(
      "20260430T153045Z",
    );
  });

  it("formatIcalUtc invalid → empty", () => {
    expect(formatIcalUtc(new Date("nope"))).toBe("");
    expect(formatIcalUtc(/** @type {any} */ (null))).toBe("");
  });

  it("formatIcalDate strips time", () => {
    expect(formatIcalDate(new Date("2026-04-30T15:30:00Z"))).toBe("20260430");
  });

  it("formatIcalDate invalid → empty", () => {
    expect(formatIcalDate(/** @type {any} */ ("x"))).toBe("");
  });

  it("parseIcal date-time UTC", () => {
    const d = parseIcal("20260430T153045Z");
    expect(d?.toISOString()).toBe("2026-04-30T15:30:45.000Z");
  });

  it("parseIcal date only → midnight UTC", () => {
    const d = parseIcal("20260430");
    expect(d?.toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });

  it("parseIcal date-time without Z still treated as UTC", () => {
    const d = parseIcal("20260430T120000");
    expect(d?.toISOString()).toBe("2026-04-30T12:00:00.000Z");
  });

  it("parseIcal returns null for malformed input", () => {
    expect(parseIcal("2026-04-30")).toBe(null);
    expect(parseIcal("nope")).toBe(null);
    expect(parseIcal(/** @type {any} */ (null))).toBe(null);
  });

  it("round-trip formatIcalUtc → parseIcal", () => {
    const a = new Date("2026-12-31T23:59:59Z");
    const s = formatIcalUtc(a);
    expect(parseIcal(s)?.getTime()).toBe(a.getTime());
  });

  it("escapeIcalText escapes commas semicolons newlines backslash", () => {
    expect(escapeIcalText("a, b; c\nd\\e")).toBe("a\\, b\\; c\\nd\\\\e");
  });

  it("escapeIcalText handles CRLF", () => {
    expect(escapeIcalText("a\r\nb")).toBe("a\\nb");
  });

  it("escapeIcalText non-string → empty", () => {
    expect(escapeIcalText(/** @type {any} */ (null))).toBe("");
  });
});
