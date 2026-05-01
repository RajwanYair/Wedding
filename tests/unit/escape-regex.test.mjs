import { describe, it, expect } from "vitest";
import {
  escapeRegex,
  literalRegex,
} from "../../src/utils/escape-regex.js";

describe("escapeRegex", () => {
  it("escapes all ECMAScript metacharacters", () => {
    expect(escapeRegex(".*+?^${}()|[]\\")).toBe(
      "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\",
    );
  });

  it("escapes hyphen and slash", () => {
    expect(escapeRegex("a-b/c")).toBe("a\\-b\\/c");
  });

  it("plain text untouched", () => {
    expect(escapeRegex("hello world")).toBe("hello world");
  });

  it("non-string returns empty", () => {
    expect(escapeRegex(123)).toBe("");
    expect(escapeRegex(null)).toBe("");
    expect(escapeRegex(undefined)).toBe("");
  });

  it("escaped output compiles", () => {
    const s = "a+b*c";
    const re = new RegExp(escapeRegex(s));
    expect(re.test("a+b*c")).toBe(true);
    expect(re.test("aabbbc")).toBe(false);
  });

  it("safe inside character class", () => {
    const re = new RegExp(`[${escapeRegex("a-c]")}]`);
    expect(re.test("a")).toBe(true);
    expect(re.test("-")).toBe(true);
    expect(re.test("]")).toBe(true);
    expect(re.test("b")).toBe(false);
  });
});

describe("literalRegex", () => {
  it("matches literal text case-insensitive by default", () => {
    const re = literalRegex("Café");
    expect(re.test("Some café here")).toBe(true);
  });

  it("respects flags", () => {
    const re = literalRegex("café", "");
    expect(re.test("CAFÉ")).toBe(false);
    expect(re.test("café")).toBe(true);
  });

  it("treats input as literal even with metachars", () => {
    const re = literalRegex(".*", "");
    expect(re.test("hello")).toBe(false);
    expect(re.test("a.*b")).toBe(true);
  });
});
