import { describe, it, expect } from "vitest";
import {
  formatIntl,
  detectCountry,
  COUNTRIES,
} from "../../src/utils/phone-format-intl.js";

describe("phone-format-intl", () => {
  it("formats Israeli mobile (9-digit national)", () => {
    expect(formatIntl("972541234567")).toBe("+972 54-123-4567");
  });

  it("formats US 10-digit", () => {
    expect(formatIntl("14155551212")).toBe("+1 (415) 555-1212");
  });

  it("formats UK 10-digit", () => {
    expect(formatIntl("442079460958")).toBe("+44 2079 460 958");
  });

  it("formats French 9-digit pairs", () => {
    expect(formatIntl("33612345678")).toBe("+33 61 23 45 67 8");
  });

  it("formats German with generic 3-digit grouping", () => {
    expect(formatIntl("4930123456")).toBe("+49 30 123 456");
  });

  it("strips non-digit characters", () => {
    expect(formatIntl("+972-54-123-4567")).toBe("+972 54-123-4567");
  });

  it("returns empty for empty/non-string", () => {
    expect(formatIntl("")).toBe("");
    expect(formatIntl(null)).toBe("");
  });

  it("returns dial-code only when no national digits", () => {
    expect(formatIntl("972")).toBe("+972");
  });

  it("falls back to generic grouping for unknown country", () => {
    expect(formatIntl("99912345678")).toBe("+99 912 345 678");
  });

  it("detectCountry returns metadata", () => {
    expect(detectCountry("972541234567")).toEqual({
      iso: "IL",
      name: "Israel",
      code: "972",
    });
  });

  it("detectCountry returns null for unknown", () => {
    expect(detectCountry("99912345")).toBe(null);
  });

  it("detectCountry returns null for invalid input", () => {
    expect(detectCountry(null)).toBe(null);
    expect(detectCountry("")).toBe(null);
  });

  it("COUNTRIES list is non-empty and stable", () => {
    expect(COUNTRIES.length).toBeGreaterThan(0);
    expect(COUNTRIES.every((c) => /^\d+$/.test(c.code))).toBe(true);
  });
});
