/**
 * tests/unit/guest-search.test.mjs — Sprint 12 (session)
 *
 * Tests for src/utils/guest-search.js — normalizeSearch, guestMatchesQuery,
 * filterGuests, sortGuests.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeSearch,
  guestMatchesQuery,
  filterGuests,
  sortGuests,
} from "../../src/utils/guest-search.js";

// ── Sample Fixtures ─────────────────────────────────────────────────────

function make(overrides = {}) {
  return {
    id: "g1",
    firstName: "Avi",
    lastName: "Cohen",
    phone: "0541234567",
    email: "avi@example.com",
    status: "confirmed",
    side: "groom",
    group: "family",
    meal: "regular",
    tableId: "t1",
    accessibility: false,
    checkedIn: false,
    notes: "",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-02",
    ...overrides,
  };
}

const GUESTS = [
  make({ id: "g1", firstName: "Avi", lastName: "Cohen", status: "confirmed", side: "groom" }),
  make({ id: "g2", firstName: "Sara", lastName: "Levi", status: "pending", side: "bride", meal: "vegetarian" }),
  make({ id: "g3", firstName: "Dan", lastName: "Shapiro", status: "declined", side: "mutual", group: "work", accessibility: true }),
  make({ id: "g4", firstName: "Rina", lastName: "Cohen", status: "confirmed", side: "bride", checkedIn: true, tableId: "t2" }),
];

// ── normalizeSearch ────────────────────────────────────────────────────

describe("normalizeSearch", () => {
  it("lowercases text", () => {
    expect(normalizeSearch("HELLO")).toBe("hello");
  });

  it("trims whitespace", () => {
    expect(normalizeSearch("  hello  ")).toBe("hello");
  });

  it("strips diacritics", () => {
    expect(normalizeSearch("Héllo")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeSearch("")).toBe("");
  });

  it("handles Hebrew characters without stripping them", () => {
    const result = normalizeSearch("שלום");
    expect(result).toBe("שלום");
  });
});

// ── guestMatchesQuery ──────────────────────────────────────────────────

describe("guestMatchesQuery", () => {
  const guest = make({ firstName: "Avi", lastName: "Cohen", phone: "054-123-4567", email: "avi@test.com", notes: "VIP" });

  it("returns true for empty query", () => {
    expect(guestMatchesQuery(guest, "")).toBe(true);
  });

  it("matches by first name (case-insensitive)", () => {
    expect(guestMatchesQuery(guest, "avi")).toBe(true);
    expect(guestMatchesQuery(guest, "AVI")).toBe(true);
  });

  it("matches by last name", () => {
    expect(guestMatchesQuery(guest, "cohen")).toBe(true);
  });

  it("matches by full name", () => {
    expect(guestMatchesQuery(guest, "avi cohen")).toBe(true);
  });

  it("matches by phone", () => {
    expect(guestMatchesQuery(guest, "054-123")).toBe(true);
  });

  it("matches by email", () => {
    expect(guestMatchesQuery(guest, "avi@test")).toBe(true);
  });

  it("matches by notes", () => {
    expect(guestMatchesQuery(guest, "VIP")).toBe(true);
  });

  it("returns false for non-matching query", () => {
    expect(guestMatchesQuery(guest, "xyz-no-match")).toBe(false);
  });
});

// ── filterGuests ───────────────────────────────────────────────────────

describe("filterGuests", () => {
  it("returns all guests with no filters", () => {
    expect(filterGuests(GUESTS)).toHaveLength(4);
  });

  it("filters by status string", () => {
    const result = filterGuests(GUESTS, { status: "confirmed" });
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.status === "confirmed")).toBe(true);
  });

  it("filters by status array", () => {
    const result = filterGuests(GUESTS, { status: ["confirmed", "pending"] });
    expect(result).toHaveLength(3);
  });

  it("filters by side", () => {
    const result = filterGuests(GUESTS, { side: "groom" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });

  it("filters by group", () => {
    const result = filterGuests(GUESTS, { group: "work" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g3");
  });

  it("filters by meal", () => {
    const result = filterGuests(GUESTS, { meal: "vegetarian" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g2");
  });

  it("filters by tableId", () => {
    const result = filterGuests(GUESTS, { tableId: "t2" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g4");
  });

  it("filters by accessibility=true", () => {
    const result = filterGuests(GUESTS, { accessibility: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g3");
  });

  it("filters by checkedIn=true", () => {
    const result = filterGuests(GUESTS, { checkedIn: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g4");
  });

  it("combines multiple filters (AND logic)", () => {
    const result = filterGuests(GUESTS, { status: "confirmed", side: "groom" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });

  it("returns empty array when no guests match", () => {
    const result = filterGuests(GUESTS, { side: "nonexistent" });
    expect(result).toHaveLength(0);
  });

  it("filters by query string", () => {
    const result = filterGuests(GUESTS, { query: "Sara" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g2");
  });
});

// ── sortGuests ────────────────────────────────────────────────────────

describe("sortGuests", () => {
  it("sorts by firstName ascending", () => {
    const result = sortGuests(GUESTS, "firstName", "asc");
    expect(result[0].firstName).toBe("Avi");
    expect(result[result.length - 1].firstName).toBe("Sara");
  });

  it("sorts by firstName descending", () => {
    const result = sortGuests(GUESTS, "firstName", "desc");
    expect(result[0].firstName).toBe("Sara");
  });

  it("sorts by lastName ascending", () => {
    const result = sortGuests(GUESTS, "lastName", "asc");
    const names = result.map((g) => g.lastName);
    expect(names).toEqual([...names].sort());
  });

  it("does not mutate the original array", () => {
    const original = [...GUESTS];
    sortGuests(GUESTS, "firstName");
    expect(GUESTS).toEqual(original);
  });

  it("handles field with undefined values gracefully", () => {
    const guests = [make({ notes: undefined }), make({ notes: "hello" })];
    expect(() => sortGuests(guests, "notes")).not.toThrow();
  });
});
