/**
 * tests/unit/message-personalizer.test.mjs — Sprint 37
 *
 * Tests for src/utils/message-personalizer.js —
 *   getAvailableTokens, validateTemplate, personalizeMessage, personalizeBulk
 */

import { describe, it, expect } from "vitest";
import { makeGuest } from "./helpers.js";
import {
  getAvailableTokens,
  validateTemplate,
  personalizeMessage,
  personalizeBulk,
} from "../../src/utils/message-personalizer.js";

// ── getAvailableTokens ─────────────────────────────────────────────────

describe("getAvailableTokens()", () => {
  it("returns a non-empty array", () => {
    expect(getAvailableTokens().length).toBeGreaterThan(0);
  });

  it("includes core tokens: firstName, fullName, rsvpLink", () => {
    const tokens = getAvailableTokens();
    expect(tokens).toContain("firstName");
    expect(tokens).toContain("fullName");
    expect(tokens).toContain("rsvpLink");
  });
});

// ── validateTemplate ───────────────────────────────────────────────────

describe("validateTemplate()", () => {
  it("returns valid=true for a template with only known tokens", () => {
    const r = validateTemplate("Hi {{firstName}}, please RSVP: {{rsvpLink}}");
    expect(r.valid).toBe(true);
    expect(r.unknownTokens).toHaveLength(0);
  });

  it("returns valid=false and lists unknown tokens", () => {
    const r = validateTemplate("Hi {{firstName}} {{unknownToken}}");
    expect(r.valid).toBe(false);
    expect(r.unknownTokens).toContain("unknownToken");
  });

  it("returns valid=true for a template with no tokens", () => {
    expect(validateTemplate("Hello, see you soon!").valid).toBe(true);
  });

  it("deduplicates repeated unknown tokens", () => {
    const r = validateTemplate("{{badToken}} and {{badToken}} again");
    expect(r.unknownTokens).toHaveLength(1);
  });
});

// ── personalizeMessage ─────────────────────────────────────────────────

describe("personalizeMessage()", () => {
  const weddingInfo = {
    rsvpBaseUrl:  "https://example.com/rsvp",
    weddingDate:  "15.08.2025",
    venue:        "Tel Aviv Garden",
    tableName:    "Table 3",
  };

  it("fills firstName token", () => {
    const g = makeGuest({ firstName: "Avi", lastName: "Cohen" });
    const msg = personalizeMessage("Hello {{firstName}}!", g, weddingInfo);
    expect(msg).toBe("Hello Avi!");
  });

  it("fills fullName token", () => {
    const g = makeGuest({ firstName: "Avi", lastName: "Cohen" });
    const msg = personalizeMessage("Dear {{fullName}}", g, weddingInfo);
    expect(msg).toBe("Dear Avi Cohen");
  });

  it("fills rsvpLink with guestId query param", () => {
    const g = makeGuest({ id: "g_abc123" });
    const msg = personalizeMessage("RSVP: {{rsvpLink}}", g, weddingInfo);
    expect(msg).toContain("guestId=g_abc123");
  });

  it("fills weddingDate and venue tokens", () => {
    const g = makeGuest({});
    const msg = personalizeMessage("Date: {{weddingDate}}, Venue: {{venue}}", g, weddingInfo);
    expect(msg).toContain("15.08.2025");
    expect(msg).toContain("Tel Aviv Garden");
  });

  it("fills guestCount token", () => {
    const g = makeGuest({ count: 3 });
    const msg = personalizeMessage("Seats: {{guestCount}}", g, weddingInfo);
    expect(msg).toBe("Seats: 3");
  });

  it("leaves token empty when weddingInfo not provided", () => {
    const g = makeGuest({ firstName: "Avi" });
    const msg = personalizeMessage("Venue: {{venue}}", g);
    expect(msg).toBe("Venue: ");
  });

  it("handles missing guest fields gracefully", () => {
    const msg = personalizeMessage("Hi {{firstName}}", {});
    expect(msg).toBe("Hi ");
  });
});

// ── personalizeBulk ────────────────────────────────────────────────────

describe("personalizeBulk()", () => {
  it("returns one entry per guest", () => {
    const guests = [makeGuest({ firstName: "A" }), makeGuest({ firstName: "B" })];
    const results = personalizeBulk("Hi {{firstName}}", guests);
    expect(results).toHaveLength(2);
    expect(results[0].message).toContain("A");
    expect(results[1].message).toContain("B");
  });

  it("returns empty array for empty guests list", () => {
    expect(personalizeBulk("Hi {{firstName}}", [])).toEqual([]);
  });

  it("includes the original guest object in each result", () => {
    const g = makeGuest({ firstName: "Avi" });
    const [result] = personalizeBulk("Hi {{firstName}}", [g]);
    expect(result.guest).toBe(g);
  });
});
