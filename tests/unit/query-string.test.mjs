import { describe, it, expect } from "vitest";
import { parse, stringify } from "../../src/utils/query-string.js";

describe("query-string", () => {
  it("parses simple pairs", () => {
    expect(parse("a=1&b=2")).toEqual({ a: "1", b: "2" });
  });

  it("strips leading question mark", () => {
    expect(parse("?a=1")).toEqual({ a: "1" });
  });

  it("repeated keys collect into arrays", () => {
    expect(parse("tag=a&tag=b&tag=c")).toEqual({ tag: ["a", "b", "c"] });
  });

  it("decodes percent-encoded values", () => {
    expect(parse("name=%D7%A8%D7%99%D7%99%D7%9F")).toEqual({ name: "ריין" });
  });

  it("decodes plus as space", () => {
    expect(parse("q=hello+world")).toEqual({ q: "hello world" });
  });

  it("handles missing values", () => {
    expect(parse("flag=&x=1")).toEqual({ flag: "", x: "1" });
  });

  it("handles bare keys without =", () => {
    expect(parse("flag&x=1")).toEqual({ flag: "", x: "1" });
  });

  it("ignores empty pairs", () => {
    expect(parse("&a=1&&b=2&")).toEqual({ a: "1", b: "2" });
  });

  it("handles empty input", () => {
    expect(parse("")).toEqual({});
    expect(parse("?")).toEqual({});
  });

  it("handles malformed encoding", () => {
    expect(parse("x=%E0%A4%A")).toEqual({ x: "%E0%A4%A" });
  });

  it("stringify sorts keys deterministically", () => {
    expect(stringify({ b: 2, a: 1 })).toBe("a=1&b=2");
  });

  it("stringify encodes special chars", () => {
    expect(stringify({ q: "a b&c" })).toBe("q=a%20b%26c");
  });

  it("stringify expands array values", () => {
    expect(stringify({ tag: ["a", "b"] })).toBe("tag=a&tag=b");
  });

  it("stringify skips null/undefined", () => {
    expect(stringify({ a: null, b: undefined, c: 1 })).toBe("c=1");
  });

  it("stringify converts Date and booleans", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    expect(stringify({ when: d, ok: true })).toBe(
      `ok=true&when=${encodeURIComponent(d.toISOString())}`,
    );
  });

  it("stringify on null returns empty", () => {
    expect(stringify(/** @type {any} */ (null))).toBe("");
  });

  it("round-trips simple objects", () => {
    const obj = { a: "1", b: "x y" };
    expect(parse(stringify(obj))).toEqual(obj);
  });
});
