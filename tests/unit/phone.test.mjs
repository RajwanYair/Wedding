/**
 * tests/unit/phone.test.mjs — Sprint 175
 */

import { describe, it, expect } from "vitest";
import { cleanPhone, isValidPhone } from "../../src/utils/phone.js";

describe("cleanPhone", () => {
  it("converts 05X Israeli format to 972X", () => {
    expect(cleanPhone("0541234567")).toBe("972541234567");
  });

  it("strips hyphens, spaces, parentheses, dots", () => {
    expect(cleanPhone("054-123-4567")).toBe("972541234567");
    expect(cleanPhone("(054) 123.4567")).toBe("972541234567");
    expect(cleanPhone("054 123 4567")).toBe("972541234567");
  });

  it("leaves +972 (strips leading +)", () => {
    expect(cleanPhone("+972541234567")).toBe("972541234567");
  });

  it("does not double-prefix 972 numbers", () => {
    expect(cleanPhone("972541234567")).toBe("972541234567");
  });

  it("returns empty string for empty input", () => {
    expect(cleanPhone("")).toBe("");
    expect(cleanPhone(null)).toBe("");
    expect(cleanPhone(undefined)).toBe("");
  });

  it("handles numbers that already start with 972", () => {
    expect(cleanPhone("972509876543")).toBe("972509876543");
  });

  it("converts 0 prefix to 972 even for non-5X numbers", () => {
    expect(cleanPhone("0721234567")).toBe("972721234567");
  });
});

describe("isValidPhone", () => {
  it("passes for a valid 12-digit international number", () => {
    expect(isValidPhone("972541234567")).toBe(true);
  });

  it("passes for 9-digit minimum", () => {
    expect(isValidPhone("123456789")).toBe(true);
  });

  it("fails for too-short number", () => {
    expect(isValidPhone("1234")).toBe(false);
  });

  it("fails for too-long number (> 15 digits)", () => {
    expect(isValidPhone("1234567890123456")).toBe(false);
  });

  it("fails when containing letters", () => {
    expect(isValidPhone("97254abc567")).toBe(false);
  });

  it("fails for empty string", () => {
    expect(isValidPhone("")).toBe(false);
  });
});
