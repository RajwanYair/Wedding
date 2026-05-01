import { describe, it, expect } from "vitest";
import {
  decodeJwt,
  decodeJwtPayload,
  isJwtExpired,
} from "../../src/utils/jwt-decode.js";

/**
 * @param {Record<string, unknown>} obj
 * @returns {string}
 */
function b64u(obj) {
  const json = JSON.stringify(obj);
  const b64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * @param {Record<string, unknown>} header
 * @param {Record<string, unknown>} payload
 */
function makeJwt(header, payload) {
  return `${b64u(header)}.${b64u(payload)}.sig`;
}

describe("decodeJwt", () => {
  it("splits header/payload/signature", () => {
    const t = makeJwt({ alg: "HS256" }, { sub: "u1", exp: 100 });
    const r = decodeJwt(t);
    expect(r.header).toEqual({ alg: "HS256" });
    expect(r.payload).toEqual({ sub: "u1", exp: 100 });
    expect(r.signature).toBe("sig");
  });

  it("decodes UTF-8 payload", () => {
    const t = makeJwt({ alg: "none" }, { name: "יאיר" });
    expect(decodeJwt(t).payload).toEqual({ name: "יאיר" });
  });

  it("throws on non-string", () => {
    expect(() => decodeJwt(/** @type {any} */ (null))).toThrow(TypeError);
  });

  it("throws on bad segment count", () => {
    expect(() => decodeJwt("a.b")).toThrow(SyntaxError);
  });

  it("throws on bad base64", () => {
    expect(() => decodeJwt("###.###.sig")).toThrow();
  });

  it("throws on bad JSON", () => {
    const bad = `${b64u({ alg: "HS256" })}.bm90anNvbg.sig`;
    expect(() => decodeJwt(bad)).toThrow(SyntaxError);
  });
});

describe("decodeJwtPayload", () => {
  it("returns payload only", () => {
    const t = makeJwt({ alg: "HS256" }, { sub: "u1" });
    expect(decodeJwtPayload(t)).toEqual({ sub: "u1" });
  });
});

describe("isJwtExpired", () => {
  it("false when no exp", () => {
    expect(isJwtExpired(makeJwt({}, { sub: "u" }))).toBe(false);
  });

  it("true when exp in past", () => {
    expect(isJwtExpired(makeJwt({}, { exp: 1 }), { now: 100 })).toBe(true);
  });

  it("false when exp in future", () => {
    expect(isJwtExpired(makeJwt({}, { exp: 1000 }), { now: 100 })).toBe(false);
  });

  it("respects leeway", () => {
    expect(
      isJwtExpired(makeJwt({}, { exp: 100 }), { now: 105, leewaySec: 10 }),
    ).toBe(false);
  });
});
