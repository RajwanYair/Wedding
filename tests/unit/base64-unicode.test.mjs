import { describe, it, expect } from "vitest";
import {
  encode,
  decode,
  encodeUrl,
  decodeUrl,
} from "../../src/utils/base64-unicode.js";

describe("base64-unicode", () => {
  it("round-trips ASCII", () => {
    expect(decode(encode("hello"))).toBe("hello");
  });

  it("round-trips Hebrew", () => {
    expect(decode(encode("שלום עולם"))).toBe("שלום עולם");
  });

  it("round-trips emoji", () => {
    expect(decode(encode("👰🤵🎉"))).toBe("👰🤵🎉");
  });

  it("encodes empty string to empty", () => {
    expect(encode("")).toBe("");
    expect(decode("")).toBe("");
  });

  it("matches standard base64 for ASCII", () => {
    expect(encode("Man")).toBe("TWFu");
  });

  it("non-string input is treated as empty", () => {
    expect(encode(/** @type {any} */ (null))).toBe("");
  });

  it("encodeUrl strips padding and replaces chars", () => {
    const std = encode("foo>?");
    const url = encodeUrl("foo>?");
    expect(url).not.toContain("=");
    expect(url).not.toContain("+");
    expect(url).not.toContain("/");
    expect(std).not.toBe(url);
  });

  it("encodeUrl/decodeUrl round-trip Hebrew", () => {
    expect(decodeUrl(encodeUrl("חתונה"))).toBe("חתונה");
  });

  it("decodeUrl handles missing padding", () => {
    const url = encodeUrl("ab");
    expect(decodeUrl(url)).toBe("ab");
  });

  it("decodeUrl throws on impossible length", () => {
    expect(() => decodeUrl("abcde")).toThrow();
  });

  it("decodeUrl on empty string returns empty", () => {
    expect(decodeUrl("")).toBe("");
  });
});
