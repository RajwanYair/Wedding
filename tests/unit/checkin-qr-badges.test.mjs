/**
 * tests/unit/checkin-qr-badges.test.mjs — Sprint 54 / C1
 * Unit tests for printGuestQrBadges() in src/sections/checkin.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

// ── Mock side-effect dependencies ─────────────────────────────────────────
vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
  onSyncStatus: vi.fn(),
  queueSize: vi.fn(() => 0),
  queueKeys: vi.fn(() => []),
}));
vi.mock("../../src/services/security.js", () => ({
  isNFCSupported: vi.fn(() => false),
  startNFCScan: vi.fn(),
}));

// ── Mock window.open / window.print ──────────────────────────────────────
const _mockWin = {
  document: { write: vi.fn(), close: vi.fn() },
  focus: vi.fn(),
  print: vi.fn(),
};
vi.stubGlobal("window", {
  open: vi.fn(() => _mockWin),
  location: { origin: "https://example.com", pathname: "/" },
});

// ── Module under test ─────────────────────────────────────────────────────
const { printGuestQrBadges, getCheckinStats } = await import(
  "../../src/sections/checkin.js"
);

// ── Helpers ───────────────────────────────────────────────────────────────
const GUESTS = [
  { id: "g1", firstName: "Alice", lastName: "A", status: "confirmed", tableId: "t1", count: 2 },
  { id: "g2", firstName: "Bob", lastName: "B", status: "confirmed", tableId: null, count: 1 },
  { id: "g3", firstName: "Charlie", lastName: "C", status: "pending", tableId: null, count: 1 },
  { id: "g4", firstName: "Dana", lastName: "D", status: "declined", tableId: null, count: 1 },
];
const TABLES = [{ id: "t1", name: "Table 1", capacity: 8 }];

function seed(guests = GUESTS, tables = TABLES) {
  initStore({
    guests: { value: guests },
    tables: { value: tables },
    weddingInfo: { value: { groom: "Groom", bride: "Bride" } },
  });
}

beforeEach(() => {
  seed();
  vi.clearAllMocks();
});

// ── printGuestQrBadges ─────────────────────────────────────────────────────

describe("printGuestQrBadges", () => {
  it("opens a new window", () => {
    printGuestQrBadges();
    expect(window.open).toHaveBeenCalledOnce();
  });

  it("only includes confirmed guests in badge HTML", () => {
    printGuestQrBadges();
    const written = _mockWin.document.write.mock.calls[0][0];
    expect(written).toContain("Alice");
    expect(written).toContain("Bob");
    expect(written).not.toContain("Charlie"); // pending
    expect(written).not.toContain("Dana");    // declined
  });

  it("includes table name for guests with tableId", () => {
    printGuestQrBadges();
    const written = _mockWin.document.write.mock.calls[0][0];
    expect(written).toContain("Table 1");
  });

  it("calls print() on the opened window", () => {
    printGuestQrBadges();
    expect(_mockWin.print).toHaveBeenCalledOnce();
  });

  it("does not throw when no confirmed guests exist", () => {
    seed([]);
    expect(() => printGuestQrBadges()).not.toThrow();
  });

  it("includes guest first and last name", () => {
    printGuestQrBadges();
    const written = _mockWin.document.write.mock.calls[0][0];
    expect(written).toContain("Alice");
    expect(written).toContain("A"); // last name
  });

  it("skips table name when guest has no tableId", () => {
    // Bob has no tableId — table div should not include Table 1 for Bob's badge
    printGuestQrBadges();
    const written = _mockWin.document.write.mock.calls[0][0];
    // The HTML should have Bob's badge but without Table 1 div for him
    // (Alice has Table 1 badge)
    expect(written).toContain("Bob");
  });

  it("returns early without throwing when window.open returns null", () => {
    window.open.mockReturnValueOnce(null);
    expect(() => printGuestQrBadges()).not.toThrow();
  });

  it("produces valid HTML with DOCTYPE", () => {
    printGuestQrBadges();
    const written = _mockWin.document.write.mock.calls[0][0];
    expect(written).toContain("<!DOCTYPE html>");
  });

  it("sets dir=rtl on html element", () => {
    printGuestQrBadges();
    const written = _mockWin.document.write.mock.calls[0][0];
    expect(written).toContain("dir='rtl'");
  });
});

// ── getCheckinStats ───────────────────────────────────────────────────────

describe("getCheckinStats", () => {
  it("returns zero totals for empty store", () => {
    seed([]);
    const s = getCheckinStats();
    expect(s.total).toBe(0);
    expect(s.checkedIn).toBe(0);
    expect(s.checkinRate).toBe(0);
    expect(s.remaining).toBe(0);
  });

  it("counts confirmed guest counts towards total", () => {
    const s = getCheckinStats();
    // g1 count=2, g2 count=1 → total=3
    expect(s.total).toBe(3);
  });

  it("counts checked-in totals correctly", () => {
    const withCheckin = [
      ...GUESTS.slice(0, 2),
      { ...GUESTS[0], checkedIn: true },
    ];
    seed([
      { ...GUESTS[0], checkedIn: true },
      GUESTS[1],
    ]);
    const s = getCheckinStats();
    expect(s.checkedIn).toBe(2); // g1 count=2, checked in
    expect(s.remaining).toBe(1); // g2 count=1
  });
});
