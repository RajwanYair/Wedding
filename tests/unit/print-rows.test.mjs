/**
 * tests/unit/print-rows.test.mjs — S120 PDF/print row helpers.
 */
import { describe, it, expect, vi } from "vitest";
import {
  buildGuestRows,
  buildSeatingRows,
  buildPrintableHtml,
  escapeHtml,
  printHtmlDocument,
} from "../../src/services/print-preview.js";

const tables = [
  { name: "ראשונה", capacity: 8 },
  { name: "שנייה", capacity: 10 },
];
const guests = [
  { name: "דנה", phone: "0501", status: "confirmed", tableId: "1", side: "bride" },
  { name: "אבי", phone: "0502", status: "pending", tableId: null, side: "groom" },
  { name: "יוסי", status: "confirmed", tableId: "2" },
];

describe("S120 — print-rows", () => {
  it("buildGuestRows maps status icons + table names + sorts unseated last", () => {
    const rows = buildGuestRows(guests, tables);
    expect(rows[0].status).toBe("✔");
    expect(rows[0].table).toBe("ראשונה");
    expect(rows.at(-1).table).toBe("—");
  });

  it("buildGuestRows handles empty input", () => {
    expect(buildGuestRows([], [])).toEqual([]);
  });

  it("buildSeatingRows aggregates seated guests sorted by name", () => {
    const out = buildSeatingRows(guests, tables);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({
      name: "ראשונה",
      capacity: 8,
      seated: 1,
      guests: ["דנה"],
    });
    expect(out[1].guests).toEqual(["יוסי"]);
  });

  it("escapeHtml escapes the dangerous five", () => {
    expect(escapeHtml("<a href=\"x\">o&'</a>")).toBe(
      "&lt;a href=&quot;x&quot;&gt;o&amp;&#39;&lt;/a&gt;",
    );
  });

  it("buildPrintableHtml emits valid doctype + dir/lang", () => {
    const html = buildPrintableHtml("Guests", "<p>x</p>");
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("<title>Guests</title>");
  });

  it("printHtmlDocument calls open + write + close + print", () => {
    const fakeWin = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    };
    const opener = vi.fn().mockReturnValue(fakeWin);
    const r = printHtmlDocument("<p>x</p>", opener);
    expect(r.ok).toBe(true);
    expect(fakeWin.document.write).toHaveBeenCalledWith("<p>x</p>");
    expect(fakeWin.print).toHaveBeenCalledOnce();
  });

  it("printHtmlDocument reports popup_blocked when opener returns null", () => {
    const r = printHtmlDocument("x", () => null);
    expect(r).toEqual({ ok: false, error: "popup_blocked" });
  });
});
