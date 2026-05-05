/**
 * S705 — Guests → QR Code Batch Print (wire qr-batch.js + qr-code.js)
 *
 * Tests for:
 *  - buildBatch() from qr-batch.js
 *  - printGuestQrBatch() in guests.js opens a print window with QR cards
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { initStore } from "../../src/core/store.js";

// ── Side-effect mock ───────────────────────────────────────────────────────
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

// ── Stub window ────────────────────────────────────────────────────────────
const _mockWin = {
  document: { write: vi.fn(), close: vi.fn() },
  focus: vi.fn(),
  print: vi.fn(),
};
vi.stubGlobal("window", {
  open: vi.fn(() => _mockWin),
  print: vi.fn(),
  location: { origin: "https://wedding.example.com", pathname: "/app" },
});

// ── Module imports ─────────────────────────────────────────────────────────
const { buildBatch, encodeToken, decodeToken, manifestText } = await import("../../src/utils/qr-batch.js");
const guestsSection = await import("../../src/sections/guests.js");

// ── Fixtures ───────────────────────────────────────────────────────────────
const GUESTS = [
  { id: "g1", firstName: "Alice", lastName: "Smith", phone: "0501234567", status: "confirmed", tableId: "t1" },
  { id: "g2", firstName: "Bob", lastName: "Jones", phone: "0521234567", status: "pending", tableId: null },
  { id: "g3", firstName: "Carol", lastName: "Dana", status: "declined", tableId: null },
];

function seed(guests = GUESTS) {
  initStore({ guests: { value: guests }, tables: { value: [] }, weddingInfo: { value: {} } });
}

beforeEach(() => {
  seed();
  vi.clearAllMocks();
  _mockWin.document.write.mockClear();
  window.open.mockReturnValue(_mockWin);
});

// ── qr-batch.js unit tests ─────────────────────────────────────────────────

describe("qr-batch — encodeToken / decodeToken", () => {
  it("round-trips a simple guestId", () => {
    const token = encodeToken("guest-42");
    const { guestId } = decodeToken(token);
    expect(guestId).toBe("guest-42");
  });

  it("round-trips guestId + eventId", () => {
    const token = encodeToken("guest-42", "event-99");
    const decoded = decodeToken(token);
    expect(decoded.guestId).toBe("guest-42");
    expect(decoded.eventId).toBe("event-99");
  });

  it("throws for empty guestId", () => {
    expect(() => encodeToken("")).toThrow(TypeError);
  });

  it("throws for empty token decode", () => {
    expect(() => decodeToken("")).toThrow(TypeError);
  });

  it("produces URL-safe base64 (no +, /, =)", () => {
    const token = encodeToken("guest-abc");
    expect(token).not.toMatch(/[+/=]/);
  });
});

describe("qr-batch — buildBatch", () => {
  const guests = [
    { id: "g1", name: "Alice" },
    { id: "g2", name: "Bob" },
  ];

  it("returns one entry per guest", () => {
    const batch = buildBatch(guests);
    expect(batch).toHaveLength(2);
  });

  it("each entry has id, url, payload", () => {
    const [entry] = buildBatch(guests);
    expect(entry).toHaveProperty("id");
    expect(entry).toHaveProperty("url");
    expect(entry).toHaveProperty("payload");
  });

  it("uses custom baseUrl", () => {
    const [entry] = buildBatch(guests, { baseUrl: "https://myapp.com/checkin" });
    expect(entry.url).toContain("https://myapp.com/checkin");
  });

  it("includes token in URL", () => {
    const [entry] = buildBatch(guests);
    expect(entry.url).toContain(entry.payload);
  });

  it("skips invalid guests (no id)", () => {
    const mixed = [{ id: "g1", name: "Alice" }, { name: "NoId" }, null];
    const batch = buildBatch(/** @type {any} */ (mixed));
    expect(batch).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(buildBatch([])).toHaveLength(0);
  });
});

describe("qr-batch — manifestText", () => {
  it("produces one line per entry", () => {
    const entries = [
      { id: "g1", name: "Alice", url: "https://x.com/c?t=abc", payload: "abc" },
      { id: "g2", name: "Bob", url: "https://x.com/c?t=xyz", payload: "xyz" },
    ];
    const text = manifestText(entries);
    expect(text.split("\n")).toHaveLength(2);
  });

  it("includes name and url in each line", () => {
    const entries = [{ id: "g1", name: "Alice", url: "https://x.com/c?t=abc", payload: "abc" }];
    const text = manifestText(entries);
    expect(text).toContain("Alice");
    expect(text).toContain("https://x.com/c?t=abc");
  });
});

// ── guests.js integration ──────────────────────────────────────────────────

describe("S705 — guests.js printGuestQrBatch", () => {
  it("exports printGuestQrBatch function", () => {
    expect(typeof guestsSection.printGuestQrBatch).toBe("function");
  });

  it("opens a print window", () => {
    guestsSection.printGuestQrBatch();
    expect(window.open).toHaveBeenCalled();
  });

  it("does not open window when all guests declined", () => {
    initStore({ guests: { value: [{ id: "g1", status: "declined" }] }, tables: { value: [] }, weddingInfo: { value: {} } });
    guestsSection.printGuestQrBatch();
    expect(window.open).not.toHaveBeenCalled();
  });

  it("writes HTML with QR card content", () => {
    guestsSection.printGuestQrBatch();
    const html = _mockWin.document.write.mock.calls[0]?.[0] ?? "";
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("qr-card");
  });

  it("excludes declined guests from QR batch", () => {
    guestsSection.printGuestQrBatch();
    const html = _mockWin.document.write.mock.calls[0]?.[0] ?? "";
    // Carol is declined — her name should NOT appear
    expect(html).not.toContain("Carol");
  });

  it("handles null window.open gracefully", () => {
    window.open.mockReturnValueOnce(null);
    expect(() => guestsSection.printGuestQrBatch()).not.toThrow();
  });
});
