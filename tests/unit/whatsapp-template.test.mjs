/**
 * tests/unit/whatsapp-template.test.mjs — WhatsApp message template engine (Sprint 53)
 */
import { describe, it, expect } from "vitest";
import {
  WA_BASE_URL,
  WA_SOFT_LIMIT,
  buildWaInvitationText,
  buildWaRsvpConfirmText,
  buildWaRsvpDeclineText,
  buildWaReminderText,
  buildWaDayOfText,
  buildWaLink,
  buildWaInvitationLink,
  buildWaBulkMessages,
  isOverLimit,
  truncateWaMessage,
} from "../../src/utils/whatsapp-template.js";

// ── constants ──────────────────────────────────────────────────────────────

describe("WA_BASE_URL", () => {
  it("is the wa.me base URL", () => {
    expect(WA_BASE_URL).toBe("https://wa.me/");
  });
});

describe("WA_SOFT_LIMIT", () => {
  it("is a positive integer", () => {
    expect(WA_SOFT_LIMIT).toBeGreaterThan(0);
  });
});

// ── buildWaInvitationText ──────────────────────────────────────────────────

describe("buildWaInvitationText()", () => {
  it("includes guest name in greeting", () => {
    const text = buildWaInvitationText({ name: "David" }, {});
    expect(text).toContain("David");
  });

  it("includes couple name when provided", () => {
    const text = buildWaInvitationText({}, { coupleName: "Yael & Roi" });
    expect(text).toContain("Yael & Roi");
  });

  it("includes date when provided", () => {
    const text = buildWaInvitationText({}, { date: "15.08.2025" });
    expect(text).toContain("15.08.2025");
  });

  it("includes venue when provided", () => {
    const text = buildWaInvitationText({}, { venue: "Tel Aviv Garden" });
    expect(text).toContain("Tel Aviv Garden");
  });

  it("includes rsvpUrl when provided", () => {
    const text = buildWaInvitationText(
      {},
      { rsvpUrl: "https://example.com/rsvp" },
    );
    expect(text).toContain("https://example.com/rsvp");
  });

  it("uses fallback greeting when name is missing", () => {
    const text = buildWaInvitationText({}, {});
    expect(text).toContain("שלום,");
  });

  it("omits date line when date not provided", () => {
    const text = buildWaInvitationText({}, {});
    expect(text).not.toContain("תאריך:");
  });

  it("returns a string", () => {
    expect(
      typeof buildWaInvitationText({ name: "Miri" }, { coupleName: "A & B" }),
    ).toBe("string");
  });
});

// ── buildWaRsvpConfirmText ─────────────────────────────────────────────────

describe("buildWaRsvpConfirmText()", () => {
  it("includes guest name", () => {
    const text = buildWaRsvpConfirmText({ name: "Sara" });
    expect(text).toContain("Sara");
  });

  it("includes party size > 1 in message", () => {
    const text = buildWaRsvpConfirmText({ name: "Lior", partySize: 3 });
    expect(text).toContain("3");
  });

  it("omits party size note when partySize is 1", () => {
    const text = buildWaRsvpConfirmText({ name: "Noa", partySize: 1 });
    expect(text).not.toContain(" ל-1 ");
  });

  it("contains a positive acknowledgement", () => {
    const text = buildWaRsvpConfirmText({ name: "Dan" });
    expect(text).toContain("תודה");
  });
});

// ── buildWaRsvpDeclineText ────────────────────────────────────────────────

describe("buildWaRsvpDeclineText()", () => {
  it("includes guest name", () => {
    const text = buildWaRsvpDeclineText({ name: "Avi" });
    expect(text).toContain("Avi");
  });

  it("contains a polite acknowledgement", () => {
    const text = buildWaRsvpDeclineText({ name: "Michal" });
    expect(text).toContain("תודה");
  });

  it("returns a string", () => {
    expect(typeof buildWaRsvpDeclineText({ name: "Guy" })).toBe("string");
  });
});

// ── buildWaReminderText ────────────────────────────────────────────────────

describe("buildWaReminderText()", () => {
  it("includes days remaining in message", () => {
    const text = buildWaReminderText({ name: "Tal" }, 5);
    expect(text).toContain("5");
  });

  it('uses "יום אחד" for daysLeft=1', () => {
    const text = buildWaReminderText({ name: "Tal" }, 1);
    expect(text).toContain("יום אחד");
  });

  it("includes rsvpUrl when provided in opts", () => {
    const text = buildWaReminderText({ name: "Tal" }, 3, {
      rsvpUrl: "https://x.com/rsvp",
    });
    expect(text).toContain("https://x.com/rsvp");
  });

  it("does not include rsvpUrl line when omitted", () => {
    const text = buildWaReminderText({ name: "Tal" }, 3, {});
    expect(text).not.toContain("https://");
  });
});

// ── buildWaDayOfText ──────────────────────────────────────────────────────

describe("buildWaDayOfText()", () => {
  it("includes event time when provided", () => {
    const text = buildWaDayOfText({ name: "Ron" }, { time: "19:00" });
    expect(text).toContain("19:00");
  });

  it("includes venue when provided", () => {
    const text = buildWaDayOfText({ name: "Ron" }, { venue: "Haifa Hall" });
    expect(text).toContain("Haifa Hall");
  });

  it("includes parking info when provided", () => {
    const text = buildWaDayOfText(
      { name: "Ron" },
      { parkingInfo: "Free parking on site" },
    );
    expect(text).toContain("Free parking on site");
  });

  it("omits parking line when not provided", () => {
    const text = buildWaDayOfText({ name: "Ron" }, {});
    expect(text).not.toContain("חניה:");
  });
});

// ── buildWaLink ────────────────────────────────────────────────────────────

describe("buildWaLink()", () => {
  it("builds base link without text", () => {
    expect(buildWaLink("972541234567")).toBe("https://wa.me/972541234567");
  });

  it("appends encoded text query param", () => {
    const link = buildWaLink("972541234567", "Hello World");
    expect(link).toContain("?text=Hello%20World");
  });

  it("encodes special characters in text", () => {
    const link = buildWaLink("972541234567", "a & b");
    expect(link).toContain("a%20%26%20b");
  });

  it("handles Hebrew text encoding", () => {
    const link = buildWaLink("972541234567", "שלום");
    expect(link).toContain("?text=");
    expect(link).toContain("%D7");
  });
});

// ── buildWaInvitationLink ─────────────────────────────────────────────────

describe("buildWaInvitationLink()", () => {
  it("returns a wa.me URL", () => {
    const link = buildWaInvitationLink(
      "972541234567",
      { name: "Tal" },
      { coupleName: "X & Y" },
    );
    expect(link).toMatch(/^https:\/\/wa\.me\/972541234567\?text=/);
  });

  it("link contains encoded guest name", () => {
    const link = buildWaInvitationLink("972541234567", { name: "Tal" }, {});
    expect(link).toContain("Tal");
  });
});

// ── buildWaBulkMessages ────────────────────────────────────────────────────

describe("buildWaBulkMessages()", () => {
  const guests = [
    { name: "Alice", phone: "972541110001" },
    { name: "Bob", phone: "972541110002", partySize: 2 },
    { name: "NoPhone" },
  ];

  it("returns messages array and skipped array", () => {
    const { messages, skipped } = buildWaBulkMessages(guests, "invitation");
    expect(Array.isArray(messages)).toBe(true);
    expect(Array.isArray(skipped)).toBe(true);
  });

  it("skips guests without phone", () => {
    const { skipped } = buildWaBulkMessages(guests, "invitation");
    expect(skipped).toHaveLength(1);
    expect(skipped[0].name).toBe("NoPhone");
  });

  it("creates one message per guest with phone", () => {
    const { messages } = buildWaBulkMessages(guests, "invitation");
    expect(messages).toHaveLength(2);
  });

  it("each message has phone, text, and link fields", () => {
    const { messages } = buildWaBulkMessages(guests, "confirm");
    for (const m of messages) {
      expect(m).toHaveProperty("phone");
      expect(m).toHaveProperty("text");
      expect(m).toHaveProperty("link");
    }
  });

  it('handles "confirm" type', () => {
    const { messages } = buildWaBulkMessages(guests, "confirm");
    expect(messages[0].text).toContain("תודה");
  });

  it('handles "decline" type', () => {
    const { messages } = buildWaBulkMessages(guests, "decline");
    expect(messages[0].text).toContain("תודה");
  });

  it('handles "reminder" type with daysLeft', () => {
    const { messages } = buildWaBulkMessages(guests, "reminder", {
      daysLeft: 3,
    });
    expect(messages[0].text).toContain("3");
  });

  it('handles "dayof" type', () => {
    const { messages } = buildWaBulkMessages(guests, "dayof", {
      eventInfo: { time: "20:00" },
    });
    expect(messages[0].text).toContain("20:00");
  });

  it("skips guests for unknown type", () => {
    const { skipped } = buildWaBulkMessages(guests, "unknown");
    expect(skipped).toHaveLength(3); // 2 with phone + 1 without
  });

  it("link is a valid wa.me URL", () => {
    const { messages } = buildWaBulkMessages(guests, "invitation");
    expect(messages[0].link).toMatch(/^https:\/\/wa\.me\//);
  });
});

// ── isOverLimit ────────────────────────────────────────────────────────────

describe("isOverLimit()", () => {
  it("returns false for short message", () => {
    expect(isOverLimit("hello")).toBe(false);
  });

  it("returns true for message over WA_SOFT_LIMIT", () => {
    const long = "x".repeat(WA_SOFT_LIMIT + 1);
    expect(isOverLimit(long)).toBe(true);
  });

  it("returns false for message exactly at limit", () => {
    const exact = "x".repeat(WA_SOFT_LIMIT);
    expect(isOverLimit(exact)).toBe(false);
  });
});

// ── truncateWaMessage ─────────────────────────────────────────────────────

describe("truncateWaMessage()", () => {
  it("returns original text when under limit", () => {
    expect(truncateWaMessage("short text")).toBe("short text");
  });

  it("truncates and appends ellipsis when over limit", () => {
    const long = "a".repeat(WA_SOFT_LIMIT + 100);
    const result = truncateWaMessage(long);
    expect(result.length).toBe(WA_SOFT_LIMIT);
    expect(result.endsWith("\u2026")).toBe(true);
  });

  it("respects custom limit", () => {
    const result = truncateWaMessage("hello world", 5);
    expect(result).toBe("hell\u2026");
    expect(result.length).toBe(5);
  });
});
