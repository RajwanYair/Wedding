/**
 * tests/unit/report-builder.test.mjs — Sprint 113
 */

import { describe, it, expect } from "vitest";
import {
  buildGuestReport,
  buildBudgetReport,
  renderReportHtml,
  renderSectionCsv,
} from "../../src/utils/report-builder.js";

function guest(id, overrides = {}) {
  return {
    id, firstName: "אורח", lastName: String(id), phone: "050111",
    email: `g${id}@test.com`, status: "confirmed", count: 2,
    meal: "regular", tableId: "t1", ...overrides,
  };
}

function expense(id, category, amount) {
  return { id, category, description: `Desc ${id}`, amount };
}

function vendor(id, name, price, paid) {
  return { id, name, category: "catering", price, paid };
}

describe("buildGuestReport", () => {
  it("returns two sections (list + summary)", () => {
    const sections = buildGuestReport([guest("g1"), guest("g2")]);
    expect(sections).toHaveLength(2);
  });

  it("filters by status", () => {
    const guests = [guest("g1"), guest("g2", { status: "declined" })];
    const [listSection] = buildGuestReport(guests, { statusFilter: ["confirmed"] });
    expect(listSection.rows).toHaveLength(1);
  });

  it("includes phone col when includePhone: true", () => {
    const [section] = buildGuestReport([guest("g1")], { includePhone: true });
    expect(section.columns).toContain("טלפון");
  });

  it("excludes phone col by default", () => {
    const [section] = buildGuestReport([guest("g1")]);
    expect(section.columns).not.toContain("טלפון");
  });

  it("summary rows reflect status counts", () => {
    const guests = [
      guest("g1", { status: "confirmed" }),
      guest("g2", { status: "confirmed" }),
      guest("g3", { status: "pending" }),
    ];
    const [, summarySection] = buildGuestReport(guests);
    const confirmedRow = summarySection.rows.find((r) => r[0] === "confirmed");
    expect(confirmedRow?.[1]).toBe("2");
  });
});

describe("buildBudgetReport", () => {
  it("returns two sections (expenses + vendors)", () => {
    const sections = buildBudgetReport(
      [expense("e1", "venue", 10000)],
      [vendor("v1", "Caterer", 20000, 5000)],
    );
    expect(sections).toHaveLength(2);
  });

  it("last expense row is the total", () => {
    const [expSection] = buildBudgetReport([expense("e1", "food", 3000)], []);
    const lastRow = expSection.rows[expSection.rows.length - 1];
    expect(lastRow[2]).toBe("3000");
  });

  it("vendor balance is price minus paid", () => {
    const [, vendorSection] = buildBudgetReport([], [vendor("v1", "DJ", 5000, 2000)]);
    const dataRow = vendorSection.rows[0];
    expect(dataRow[4]).toBe("3000");  // balance
  });
});

describe("renderReportHtml", () => {
  it("returns a valid HTML string", () => {
    const sections = [{ heading: "Test", columns: ["A", "B"], rows: [["1", "2"]] }];
    const html = renderReportHtml(sections, { title: "My Report" });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("My Report");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>1</td>");
  });

  it("escapes HTML special characters", () => {
    const sections = [{ heading: "<script>", columns: ["Col"], rows: [["<b>val</b>"]] }];
    const html = renderReportHtml(sections);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderSectionCsv", () => {
  it("produces CSV with header and rows", () => {
    const section = { heading: "Test", columns: ["Name", "Count"], rows: [["Alice", "2"], ["Bob", "1"]] };
    const csv = renderSectionCsv(section);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Count");
    expect(lines[1]).toBe("Alice,2");
    expect(lines[2]).toBe("Bob,1");
  });

  it("wraps values with commas in quotes", () => {
    const section = { heading: "T", columns: ["A"], rows: [["Hello, World"]] };
    const csv = renderSectionCsv(section);
    expect(csv).toContain('"Hello, World"');
  });
});
