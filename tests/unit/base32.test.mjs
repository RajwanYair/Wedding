import { describe, it, expect } from "vitest";
import { encodeBase32, decodeBase32 } from "../../src/utils/base32.js";

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);

describe("base32", () => {
  it("encodes RFC-4648 vectors", () => {
    expect(encodeBase32(enc(""))).toBe("");
    expect(encodeBase32(enc("f"))).toBe("MY======");
    expect(encodeBase32(enc("fo"))).toBe("MZXQ====");
    expect(encodeBase32(enc("foo"))).toBe("MZXW6===");
    expect(encodeBase32(enc("foob"))).toBe("MZXW6YQ=");
    expect(encodeBase32(enc("fooba"))).toBe("MZXW6YTB");
    expect(encodeBase32(enc("foobar"))).toBe("MZXW6YTBOI======");
  });

  it("decodes RFC-4648 vectors", () => {
    expect(dec(decodeBase32("MY======"))).toBe("f");
    expect(dec(decodeBase32("MZXW6YTBOI======"))).toBe("foobar");
  });

  it("encode without padding", () => {
    expect(encodeBase32(enc("foo"), { padding: false })).toBe("MZXW6");
  });

  it("decode tolerates missing padding", () => {
    expect(dec(decodeBase32("MZXW6"))).toBe("foo");
  });

  it("decode is case insensitive", () => {
    expect(dec(decodeBase32("mzxw6ytb"))).toBe("fooba");
  });

  it("empty input round-trips", () => {
    expect(decodeBase32("")?.length).toBe(0);
  });

  it("invalid characters → null", () => {
    expect(decodeBase32("!!")).toBe(null);
  });

  it("non-string → null", () => {
    expect(decodeBase32(/** @type {any} */ (null))).toBe(null);
  });

  it("round-trip random bytes", () => {
    const buf = new Uint8Array(64);
    for (let i = 0; i < buf.length; i += 1) buf[i] = (i * 7) & 0xff;
    const round = decodeBase32(encodeBase32(buf));
    expect(Array.from(round ?? [])).toEqual(Array.from(buf));
  });

  it("accepts ArrayBuffer input", () => {
    const buf = enc("foo").buffer;
    expect(encodeBase32(buf)).toBe("MZXW6===");
  });
});
