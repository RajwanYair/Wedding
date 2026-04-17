/**
 * tests/unit/schema-validator.test.mjs — Sprint 166
 */

import { describe, it, expect } from "vitest";
import {
  required,
  maxLength,
  minLength,
  min,
  max,
  pattern,
  email,
  phone,
  oneOf,
  validate,
  isValid,
} from "../../src/utils/schema-validator.js";

describe("required", () => {
  const v = required();
  it("passes for non-empty string", () => expect(v("hello")).toBeNull());
  it("fails for empty string", () => expect(v("")).not.toBeNull());
  it("fails for null", () => expect(v(null)).not.toBeNull());
  it("fails for whitespace only", () => expect(v("   ")).not.toBeNull());
  it("returns rule=required", () => expect(v("")).toMatchObject({ rule: "required" }));
  it("uses custom message", () => expect(required("Field required")("")).toMatchObject({ message: "Field required" }));
});

describe("maxLength", () => {
  const v = maxLength(5);
  it("passes for length <= max", () => expect(v("hello")).toBeNull());
  it("fails for length > max", () => expect(v("toolong")).not.toBeNull());
  it("passes empty string", () => expect(v("")).toBeNull());
});

describe("minLength", () => {
  const v = minLength(3);
  it("passes for length >= min", () => expect(v("abc")).toBeNull());
  it("fails for length < min", () => expect(v("ab")).not.toBeNull());
});

describe("min", () => {
  const v = min(5);
  it("passes for value >= min", () => expect(v(5)).toBeNull());
  it("fails for value < min", () => expect(v(4)).not.toBeNull());
  it("fails for NaN", () => expect(v("abc")).not.toBeNull());
});

describe("max", () => {
  const v = max(10);
  it("passes for value <= max", () => expect(v(10)).toBeNull());
  it("fails for value > max", () => expect(v(11)).not.toBeNull());
});

describe("pattern", () => {
  const v = pattern(/^\d{4}$/);
  it("passes for matching string", () => expect(v("1234")).toBeNull());
  it("fails for non-matching string", () => expect(v("12x4")).not.toBeNull());
});

describe("email", () => {
  const v = email();
  it("passes for valid email", () => expect(v("test@example.com")).toBeNull());
  it("fails for invalid email", () => expect(v("notanemail")).not.toBeNull());
  it("passes for blank (use required for that)", () => expect(v("")).toBeNull());
});

describe("phone", () => {
  const v = phone();
  it("passes for 05X format", () => expect(v("0541234567")).toBeNull());
  it("passes for +972 format", () => expect(v("+972541234567")).toBeNull());
  it("fails for invalid phone", () => expect(v("123456")).not.toBeNull());
  it("passes for blank (use required for that)", () => expect(v("")).toBeNull());
  it("ignores spaces and dashes", () => expect(v("054-123-4567")).toBeNull());
});

describe("oneOf", () => {
  const v = oneOf(["confirmed", "pending", "declined"]);
  it("passes for valid value", () => expect(v("confirmed")).toBeNull());
  it("fails for unknown value", () => expect(v("maybe")).not.toBeNull());
});

describe("validate", () => {
  const schema = {
    name: [required(), maxLength(50)],
    count: [required(), min(1), max(500)],
  };

  it("returns empty object for valid data", () => {
    const result = validate({ name: "Alice", count: 2 }, schema);
    expect(result).toEqual({});
  });

  it("returns errors for invalid data", () => {
    const result = validate({ name: "", count: 0 }, schema);
    expect(result.name).toBeDefined();
    expect(result.count).toBeDefined();
  });

  it("collects all errors for a field", () => {
    const result = validate({ name: "" }, { name: [required(), minLength(2)] });
    expect(result.name).toHaveLength(2);
  });

  it("only validates schema fields (ignores extra keys)", () => {
    const result = validate({ name: "Alice", extra: "ignored" }, schema);
    expect("extra" in result).toBe(false);
  });
});

describe("isValid", () => {
  it("returns true when no errors", () => expect(isValid({})).toBe(true));
  it("returns false when errors exist", () => expect(isValid({ name: ["Required"] })).toBe(false));
});
