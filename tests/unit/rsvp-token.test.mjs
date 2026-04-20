/**
 * @vitest-environment happy-dom
 * tests/unit/rsvp-token.test.mjs — Sprint 45: Per-guest RSVP token builder
 */

import { describe, it, expect } from "vitest";
import {
  generateToken,
  generateSignedToken,
  verifySignedToken,
  buildRsvpLink,
  parseRsvpLink,
  generateBulkTokens,
  generateBulkSignedTokens,
} from "../../src/utils/rsvp-token.js";

// ---------------------------------------------------------------------------
// generateToken
// ---------------------------------------------------------------------------

describe("generateToken", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateToken()).toBe("string");
    expect(generateToken().length).toBeGreaterThan(0);
  });

  it("returns URL-safe characters only", () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns unique tokens each call", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateToken()));
    expect(tokens.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// generateSignedToken / verifySignedToken
// ---------------------------------------------------------------------------

describe("generateSignedToken", () => {
  it("returns a token containing a dot separator", async () => {
    const token = await generateSignedToken("g1", "ev1", "secret");
    expect(token).toContain(".");
  });

  it("generates different tokens each call (random part)", async () => {
    const t1 = await generateSignedToken("g1", "ev1", "secret");
    const t2 = await generateSignedToken("g1", "ev1", "secret");
    expect(t1).not.toBe(t2);
  });
});

describe("verifySignedToken", () => {
  it("verifies a valid signed token", async () => {
    const token = await generateSignedToken("g42", "wedding2025", "mysecret");
    const valid = await verifySignedToken(
      token,
      "g42",
      "wedding2025",
      "mysecret",
    );
    expect(valid).toBe(true);
  });

  it("rejects a token for wrong guestId", async () => {
    const token = await generateSignedToken("g1", "ev1", "secret");
    const valid = await verifySignedToken(token, "g2", "ev1", "secret");
    expect(valid).toBe(false);
  });

  it("rejects a tampered token", async () => {
    const token = await generateSignedToken("g1", "ev1", "secret");
    const tampered = `${token.slice(0, -3)}abc`;
    const valid = await verifySignedToken(tampered, "g1", "ev1", "secret");
    expect(valid).toBe(false);
  });

  it("rejects a token with wrong secret", async () => {
    const token = await generateSignedToken("g1", "ev1", "secret");
    const valid = await verifySignedToken(token, "g1", "ev1", "wrong");
    expect(valid).toBe(false);
  });

  it("rejects a string with no dot", async () => {
    const valid = await verifySignedToken("nodothere", "g1", "ev1", "secret");
    expect(valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildRsvpLink / parseRsvpLink
// ---------------------------------------------------------------------------

describe("buildRsvpLink", () => {
  it("appends token as query param", () => {
    const link = buildRsvpLink("https://example.com/rsvp", "abc123");
    expect(link).toContain("t=abc123");
  });

  it("appends guestId when provided", () => {
    const link = buildRsvpLink("https://example.com/rsvp", "tok", "g99");
    expect(link).toContain("g=g99");
  });

  it("returns a valid URL", () => {
    const link = buildRsvpLink("https://example.com/rsvp", "tok");
    expect(() => new URL(link)).not.toThrow();
  });

  it("preserves existing query params", () => {
    const link = buildRsvpLink("https://example.com/rsvp?lang=he", "tok");
    expect(link).toContain("lang=he");
    expect(link).toContain("t=tok");
  });
});

describe("parseRsvpLink", () => {
  it("extracts token and guestId", () => {
    const link = buildRsvpLink("https://example.com/rsvp", "myToken", "g5");
    const { token, guestId } = parseRsvpLink(link);
    expect(token).toBe("myToken");
    expect(guestId).toBe("g5");
  });

  it("returns nulls for invalid URL", () => {
    const { token, guestId } = parseRsvpLink("not-a-url");
    expect(token).toBeNull();
    expect(guestId).toBeNull();
  });

  it("returns null guestId when omitted", () => {
    const link = buildRsvpLink("https://example.com/rsvp", "tok");
    const { guestId } = parseRsvpLink(link);
    expect(guestId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateBulkTokens
// ---------------------------------------------------------------------------

describe("generateBulkTokens", () => {
  it("returns one token per guest", () => {
    const result = generateBulkTokens([{ id: "a" }, { id: "b" }, { id: "c" }]);
    expect(result.length).toBe(3);
    expect(result.map((r) => r.guestId)).toEqual(["a", "b", "c"]);
  });

  it("all tokens are unique", () => {
    const result = generateBulkTokens(
      Array.from({ length: 50 }, (_, i) => ({ id: `g${i}` })),
    );
    const tokens = new Set(result.map((r) => r.token));
    expect(tokens.size).toBe(50);
  });

  it("returns empty array for empty input", () => {
    expect(generateBulkTokens([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// generateBulkSignedTokens
// ---------------------------------------------------------------------------

describe("generateBulkSignedTokens", () => {
  it("returns signed tokens for each guest", async () => {
    const guests = [{ id: "a" }, { id: "b" }];
    const result = await generateBulkSignedTokens(guests, "ev1", "secret");
    expect(result.length).toBe(2);
    for (const { guestId, token } of result) {
      expect(token).toContain(".");
      expect(await verifySignedToken(token, guestId, "ev1", "secret")).toBe(
        true,
      );
    }
  });
});
