/**
 * tests/integration/ux-regression.test.mjs — Sprint 139
 *
 * UX regression tests: filter persistence, sort stability, section routing.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PUBLIC_SECTIONS } from "../../src/core/constants.js";

// ── Stub store ──────────────────────────────────────────────────────────────

vi.mock("../../src/core/store.js", () => {
  const _s = {};
  return {
    initStore:  vi.fn((defs) => { for (const [k, { value }] of Object.entries(defs)) _s[k] = value; }),
    storeGet:   vi.fn((k) => _s[k]),
    storeSet:   vi.fn((k, v) => { _s[k] = v; }),
    storeSubscribe: vi.fn(() => vi.fn()),
  };
});
vi.mock("../../src/core/state.js",  () => ({ getActiveEventId: vi.fn(() => "default") }));
vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeGuests() {
  return [
    { id: "g1", firstName: "Alice", lastName: "A", status: "confirmed", side: "bride", group: "family",  tableId: "t1" },
    { id: "g2", firstName: "Bob",   lastName: "B", status: "pending",   side: "groom", group: "friends", tableId: null },
    { id: "g3", firstName: "Carol", lastName: "C", status: "declined",  side: "bride", group: "family",  tableId: "t1" },
    { id: "g4", firstName: "Dan",   lastName: "D", status: "confirmed", side: "groom", group: "work",    tableId: "t2" },
  ];
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Guest filter persistence", () => {
  it("status filter returns only matching guests", () => {
    const guests = makeGuests();
    const confirmed = guests.filter((g) => g.status === "confirmed");
    expect(confirmed).toHaveLength(2);
    expect(confirmed.map((g) => g.id).sort()).toEqual(["g1", "g4"]);
  });

  it("side filter returns only matching guests", () => {
    const guests = makeGuests();
    expect(guests.filter((g) => g.side === "bride")).toHaveLength(2);
  });

  it("group filter returns only matching guests", () => {
    const guests = makeGuests();
    expect(guests.filter((g) => g.group === "family")).toHaveLength(2);
  });

  it("stacked filters are AND-ed", () => {
    const guests = makeGuests();
    const result = guests.filter((g) => g.status === "confirmed" && g.side === "bride");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });
});

describe("Guest sort stability", () => {
  it("lastName sort is stable on equal keys", () => {
    const guests = [
      { id: "g1", firstName: "Alice",  lastName: "Cohen" },
      { id: "g2", firstName: "Bob",    lastName: "Cohen" },
      { id: "g3", firstName: "Zara",   lastName: "Abu" },
    ];
    const sorted = [...guests].sort((a, b) => a.lastName.localeCompare(b.lastName));
    expect(sorted[0].lastName).toBe("Abu");
    // Cohen group preserves insertion order (stable sort)
    expect(sorted[1].id).toBe("g1");
    expect(sorted[2].id).toBe("g2");
  });

  it("firstName sort handles Hebrew chars without throwing", () => {
    const guests = [
      { id: "g1", firstName: "דוד" },
      { id: "g2", firstName: "אליס" },
    ];
    expect(() => [...guests].sort((a, b) => a.firstName.localeCompare(b.firstName, "he"))).not.toThrow();
  });
});

describe("Table assignment logic", () => {
  it("all confirmed guests without tableId are unseated", () => {
    const guests = makeGuests();
    const unseated = guests.filter((g) => g.status === "confirmed" && !g.tableId);
    expect(unseated).toHaveLength(0); // g1 and g4 both have tableId
  });

  it("guest moved to null tableId counts as unseated", () => {
    const guests = makeGuests();
    const g = guests.find((g) => g.id === "g4");
    if (g) g.tableId = null;
    const unseatedConfirmed = guests.filter((g) => g.status === "confirmed" && !g.tableId);
    expect(unseatedConfirmed.find((g) => g.id === "g4")).toBeTruthy();
  });
});

describe("Section routing guard", () => {
  function canAccess(sectionId, isLoggedIn) {
    if (PUBLIC_SECTIONS.has(sectionId)) return true;
    return isLoggedIn;
  }

  it("public sections accessible without auth", () => {
    expect(canAccess("landing", false)).toBe(true);
    expect(canAccess("rsvp", false)).toBe(true);
  });

  it("private sections require auth", () => {
    expect(canAccess("guests", false)).toBe(false);
    expect(canAccess("settings", false)).toBe(false);
  });

  it("private sections accessible when logged in", () => {
    expect(canAccess("guests", true)).toBe(true);
  });
});
