/**
 * tests/unit/pdf-export.test.mjs — Sprint 57 / C1
 * Unit tests for src/utils/pdf-export.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

// ── Mock window.open ──────────────────────────────────────────────────────
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
const { buildPrintHtml, printGuestList, printTableLayout } = await import(
  "../../src/utils/pdf-export.js"
);

// ── Fixtures ──────────────────────────────────────────────────────────────
const GUESTS = [
  { id: "g1", firstName: "Alice", lastName: "Smith", phone: "054-1", status: "confirmed", tableId: "t1", count: 2 },
  { id: "g2", firstName: "Bob", lastName: "Jones", phone: "054-2", status: "pending", tableId: null, count: 1 },
  { id: "g3", firstName: "Carol", lastName: "Dana", phone: "", status: "declined", tableId: null, count: 1 },
];
const TABLES = [
  { id: "t1", name: "Table 1", capacity: 8 },
  { id: "t2", name: "Table 2", capacity: 6 },
];

function seed(guests = GUESTS, tables = TABLES) {
  initStore({ guests: { value: guests }, tables: { value: tables }, weddingInfo: { value: {} } });
}

beforeEach(() => {
  seed();
  vi.clearAllMocks();
  _mockWin.document.write.mockClear();
  _mockWin.print.mockClear();
  window.open.mockReturnValue(_mockWin);
});

// ── buildPrintHtml ─────────────────────────────────────────────────────────

describe("buildPrintHtml", () => {
  const cols = [
    { label: "Name", key: "name" },
    { label: "Count", key: "count", align: "center" },
  ];
  const rows = [
    { name: "Alice Smith", count: 2 },
    { name: "Bob Jones", count: 1 },
  ];

  it("includes DOCTYPE", () => {
    const html = buildPrintHtml("My Title", cols, rows);
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("includes the title in h1", () => {
    const html = buildPrintHtml("Guests Report", cols, rows);
    expect(html).toContain("Guests Report");
  });

  it("includes column headers in thead", () => {
    const html = buildPrintHtml("Title", cols, rows);
    expect(html).toContain("<th>Name</th>");
    expect(html).toContain("<th>Count</th>");
  });

  it("includes row data in tbody", () => {
    const html = buildPrintHtml("Title", cols, rows);
    expect(html).toContain("Alice Smith");
    expect(html).toContain("Bob Jones");
  });

  it("applies text-align style for aligned columns", () => {
    const html = buildPrintHtml("Title", cols, rows);
    expect(html).toContain('text-align:center');
  });

  it("uses dir=rtl by default", () => {
    const html = buildPrintHtml("Title", cols, rows);
    expect(html).toContain('dir="rtl"');
  });

  it("accepts dir=ltr", () => {
    const html = buildPrintHtml("Title", cols, rows, { dir: "ltr" });
    expect(html).toContain('dir="ltr"');
  });

  it("renders empty string for null/undefined values", () => {
    const r = [{ name: null, count: undefined }];
    const html = buildPrintHtml("Title", cols, r);
    expect(html).toContain("<td></td>");
  });

  it("includes footer when provided", () => {
    const html = buildPrintHtml("Title", cols, rows, { footer: "My Footer" });
    expect(html).toContain("My Footer");
  });

  it("omits footer element when not provided", () => {
    const html = buildPrintHtml("Title", cols, rows);
    expect(html).not.toContain("<footer>");
  });
});

// ── printGuestList ─────────────────────────────────────────────────────────

describe("printGuestList", () => {
  it("opens a new window", () => {
    printGuestList();
    expect(window.open).toHaveBeenCalledOnce();
  });

  it("writes HTML with guest names", () => {
    printGuestList();
    const written = _mockWin.document.write.mock.calls[0][0];
    expect(written).toContain("Alice");
    expect(written).toContain("Bob");
  });

  it("calls print()", () => {
    printGuestList();
    expect(_mockWin.print).toHaveBeenCalledOnce();
  });

  it("resolves table name for guest with tableId", () => {
    printGuestList();
    const written = _mockWin.document.write.mock.calls[0][0];
    expect(written).toContain("Table 1");
  });

  it("works with empty guests store", () => {
    seed([]);
    expect(() => printGuestList()).not.toThrow();
  });

  it("does not throw when window.open returns null", () => {
    window.open.mockReturnValueOnce(null);
    expect(() => printGuestList()).not.toThrow();
  });
});

// ── printTableLayout ───────────────────────────────────────────────────────

describe("printTableLayout", () => {
  it("opens a new window", () => {
    printTableLayout();
    expect(window.open).toHaveBeenCalledOnce();
  });

  it("writes HTML with table names", () => {
    printTableLayout();
    const written = _mockWin.document.write.mock.calls[0][0];
    expect(written).toContain("Table 1");
    expect(written).toContain("Table 2");
  });

  it("calls print()", () => {
    printTableLayout();
    expect(_mockWin.print).toHaveBeenCalledOnce();
  });

  it("includes guests assigned to a table", () => {
    seed(
      [{ id: "g1", firstName: "Alice", lastName: "S", status: "confirmed", tableId: "t1" }],
      TABLES,
    );
    printTableLayout();
    const written = _mockWin.document.write.mock.calls[0][0];
    expect(written).toContain("Alice");
  });

  it("does not include declined guests in table assignment", () => {
    seed(
      [{ id: "g1", firstName: "Bob", lastName: "S", status: "declined", tableId: "t1" }],
      TABLES,
    );
    printTableLayout();
    const written = _mockWin.document.write.mock.calls[0][0];
    // declined guest should not appear in guestNames column
    const tableRow = written.split("Table 1")[1] ?? "";
    expect(tableRow.substring(0, 200)).not.toContain("Bob");
  });

  it("works with empty tables store", () => {
    seed(GUESTS, []);
    expect(() => printTableLayout()).not.toThrow();
  });
});
