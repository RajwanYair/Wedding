/**
 * src/utils/report-builder.js — Report builder utility (Sprint 113)
 *
 * Builds structured reports from guest, budget, and vendor data for export
 * as HTML or CSV.  All functions are pure (no DOM, no side effects).
 *
 * Usage:
 *   import { buildGuestReport, renderReportHtml, renderReportCsv } from "../utils/report-builder.js";
 */

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{ heading: string, rows: string[][], columns: string[] }} ReportSection
 */

// ── Guest report ──────────────────────────────────────────────────────────

/**
 * Build a guest summary report.
 * @param {import("../types").Guest[]} guests
 * @param {{ statusFilter?: string[], includePhone?: boolean }} [opts]
 * @returns {ReportSection[]}
 */
export function buildGuestReport(guests, opts = {}) {
  const filtered = opts.statusFilter
    ? guests.filter((g) => opts.statusFilter?.includes(g.status))
    : guests;

  const columns = [
    "שם",
    "סטטוס",
    "כמות אורחים",
    ...(opts.includePhone ? ["טלפון"] : []),
    "שולחן",
    "אוכל",
  ];

  const rows = filtered.map((g) => [
    `${g.firstName} ${g.lastName}`,
    g.status  ?? "",
    String(g.count ?? 1),
    ...(opts.includePhone ? [g.phone ?? ""] : []),
    g.tableId ?? "",
    g.meal    ?? "",
  ]);

  // Status breakdown sub-section
  const counts = filtered.reduce(
    /** @param {Record<string,number>} acc */ (acc, g) => {
      acc[g.status] = (acc[g.status] ?? 0) + 1;
      return acc;
    }, {}
  );

  const summaryRows = Object.entries(counts).map(([status, n]) => [status, String(n)]);

  return [
    { heading: "רשימת אורחים", columns, rows },
    { heading: "סיכום סטטוסים", columns: ["סטטוס", "כמות"], rows: summaryRows },
  ];
}

// ── Budget report ─────────────────────────────────────────────────────────

/**
 * Build a budget summary report.
 * @param {import("../types").Expense[]} expenses
 * @param {import("../types").Vendor[]} vendors
 * @returns {ReportSection[]}
 */
export function buildBudgetReport(expenses, vendors) {
  // Expense section
  const expenseColumns = ["קטגוריה", "תיאור", "סכום"];
  const expenseRows    = expenses.map((e) => [
    e.category    ?? "",
    e.description ?? "",
    String(e.amount ?? 0),
  ]);
  const totalExpenses  = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  expenseRows.push(["", "סה\"כ הוצאות", String(totalExpenses)]);

  // Vendor section
  const vendorColumns = ["ספק", "קטגוריה", "מחיר", "שולם", "יתרה"];
  const vendorRows    = vendors.map((v) => {
    const balance = (v.price ?? 0) - (v.paid ?? 0);
    return [v.name ?? "", v.category ?? "", String(v.price ?? 0), String(v.paid ?? 0), String(balance)];
  });
  const totalPrice    = vendors.reduce((s, v) => s + (v.price ?? 0), 0);
  const totalPaid     = vendors.reduce((s, v) => s + (v.paid ?? 0), 0);
  vendorRows.push(["", "סה\"כ", String(totalPrice), String(totalPaid), String(totalPrice - totalPaid)]);

  return [
    { heading: "הוצאות", columns: expenseColumns, rows: expenseRows },
    { heading: "ספקים",  columns: vendorColumns,  rows: vendorRows  },
  ];
}

// ── Rendering ─────────────────────────────────────────────────────────────

/**
 * Render report sections as a basic HTML string (no JS, no inline styles).
 * @param {ReportSection[]} sections
 * @param {{ title?: string }} [opts]
 * @returns {string}
 */
export function renderReportHtml(sections, opts = {}) {
  const title = opts.title ?? "Wedding Report";
  const sectionsHtml = sections.map(({ heading, columns, rows }) => {
    const thead = `<tr>${columns.map((c) => `<th>${_escape(c)}</th>`).join("")}</tr>`;
    const tbody = rows.map(
      (row) => `<tr>${row.map((cell) => `<td>${_escape(cell)}</td>`).join("")}</tr>`
    ).join("");
    return `<section><h2>${_escape(heading)}</h2><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></section>`;
  }).join("");

  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>${_escape(title)}</title></head><body><h1>${_escape(title)}</h1>${sectionsHtml}</body></html>`;
}

/**
 * Render a single report section as CSV.
 * @param {ReportSection} section
 * @returns {string}
 */
export function renderSectionCsv(section) {
  const header = section.columns.map(_csvCell).join(",");
  const body   = section.rows.map((row) => row.map(_csvCell).join(",")).join("\n");
  return `${header}\n${body}`;
}

// ── Escape helpers ─────────────────────────────────────────────────────────

/** @param {string} s */
function _escape(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** @param {string} s */
function _csvCell(s) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
