/**
 * tests/unit/misc.test.mjs — Sprint 176
 */

import { describe, it, expect } from "vitest";
import { uid, guestFullName, parseGiftAmount, isValidHttpsUrl } from "../../src/utils/misc.js";

describe("uid", () => {
  it("returns a non-empty string", () => {
    expect(uid()).toBeTruthy();
    expect(typeof uid()).toBe("string");
  });

  it("generates unique values on each call", () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });

  it("contains only alphanumeric characters (base-36)", () => {
    expect(uid()).toMatch(/^[a-z0-9]+$/);
  });
});

describe("guestFullName", () => {
  it("joins firstName and lastName", () => {
    expect(guestFullName({ firstName: "Alice", lastName: "Smith" })).toBe("Alice Smith");
  });

  it("returns firstName only when lastName is absent", () => {
    expect(guestFullName({ firstName: "Bob" })).toBe("Bob");
  });

  it("returns lastName only when firstName is absent", () => {
    expect(guestFullName({ lastName: "Smith" })).toBe(" Smith");
  });

  it("returns empty string for empty object", () => {
    expect(guestFullName({})).toBe("");
  });
});

describe("parseGiftAmount", () => {
  it("parses a plain number string", () => {
    expect(parseGiftAmount("500")).toBe(500);
  });

  it("strips shekel symbol", () => {
    expect(parseGiftAmount("₪500")).toBe(500);
  });

  it("strips NIS prefix", () => {
    expect(parseGiftAmount("NIS 200")).toBe(200);
  });

  it("strips NIS suffix", () => {
    expect(parseGiftAmount("100 NIS")).toBe(100);
  });

  it("strips commas (thousand separators)", () => {
    expect(parseGiftAmount("1,500")).toBe(1500);
  });

  it("returns 0 for empty/null/undefined", () => {
    expect(parseGiftAmount("")).toBe(0);
    expect(parseGiftAmount(null)).toBe(0);
    expect(parseGiftAmount(undefined)).toBe(0);
  });

  it("returns 0 for non-numeric text", () => {
    expect(parseGiftAmount("abc")).toBe(0);
  });

  it("returns 0 for negative values", () => {
    expect(parseGiftAmount("-50")).toBe(0);
  });

  it("parses decimal amounts", () => {
    expect(parseGiftAmount("99.50")).toBe(99.5);
  });
});

describe("isValidHttpsUrl", () => {
  it("returns true for empty/null/undefined", () => {
    expect(isValidHttpsUrl("")).toBe(true);
    expect(isValidHttpsUrl(null)).toBe(true);
    expect(isValidHttpsUrl(undefined)).toBe(true);
  });

  it("returns true for valid https URL", () => {
    expect(isValidHttpsUrl("https://example.com")).toBe(true);
  });

  it("returns false for http URL", () => {
    expect(isValidHttpsUrl("http://example.com")).toBe(false);
  });

  it("returns false for ftp URL", () => {
    expect(isValidHttpsUrl("ftp://example.com")).toBe(false);
  });

  it("returns false for malformed URL", () => {
    expect(isValidHttpsUrl("not a url")).toBe(false);
  });

  it("returns true for https URL with path and query", () => {
    expect(isValidHttpsUrl("https://example.com/path?q=1")).toBe(true);
  });
});
