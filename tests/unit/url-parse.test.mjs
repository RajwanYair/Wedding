import { describe, it, expect } from "vitest";
import {
  parseUrl,
  isUrl,
  isHttpUrl,
  parseQuery,
  buildQuery,
  withQuery,
} from "../../src/utils/url-parse.js";

describe("parseUrl", () => {
  it("returns URL on success", () => {
    expect(parseUrl("https://x.com/p")?.host).toBe("x.com");
  });

  it("returns null on bad input", () => {
    expect(parseUrl("nope")).toBe(null);
    expect(parseUrl("")).toBe(null);
    expect(parseUrl(null)).toBe(null);
  });

  it("supports base URL", () => {
    expect(parseUrl("/x", "https://a.com")?.href).toBe("https://a.com/x");
  });
});

describe("isUrl / isHttpUrl", () => {
  it("isUrl true for valid", () => {
    expect(isUrl("https://x.com")).toBe(true);
    expect(isUrl("ftp://x.com")).toBe(true);
  });

  it("isUrl with protocols filter", () => {
    expect(isUrl("ftp://x.com", { protocols: ["http", "https"] })).toBe(false);
    expect(isUrl("https://x.com", { protocols: ["http", "https"] })).toBe(true);
  });

  it("isHttpUrl filters non-HTTP", () => {
    expect(isHttpUrl("https://x.com")).toBe(true);
    expect(isHttpUrl("ftp://x.com")).toBe(false);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("parseQuery", () => {
  it("parses simple", () => {
    expect(parseQuery("a=1&b=2")).toEqual({ a: "1", b: "2" });
  });

  it("strips leading ?", () => {
    expect(parseQuery("?a=1")).toEqual({ a: "1" });
  });

  it("collapses duplicates to array", () => {
    expect(parseQuery("a=1&a=2&a=3")).toEqual({ a: ["1", "2", "3"] });
  });

  it("empty input → {}", () => {
    expect(parseQuery("")).toEqual({});
  });
});

describe("buildQuery", () => {
  it("builds simple", () => {
    expect(buildQuery({ a: 1, b: "x" })).toBe("a=1&b=x");
  });

  it("skips null / undefined", () => {
    expect(buildQuery({ a: 1, b: null, c: undefined })).toBe("a=1");
  });

  it("repeats arrays", () => {
    expect(buildQuery({ a: [1, 2, 3] })).toBe("a=1&a=2&a=3");
  });

  it("encodes special chars", () => {
    expect(buildQuery({ q: "hello world" })).toBe("q=hello+world");
  });
});

describe("withQuery", () => {
  it("adds and overwrites params", () => {
    expect(withQuery("https://x.com/?a=1", { a: 2, b: 3 })).toBe(
      "https://x.com/?a=2&b=3",
    );
  });

  it("removes when value is null", () => {
    expect(withQuery("https://x.com/?a=1&b=2", { a: null })).toBe(
      "https://x.com/?b=2",
    );
  });

  it("returns original on parse failure", () => {
    expect(withQuery("nope", { a: 1 })).toBe("nope");
  });
});
