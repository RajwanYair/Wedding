/**
 * S704 — Guests → PDF Export: wire pdf-export.js printGuestList / printTableLayout
 *
 * Tests that:
 *  1. guests.js printGuests() delegates to pdf-export.js printGuestList()
 *  2. guests.js printTables() is new and delegates to printTableLayout()
 *  3. Neither function calls window.print() directly
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { initStore } from "../../src/core/store.js";

// ── Mock side-effect deps ──────────────────────────────────────────────────
vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
  onSyncStatus: vi.fn(),
  queueSize: vi.fn(() => 0),
  queueKeys: vi.fn(() => []),
}));
vi.mock("../../src/services/realtime.js", () => ({
  onPresenceChange: vi.fn(),
  groupByViewing: vi.fn(() => ({})),
  badgeFor: vi.fn(() => ""),
}));

// ── Stub window.open ───────────────────────────────────────────────────────
const _mockWin = {
  document: { write: vi.fn(), close: vi.fn() },
  focus: vi.fn(),
  print: vi.fn(),
};
vi.stubGlobal("window", {
  open: vi.fn(() => _mockWin),
  print: vi.fn(),
  location: { origin: "https://example.com", pathname: "/" },
});

// ── Modules under test ─────────────────────────────────────────────────────
const guestsSection = await import("../../src/sections/guests.js");

// ── Fixtures ───────────────────────────────────────────────────────────────
const GUESTS = [
  { id: "g1", firstName: "Alice", lastName: "Smith", phone: "0501234567", status: "confirmed", tableId: "t1" },
  { id: "g2", firstName: "Bob", lastName: "Jones", phone: "0521234567", status: "pending", tableId: null },
];
const TABLES = [
  { id: "t1", name: "Table 1", capacity: 8 },
];

function seed() {
  initStore({
    guests: { value: GUESTS },
    tables: { value: TABLES },
    weddingInfo: { value: {} },
  });
}

beforeEach(() => {
  seed();
  vi.clearAllMocks();
  _mockWin.document.write.mockClear();
  _mockWin.print.mockClear();
  window.open.mockReturnValue(_mockWin);
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("S704 — guests.js PDF export integration", () => {
  it("exports printGuests function", () => {
    expect(typeof guestsSection.printGuests).toBe("function");
  });

  it("exports printTables function (new in S704)", () => {
    expect(typeof guestsSection.printTables).toBe("function");
  });

  it("printGuests opens a new window (delegates to printGuestList)", () => {
    guestsSection.printGuests();
    expect(window.open).toHaveBeenCalled();
  });

  it("printGuests does NOT call window.print() directly", () => {
    guestsSection.printGuests();
    expect(window.print).not.toHaveBeenCalled();
  });

  it("printTables opens a new window (delegates to printTableLayout)", () => {
    guestsSection.printTables();
    expect(window.open).toHaveBeenCalled();
  });

  it("printTables does NOT call window.print() directly", () => {
    guestsSection.printTables();
    expect(window.print).not.toHaveBeenCalled();
  });

  it("printGuests writes HTML to the opened window document", () => {
    guestsSection.printGuests();
    expect(_mockWin.document.write).toHaveBeenCalledOnce();
    const html = _mockWin.document.write.mock.calls[0][0];
    expect(typeof html).toBe("string");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("printTables writes HTML to the opened window document", () => {
    guestsSection.printTables();
    expect(_mockWin.document.write).toHaveBeenCalledOnce();
    const html = _mockWin.document.write.mock.calls[0][0];
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("printGuests gracefully handles null window.open return", () => {
    window.open.mockReturnValueOnce(null);
    expect(() => guestsSection.printGuests()).not.toThrow();
  });

  it("printTables gracefully handles null window.open return", () => {
    window.open.mockReturnValueOnce(null);
    expect(() => guestsSection.printTables()).not.toThrow();
  });

  it("printGuests written HTML contains guest name", () => {
    guestsSection.printGuests();
    const html = _mockWin.document.write.mock.calls[0]?.[0] ?? "";
    expect(html).toContain("Alice");
  });
});
