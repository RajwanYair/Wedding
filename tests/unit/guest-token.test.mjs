/**
 * tests/unit/guest-token.test.mjs — Unit tests for guest token service (Sprint 36)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

// Provide in-memory localStorage for the test environment
let _lsStore = new Map();
vi.stubGlobal("localStorage", {
  getItem: (k) => _lsStore.get(k) ?? null,
  setItem: (k, v) => _lsStore.set(k, v),
  removeItem: (k) => _lsStore.delete(k),
  clear: () => _lsStore.clear(),
});

import { initStore, storeSet } from "../../src/core/store.js";
const {
  generateToken,
  parseToken,
  isTokenExpired,
  verifyToken,
  revokeToken,
  isRevoked,
  clearRevokedTokens,
  getGuestByToken,
  issueGuestToken,
  setTokenSecret,
} = await import("../../src/services/guest-identity.js");

import { makeGuest } from "./helpers.js";

const GUEST_ID = "g-token-test";

function freshGuest(overrides = {}) {
  return makeGuest({ id: GUEST_ID, firstName: "Token", lastName: "User", ...overrides });
}

function seedStore(guests = []) {
  initStore({
    guests: { value: guests },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    issuedTokens: { value: [] },
    weddingInfo: { value: {} },
  });
}

beforeEach(() => {
  _lsStore.clear();
  clearRevokedTokens();
  setTokenSecret("test-secret");
  seedStore([freshGuest()]);
});

// ── generateToken ──────────────────────────────────────────────────────────

describe("generateToken", () => {
  it("returns a dot-separated string with 3 parts", () => {
    const t = generateToken(GUEST_ID);
    expect(t.split(".")).toHaveLength(3);
  });

  it("encodes guestId in payload", () => {
    const t = generateToken(GUEST_ID);
    const payload = parseToken(t);
    expect(payload?.guestId).toBe(GUEST_ID);
  });

  it("sets expiry ~24h in the future by default", () => {
    const before = Date.now();
    const t = generateToken(GUEST_ID);
    const payload = parseToken(t);
    const diff = (payload?.exp ?? 0) - before;
    expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(25 * 60 * 60 * 1000);
  });

  it("respects custom expiresInDays", () => {
    const t = generateToken(GUEST_ID, { expiresInDays: 7 });
    const payload = parseToken(t);
    const diff = (payload?.exp ?? 0) - Date.now();
    expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
  });
});

// ── parseToken ─────────────────────────────────────────────────────────────

describe("parseToken", () => {
  it("returns null for malformed token", () => {
    expect(parseToken("not.a.valid.token.string")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseToken("")).toBeNull();
  });

  it("parses a valid token correctly", () => {
    const t = generateToken("g99");
    const p = parseToken(t);
    expect(p?.guestId).toBe("g99");
    expect(typeof p?.exp).toBe("number");
  });
});

// ── isTokenExpired ─────────────────────────────────────────────────────────

describe("isTokenExpired", () => {
  it("returns false for a freshly generated token", () => {
    expect(isTokenExpired(generateToken(GUEST_ID))).toBe(false);
  });

  it("returns true for a token with past expiry", () => {
    const t = generateToken(GUEST_ID, { expiresInDays: -1 });
    expect(isTokenExpired(t)).toBe(true);
  });

  it("returns true for malformed token", () => {
    expect(isTokenExpired("bad")).toBe(true);
  });
});

// ── verifyToken ────────────────────────────────────────────────────────────

describe("verifyToken", () => {
  it("returns true for a valid token with correct secret", () => {
    expect(verifyToken(generateToken(GUEST_ID))).toBe(true);
  });

  it("returns false when signature is tampered", () => {
    const t = generateToken(GUEST_ID);
    const parts = t.split(".");
    const tampered = `${parts[0]}.${parts[1]}.invalidsig`;
    expect(verifyToken(tampered)).toBe(false);
  });

  it("returns false for expired token", () => {
    const t = generateToken(GUEST_ID, { expiresInDays: -1 });
    expect(verifyToken(t)).toBe(false);
  });

  it("returns false when secret changes", () => {
    const t = generateToken(GUEST_ID);
    setTokenSecret("different-secret");
    expect(verifyToken(t)).toBe(false);
    setTokenSecret("test-secret");
  });
});

// ── revokeToken / isRevoked ────────────────────────────────────────────────

describe("revokeToken + isRevoked", () => {
  it("revoked token is recognised as revoked", () => {
    const t = generateToken(GUEST_ID);
    revokeToken(t);
    expect(isRevoked(t)).toBe(true);
  });

  it("non-revoked token is not revoked", () => {
    const t = generateToken(GUEST_ID);
    expect(isRevoked(t)).toBe(false);
  });

  it("clearRevokedTokens removes all revocations", () => {
    const t = generateToken(GUEST_ID);
    revokeToken(t);
    clearRevokedTokens();
    expect(isRevoked(t)).toBe(false);
  });
});

// ── getGuestByToken ────────────────────────────────────────────────────────

describe("getGuestByToken", () => {
  it("returns the guest for a valid token", () => {
    const t = generateToken(GUEST_ID);
    const g = getGuestByToken(t);
    expect(g?.id).toBe(GUEST_ID);
  });

  it("returns null for expired token", () => {
    const t = generateToken(GUEST_ID, { expiresInDays: -1 });
    expect(getGuestByToken(t)).toBeNull();
  });

  it("returns null for revoked token", () => {
    const t = generateToken(GUEST_ID);
    revokeToken(t);
    expect(getGuestByToken(t)).toBeNull();
  });

  it("returns null for unknown guest id", () => {
    const t = generateToken("non-existent-id");
    expect(getGuestByToken(t)).toBeNull();
  });
});

// ── issueGuestToken ────────────────────────────────────────────────────────

describe("issueGuestToken", () => {
  it("returns a token string for known guest", () => {
    const t = issueGuestToken(GUEST_ID);
    expect(typeof t).toBe("string");
    expect(t?.split(".")).toHaveLength(3);
  });

  it("returns null for unknown guest id", () => {
    expect(issueGuestToken("no-such-id")).toBeNull();
  });

  it("issued token can be used with getGuestByToken", () => {
    const t = issueGuestToken(GUEST_ID) ?? "";
    expect(getGuestByToken(t)?.id).toBe(GUEST_ID);
  });
});
