/**
 * tests/unit/auth-claims.test.mjs — Sprint 81
 */

import { describe, it, expect } from "vitest";
import {
  decodeJwtPayload,
  getClaims,
  getClaim,
  hasRole,
  isEventOwner,
  isTokenExpired,
  getUserId,
} from "../../src/services/auth-claims.js";

// Build a minimal JWT with base64url-encoded payload.
function fakeJwt(payloadObj) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const payload = btoa(JSON.stringify(payloadObj))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${header}.${payload}.FAKESIG`;
}

describe("decodeJwtPayload", () => {
  it("decodes a valid JWT payload", () => {
    const token = fakeJwt({ sub: "u1", role: "admin" });
    const claims = decodeJwtPayload(token);
    expect(claims.sub).toBe("u1");
    expect(claims.role).toBe("admin");
  });

  it("returns {} for empty string", () => {
    expect(decodeJwtPayload("")).toEqual({});
  });

  it("returns {} for malformed token", () => {
    expect(decodeJwtPayload("notajwt")).toEqual({});
  });

  it("returns {} if payload is not valid JSON", () => {
    expect(decodeJwtPayload("header.!!!.sig")).toEqual({});
  });
});

describe("getClaims", () => {
  it("returns claims from session access_token", () => {
    const session = { access_token: fakeJwt({ sub: "u2" }) };
    expect(getClaims(session).sub).toBe("u2");
  });

  it("returns {} for null session", () => {
    expect(getClaims(null)).toEqual({});
  });

  it("returns {} when access_token is missing", () => {
    expect(getClaims({})).toEqual({});
  });
});

describe("getClaim", () => {
  it("reads a named claim", () => {
    const session = { access_token: fakeJwt({ event_id: "evt-1" }) };
    expect(getClaim(session, "event_id")).toBe("evt-1");
  });

  it("returns undefined for missing claim", () => {
    const session = { access_token: fakeJwt({}) };
    expect(getClaim(session, "missing")).toBeUndefined();
  });
});

describe("hasRole", () => {
  it("matches single role claim", () => {
    const s = { access_token: fakeJwt({ role: "admin" }) };
    expect(hasRole(s, "admin")).toBe(true);
    expect(hasRole(s, "guest")).toBe(false);
  });

  it("matches role inside app_roles array", () => {
    const s = { access_token: fakeJwt({ app_roles: ["editor", "viewer"] }) };
    expect(hasRole(s, "editor")).toBe(true);
    expect(hasRole(s, "admin")).toBe(false);
  });

  it("returns false for null session", () => {
    expect(hasRole(null, "admin")).toBe(false);
  });
});

describe("isEventOwner", () => {
  it("returns true when event_id matches", () => {
    const s = { access_token: fakeJwt({ event_id: "evt-42" }) };
    expect(isEventOwner(s, "evt-42")).toBe(true);
  });

  it("returns false when event_id does not match", () => {
    const s = { access_token: fakeJwt({ event_id: "evt-1" }) };
    expect(isEventOwner(s, "evt-99")).toBe(false);
  });
});

describe("isTokenExpired", () => {
  it("returns false for a future exp", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const s = { access_token: fakeJwt({ exp: future }) };
    expect(isTokenExpired(s)).toBe(false);
  });

  it("returns true for a past exp", () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    const s = { access_token: fakeJwt({ exp: past }) };
    expect(isTokenExpired(s)).toBe(true);
  });

  it("returns true for null session", () => {
    expect(isTokenExpired(null)).toBe(true);
  });
});

describe("getUserId", () => {
  it("returns sub claim", () => {
    const s = { access_token: fakeJwt({ sub: "user-abc" }) };
    expect(getUserId(s)).toBe("user-abc");
  });

  it("returns undefined when sub is absent", () => {
    const s = { access_token: fakeJwt({}) };
    expect(getUserId(s)).toBeUndefined();
  });
});
