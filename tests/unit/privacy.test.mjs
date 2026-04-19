/**
 * tests/unit/privacy.test.mjs — Unit tests for privacy admin utilities (Sprint 29)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeGet } from "../../src/core/store.js";
import { makeGuest } from "./helpers.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  PII_FIELDS,
  exportGuestData,
  anonymizeGuest,
  purgeGuestData,
  getDataRetentionReport,
} = await import("../../src/utils/privacy.js");

function seed(guests = [], rsvpLog = []) {
  initStore({
    guests: { value: guests },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    timeline: { value: [] },
    timelineDone: { value: {} },
    rsvp_log: { value: rsvpLog },
    weddingInfo: { value: {} },
  });
}

// ── PII_FIELDS ────────────────────────────────────────────────────────────

describe("PII_FIELDS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(PII_FIELDS)).toBe(true);
    expect(PII_FIELDS.length).toBeGreaterThan(0);
  });

  it("includes firstName, lastName, phone, email", () => {
    expect(PII_FIELDS).toContain("firstName");
    expect(PII_FIELDS).toContain("lastName");
    expect(PII_FIELDS).toContain("phone");
    expect(PII_FIELDS).toContain("email");
  });
});

// ── exportGuestData ────────────────────────────────────────────────────────

describe("exportGuestData", () => {
  beforeEach(() =>
    seed(
      [makeGuest({ id: "g1", phone: "0501111111" })],
      [{ guestId: "g1", event: "rsvp", timestamp: "2024-01-01T00:00:00Z" }],
    ),
  );

  it("returns the guest record", () => {
    const { guest } = exportGuestData("g1");
    expect(guest).not.toBeNull();
    expect(guest.id).toBe("g1");
  });

  it("returns matching rsvp log entries", () => {
    const { rsvpLog } = exportGuestData("g1");
    expect(rsvpLog).toHaveLength(1);
    expect(rsvpLog[0].event).toBe("rsvp");
  });

  it("returns null guest for unknown id", () => {
    const { guest } = exportGuestData("zzz");
    expect(guest).toBeNull();
  });

  it("returns empty rsvpLog when none match", () => {
    const { rsvpLog } = exportGuestData("zzz");
    expect(rsvpLog).toHaveLength(0);
  });
});

// ── anonymizeGuest ────────────────────────────────────────────────────────

describe("anonymizeGuest", () => {
  beforeEach(() =>
    seed([
      makeGuest({
        id: "g1",
        firstName: "Alice",
        lastName: "Smith",
        phone: "0501111111",
        email: "alice@test.com",
        notes: "vip",
        gift: "watch",
      }),
    ]),
  );

  it("returns true for existing guest", () => {
    expect(anonymizeGuest("g1")).toBe(true);
  });

  it("returns false for unknown guest", () => {
    expect(anonymizeGuest("zzz")).toBe(false);
  });

  it("replaces firstName with 'Guest'", () => {
    anonymizeGuest("g1");
    expect(storeGet("guests")[0].firstName).toBe("Guest");
  });

  it("clears lastName, phone, email", () => {
    anonymizeGuest("g1");
    const g = storeGet("guests")[0];
    expect(g.lastName).toBe("");
    expect(g.phone).toBe("");
    expect(g.email).toBe("");
  });

  it("clears notes and gift", () => {
    anonymizeGuest("g1");
    const g = storeGet("guests")[0];
    expect(g.notes).toBe("");
    expect(g.gift).toBe("");
  });

  it("preserves id and status", () => {
    anonymizeGuest("g1");
    const g = storeGet("guests")[0];
    expect(g.id).toBe("g1");
    expect(g.status).toBeTruthy();
  });
});

// ── purgeGuestData ────────────────────────────────────────────────────────

describe("purgeGuestData", () => {
  beforeEach(() => seed([makeGuest({ id: "g1", firstName: "Bob", phone: "0502222222" })]));

  it("removes PII (same contract as anonymize)", () => {
    purgeGuestData("g1");
    const g = storeGet("guests")[0];
    expect(g.phone).toBe("");
    expect(g.firstName).toBe("Guest");
  });
});

// ── getDataRetentionReport ────────────────────────────────────────────────

describe("getDataRetentionReport", () => {
  it("counts total and withPII guests", () => {
    seed([
      makeGuest({ id: "g1", status: "confirmed", firstName: "Alice", phone: "0501111111" }),
      makeGuest({ id: "g2", status: "declined", firstName: "", lastName: "", phone: "", email: "", notes: "", gift: "", mealNotes: "", accessibility: "" }),
    ]);
    const r = getDataRetentionReport();
    expect(r.total).toBe(2);
    expect(r.withPII).toBe(1); // only g1 has PII (firstName="Alice")
    expect(r.withoutPII).toBe(1);
  });

  it("lists declined guests as deletable", () => {
    seed([
      makeGuest({ id: "g1", status: "declined", firstName: "Alice", phone: "0501111111" }),
      makeGuest({ id: "g2", status: "confirmed", firstName: "Bob", phone: "0502222222" }),
    ]);
    const r = getDataRetentionReport();
    expect(r.deletable).toContain("g1");
    expect(r.deletable).not.toContain("g2");
  });

  it("excludes soft-deleted guests from report", () => {
    seed([
      makeGuest({ id: "g1", status: "confirmed", firstName: "Alice", deleted_at: "2024-01-01T00:00:00Z" }),
    ]);
    const r = getDataRetentionReport();
    expect(r.total).toBe(0);
  });
});
