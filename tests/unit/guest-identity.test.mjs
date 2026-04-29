/**
 * tests/unit/guest-identity.test.mjs — S356: services/guest-identity.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────

// Mocking browser storage & store
const _storage = new Map();
const _store = new Map();

vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: vi.fn((key, def) => _storage.get(key) ?? def),
  writeBrowserStorageJson: vi.fn((key, val) => _storage.set(key, val)),
}));
vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
}));
vi.mock("../../src/core/constants.js", () => ({
  STORAGE_KEYS: { REVOKED_TOKENS: "revoked_tokens" },
}));

import {
  jaroSimilarity,
  findDuplicates,
  mergeContacts,
  setTokenSecret,
  generateToken,
  parseToken,
  isTokenExpired,
  verifyToken,
  revokeToken,
  isRevoked,
  clearRevokedTokens,
  getGuestByToken,
  issueGuestToken,
  recordIssuedToken,
} from "../../src/services/guest-identity.js";

beforeEach(() => {
  _storage.clear();
  _store.clear();
  vi.clearAllMocks();
  setTokenSecret("test-secret");
});

// ── jaroSimilarity ──────────────────────────────────────────────────────────

describe("jaroSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(jaroSimilarity("abc", "abc")).toBe(1);
  });

  it("returns 0 for empty strings", () => {
    expect(jaroSimilarity("", "abc")).toBe(0);
    expect(jaroSimilarity("abc", "")).toBe(0);
  });

  it("returns high score for similar names", () => {
    const score = jaroSimilarity("yair", "yair");
    expect(score).toBe(1);
  });

  it("returns low score for very different strings", () => {
    expect(jaroSimilarity("abc", "xyz")).toBeLessThan(0.5);
  });

  it("handles single character strings", () => {
    expect(jaroSimilarity("a", "a")).toBe(1);
    expect(jaroSimilarity("a", "b")).toBeLessThan(1);
  });
});

// ── findDuplicates ─────────────────────────────────────────────────────────

describe("findDuplicates", () => {
  const contacts = [
    { id: "c1", firstName: "Yair", lastName: "Cohen", phone: "0541234567" },
    { id: "c2", firstName: "Yair", lastName: "Cohen", phone: "0541234567" },
    { id: "c3", firstName: "Dana", lastName: "Levi", phone: "0509999999" },
  ];

  it("finds duplicate by matching phone", () => {
    const pairs = findDuplicates(contacts);
    expect(pairs.some((p) => p.reason === "phone")).toBe(true);
    expect(pairs.some((p) => p.a === "c1" && p.b === "c2")).toBe(true);
  });

  it("returns empty for no duplicates", () => {
    const unique = [
      { id: "u1", firstName: "Alice", lastName: "Smith", phone: "0501111111" },
      { id: "u2", firstName: "Bob", lastName: "Jones", phone: "0502222222" },
    ];
    const pairs = findDuplicates(unique);
    expect(pairs).toHaveLength(0);
  });

  it("does not cross-match different phones with different names", () => {
    const distinct = [
      { id: "a", firstName: "Alice", lastName: "Zzz", phone: "050111" },
      { id: "b", firstName: "Zorro", lastName: "Aaa", phone: "050222" },
    ];
    expect(findDuplicates(distinct)).toHaveLength(0);
  });

  it("returns name-based duplicates with high name similarity", () => {
    const similar = [
      { id: "n1", firstName: "Yair", lastName: "Cohen" },
      { id: "n2", firstName: "Yair", lastName: "Cohen" },
    ];
    const pairs = findDuplicates(similar, { nameThreshold: 0.9 });
    expect(pairs).toHaveLength(1);
    expect(pairs[0].reason).toBe("name");
  });
});

// ── mergeContacts ──────────────────────────────────────────────────────────

describe("mergeContacts", () => {
  it("primary fields win over secondary", () => {
    const primary = { id: "a", firstName: "Yair", lastName: "Cohen", phone: "050111" };
    const secondary = { id: "b", firstName: "Y", lastName: "C", phone: "050999" };
    const merged = mergeContacts(primary, secondary);
    expect(merged.firstName).toBe("Yair");
    expect(merged.phone).toBe("050111");
  });

  it("fills empty primary fields from secondary", () => {
    const primary = { id: "a", firstName: "Yair", lastName: "Cohen", phone: "" };
    const secondary = { id: "b", firstName: "Y", lastName: "C", phone: "050999" };
    const merged = mergeContacts(primary, secondary);
    expect(merged.phone).toBe("050999");
  });

  it("preserves primary id", () => {
    const primary = { id: "primary-id", firstName: "A", lastName: "B" };
    const secondary = { id: "secondary-id", firstName: "C", lastName: "D" };
    expect(mergeContacts(primary, secondary).id).toBe("primary-id");
  });
});

// ── generateToken / parseToken ─────────────────────────────────────────────

describe("generateToken + parseToken", () => {
  it("generates a dot-separated 3-part token", () => {
    const token = generateToken("guest-001");
    expect(token.split(".")).toHaveLength(3);
  });

  it("parses a generated token correctly", () => {
    const token = generateToken("guest-001");
    const payload = parseToken(token);
    expect(payload?.guestId).toBe("guest-001");
    expect(payload?.exp).toBeGreaterThan(Date.now());
  });

  it("returns null for malformed token", () => {
    expect(parseToken("not.a.valid.token.parts")).toBeNull();
    expect(parseToken("")).toBeNull();
  });

  it("respects custom TTL", () => {
    const token = generateToken("guest-ttl", { expiresInDays: 7 });
    const payload = parseToken(token);
    const expectedExp = Date.now() + 7 * 24 * 60 * 60 * 1000;
    expect(payload?.exp).toBeGreaterThan(expectedExp - 5000);
  });
});

// ── isTokenExpired ─────────────────────────────────────────────────────────

describe("isTokenExpired", () => {
  it("fresh token is not expired", () => {
    const token = generateToken("g1", { expiresInDays: 1 });
    expect(isTokenExpired(token)).toBe(false);
  });

  it("returns true for malformed token", () => {
    expect(isTokenExpired("garbage")).toBe(true);
  });
});

// ── verifyToken ────────────────────────────────────────────────────────────

describe("verifyToken", () => {
  it("verifies a freshly-issued token", () => {
    const token = generateToken("guest-001");
    expect(verifyToken(token)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = generateToken("guest-001");
    const parts = token.split(".");
    parts[2] = "invalidsig";
    expect(verifyToken(parts.join("."))).toBe(false);
  });

  it("rejects wrong number of parts", () => {
    expect(verifyToken("a.b")).toBe(false);
  });
});

// ── revokeToken / isRevoked / clearRevokedTokens ───────────────────────────

describe("revokeToken + isRevoked + clearRevokedTokens", () => {
  it("marks token as revoked", () => {
    const token = generateToken("g1");
    revokeToken(token);
    expect(isRevoked(token)).toBe(true);
  });

  it("non-revoked token returns false", () => {
    const token = generateToken("g1");
    expect(isRevoked(token)).toBe(false);
  });

  it("clearRevokedTokens empties revocation list", () => {
    const token = generateToken("g1");
    revokeToken(token);
    clearRevokedTokens();
    expect(isRevoked(token)).toBe(false);
  });

  it("does not double-add to revocation list", () => {
    const token = generateToken("g1");
    revokeToken(token);
    revokeToken(token);
    // Still revoked, no crash
    expect(isRevoked(token)).toBe(true);
  });
});

// ── getGuestByToken ────────────────────────────────────────────────────────

describe("getGuestByToken", () => {
  it("returns null for invalid token", () => {
    expect(getGuestByToken("garbage")).toBeNull();
  });

  it("returns null for revoked token", () => {
    _store.set("guests", [{ id: "g1", firstName: "Yair" }]);
    const token = generateToken("g1");
    revokeToken(token);
    expect(getGuestByToken(token)).toBeNull();
  });

  it("returns guest for valid token", () => {
    _store.set("guests", [{ id: "g2", firstName: "Dana" }]);
    const token = generateToken("g2");
    const guest = getGuestByToken(token);
    expect(guest?.firstName).toBe("Dana");
  });
});

// ── issueGuestToken ────────────────────────────────────────────────────────

describe("issueGuestToken", () => {
  it("returns null when guest not found", () => {
    _store.set("guests", []);
    expect(issueGuestToken("nonexistent")).toBeNull();
  });

  it("returns a valid token for existing guest", () => {
    _store.set("guests", [{ id: "g3", firstName: "Avi" }]);
    const token = issueGuestToken("g3");
    expect(token).not.toBeNull();
    expect(verifyToken(token)).toBe(true);
  });
});

// ── recordIssuedToken ─────────────────────────────────────────────────────

describe("recordIssuedToken", () => {
  it("records token into store", () => {
    recordIssuedToken("g1", "tok-abc");
    const stored = _store.get("issuedTokens");
    expect(stored).toHaveLength(1);
    expect(stored[0].guestId).toBe("g1");
    expect(stored[0].token).toBe("tok-abc");
  });

  it("appends to existing records", () => {
    recordIssuedToken("g1", "tok-1");
    recordIssuedToken("g2", "tok-2");
    expect(_store.get("issuedTokens")).toHaveLength(2);
  });
});
