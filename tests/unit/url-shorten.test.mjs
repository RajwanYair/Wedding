import { describe, it, expect } from "vitest";
import {
  fnv1a,
  toBase62,
  shortToken,
  shortUrl,
} from "../../src/utils/url-shorten.js";

describe("url-shorten", () => {
  it("fnv1a is deterministic", () => {
    expect(fnv1a("hello")).toBe(fnv1a("hello"));
  });

  it("fnv1a differs for different input", () => {
    expect(fnv1a("a")).not.toBe(fnv1a("b"));
  });

  it("fnv1a returns 32-bit unsigned int", () => {
    const h = fnv1a("any");
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });

  it("toBase62 zero", () => {
    expect(toBase62(0)).toBe("0");
  });

  it("toBase62 small numbers", () => {
    expect(toBase62(10)).toBe("a");
    expect(toBase62(61)).toBe("Z");
    expect(toBase62(62)).toBe("10");
  });

  it("toBase62 rejects negatives/NaN", () => {
    expect(() => toBase62(-1)).toThrow(RangeError);
    expect(() => toBase62(NaN)).toThrow(RangeError);
  });

  it("shortToken default length 7", () => {
    const t = shortToken("https://example.com/some/path");
    expect(t).toHaveLength(7);
  });

  it("shortToken stable for same input", () => {
    const a = shortToken("https://x.com");
    const b = shortToken("https://x.com");
    expect(a).toBe(b);
  });

  it("shortToken differs for different inputs", () => {
    expect(shortToken("https://a")).not.toBe(shortToken("https://b"));
  });

  it("shortToken salt changes output", () => {
    const a = shortToken("u", { salt: "s1" });
    const b = shortToken("u", { salt: "s2" });
    expect(a).not.toBe(b);
  });

  it("shortToken custom length pads", () => {
    const t = shortToken("u", { length: 10 });
    expect(t).toHaveLength(10);
  });

  it("shortToken throws on empty input", () => {
    expect(() => shortToken("")).toThrow(TypeError);
    expect(() => shortToken(null)).toThrow(TypeError);
  });

  it("shortUrl prepends host", () => {
    const u = shortUrl("https://example.com", "wed.short");
    expect(u.startsWith("https://wed.short/")).toBe(true);
  });

  it("shortUrl strips host scheme/trailing slash", () => {
    const u = shortUrl("https://example.com", "https://wed.short/");
    expect(u.startsWith("https://wed.short/")).toBe(true);
  });

  it("shortUrl throws on missing host", () => {
    expect(() => shortUrl("https://x", "")).toThrow(TypeError);
  });
});
