/**
 * tests/unit/print-helpers.test.mjs — Unit tests for print layout utilities (Sprint 35)
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from "vitest";
import {
  buildPrintHTML,
  buildGuestListHTML,
  buildSeatingChartHTML,
  buildVendorListHTML,
  stripTags,
} from "../../src/utils/print-helpers.js";
import { makeGuest, makeTable, makeVendor } from "./helpers.js";

// ── buildPrintHTML ────────────────────────────────────────────────────────

describe("buildPrintHTML", () => {
  it("returns a string containing DOCTYPE", () => {
    const html = buildPrintHTML("Test", "<p>body</p>");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("embeds title in <title> and <h1>", () => {
    const html = buildPrintHTML("Wedding Day", "<p>x</p>");
    expect(html).toContain("<title>Wedding Day</title>");
    expect(html).toContain("<h1>Wedding Day</h1>");
  });

  it("escapes HTML entities in title", () => {
    const html = buildPrintHTML('<script>alert(1)</script>', "<p>x</p>");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes body content verbatim", () => {
    const html = buildPrintHTML("T", "<table><tr><td>Data</td></tr></table>");
    expect(html).toContain("<table><tr><td>Data</td></tr></table>");
  });
});

// ── buildGuestListHTML ────────────────────────────────────────────────────

describe("buildGuestListHTML", () => {
  const guests = [
    makeGuest({ firstName: "Alice", lastName: "Smith", status: "confirmed", count: 2, children: 0 }),
    makeGuest({ firstName: "Bob", lastName: "Jones", status: "pending", count: 1, children: 1 }),
  ];

  it("contains both guest names", () => {
    const html = buildGuestListHTML(guests);
    expect(html).toContain("Alice");
    expect(html).toContain("Bob");
  });

  it("has a table element", () => {
    expect(buildGuestListHTML(guests)).toContain("<table>");
  });

  it("renders row number 1 and 2", () => {
    const html = buildGuestListHTML(guests);
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
  });

  it("uses custom title", () => {
    const html = buildGuestListHTML(guests, { title: "VIP List" });
    expect(html).toContain("VIP List");
  });

  it("handles empty guest list", () => {
    const html = buildGuestListHTML([]);
    expect(html).toContain("<tbody></tbody>");
  });

  it("escapes XSS in guest names", () => {
    const xss = makeGuest({ firstName: "<script>bad</script>", lastName: "" });
    const html = buildGuestListHTML([xss]);
    expect(html).not.toContain("<script>bad</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ── buildSeatingChartHTML ─────────────────────────────────────────────────

describe("buildSeatingChartHTML", () => {
  const tables = [
    makeTable({ id: "t1", name: "Table 1", capacity: 10 }),
    makeTable({ id: "t2", name: "Table 2", capacity: 8 }),
  ];
  const guests = [
    makeGuest({ firstName: "Alice", tableId: "t1" }),
    makeGuest({ firstName: "Carol", tableId: "t1" }),
    makeGuest({ firstName: "Dave", tableId: "t2" }),
  ];

  it("includes table names as headings", () => {
    const html = buildSeatingChartHTML(tables, guests);
    expect(html).toContain("Table 1");
    expect(html).toContain("Table 2");
  });

  it("lists guests under correct table", () => {
    const html = buildSeatingChartHTML(tables, guests);
    expect(html).toContain("Alice");
    expect(html).toContain("Dave");
  });

  it("empty table renders table with no body rows", () => {
    const html = buildSeatingChartHTML([makeTable({ id: "t3", name: "Empty" })], []);
    expect(html).toContain("Empty");
    expect(html).toContain("<tbody></tbody>");
  });

  it("accepts custom title", () => {
    const html = buildSeatingChartHTML(tables, guests, { title: "Seating" });
    expect(html).toContain("Seating");
  });
});

// ── buildVendorListHTML ────────────────────────────────────────────────────

describe("buildVendorListHTML", () => {
  const vendors = [
    makeVendor({ name: "DJ Pro", category: "music", price: 5000, paid: 2500 }),
    makeVendor({ name: "Flowers Inc", category: "decor", price: 3000, paid: 3000 }),
  ];

  it("includes vendor names", () => {
    const html = buildVendorListHTML(vendors);
    expect(html).toContain("DJ Pro");
    expect(html).toContain("Flowers Inc");
  });

  it("shows correct remaining balance", () => {
    const html = buildVendorListHTML(vendors);
    expect(html).toContain("2500");
    expect(html).toContain("0");
  });
});

// ── stripTags ──────────────────────────────────────────────────────────────

describe("stripTags", () => {
  it("removes all HTML tags", () => {
    expect(stripTags("<h1>Hello</h1>")).toBe("Hello");
  });

  it("collapses whitespace", () => {
    expect(stripTags("<p>  Hello   World  </p>")).toBe("Hello World");
  });

  it("returns empty string for empty HTML", () => {
    expect(stripTags("")).toBe("");
  });
});
