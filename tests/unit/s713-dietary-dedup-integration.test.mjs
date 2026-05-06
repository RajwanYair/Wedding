/**
 * S713 + S714 integration tests
 * - getDietarySummary / getKitchenReport  (guests.js ← dietary-summary.js)
 * - findDuplicateGuests / mergeDuplicateGuests (guests.js ← guest-dedup.js)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeSet, storeGet } from "../../src/core/store.js";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
  appendToRsvpLog: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn() }));
vi.mock("../../src/services/realtime.js", () => ({
  onPresenceChange: vi.fn(() => () => {}),
  groupByViewing: vi.fn(() => ({})),
  badgeFor: vi.fn(() => ""),
}));

beforeEach(() => {
  initStore({ guests: { value: [] } });
});

// ── S713: dietary summary ─────────────────────────────────────────────────────

describe("S713 — getDietarySummary + getKitchenReport", () => {
  it("exports getDietarySummary and getKitchenReport functions", async () => {
    const SECTION = await import("../../src/sections/guests.js");
    expect(typeof SECTION.getDietarySummary).toBe("function");
    expect(typeof SECTION.getKitchenReport).toBe("function");
  });

  it("getDietarySummary tallies confirmed guests by meal and allergy", async () => {
    storeSet("guests", [
      { id: "1", status: "confirmed", meal: "Vegan", allergies: ["gluten"], seats: 2 },
      { id: "2", status: "confirmed", meal: "vegan", allergies: [] },
      { id: "3", status: "confirmed", meal: "fish" },
      { id: "4", status: "confirmed" },
      { id: "5", status: "declined", meal: "meat" },
    ]);
    const { getDietarySummary } = await import("../../src/sections/guests.js");
    const s = getDietarySummary();
    expect(s.totalSeats).toBe(5);           // 2+1+1+1 (declined skipped)
    expect(s.byMeal.vegan).toBe(3);         // "Vegan"*2 + "vegan"*1
    expect(s.byMeal.fish).toBe(1);
    expect(s.byAllergy.gluten).toBe(2);     // seats of guest 1
  });

  it("getKitchenReport produces tab-separated rows with TOTAL line", async () => {
    storeSet("guests", [
      { id: "g1", status: "confirmed", meal: "meat" },
    ]);
    const { getKitchenReport } = await import("../../src/sections/guests.js");
    const text = getKitchenReport();
    expect(text).toMatch(/meat\t1/);
    expect(text).toMatch(/TOTAL\t1/);
  });
});

// ── S714: guest dedup ─────────────────────────────────────────────────────────

describe("S714 — findDuplicateGuests + mergeDuplicateGuests", () => {
  it("findDuplicateGuests detects same-phone pairs", async () => {
    storeSet("guests", [
      { id: "a", name: "Alice", phone: "0501234567" },
      { id: "b", name: "Alice B", phone: "0501234567" },
    ]);
    const { findDuplicateGuests } = await import("../../src/sections/guests.js");
    const pairs = findDuplicateGuests();
    expect(pairs.length).toBeGreaterThanOrEqual(1);
    expect(pairs[0].reason).toBe("phone");
  });

  it("mergeDuplicateGuests removes the dup and persists primary", async () => {
    storeSet("guests", [
      { id: "a", name: "Alice", phone: "0501234567", email: "" },
      { id: "b", name: "Alice", phone: "0501234567", email: "alice@example.com" },
    ]);
    const { mergeDuplicateGuests } = await import("../../src/sections/guests.js");
    const result = mergeDuplicateGuests("a", "b");
    expect(result.ok).toBe(true);
    expect(result.count).toBe(1);        // 1 guest removed
    const remaining = storeGet("guests");
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe("a");
    expect(remaining[0].email).toBe("alice@example.com"); // enriched from dup
  });
});
