/**
 * src/utils/print-helpers.js — Print layout utilities (Sprint 35)
 *
 * Helpers for generating print-optimised representations of wedding data.
 * All HTML-building functions return strings; no direct window.print() side-
 * effects except `triggerPrint`.  This keeps them fully testable in Node/JSDOM.
 *
 * Usage:
 *   import { buildGuestListHTML, buildSeatingChartHTML, triggerPrint } from "../utils/print-helpers.js";
 *
 *   const html = buildGuestListHTML(guests);
 *   triggerPrint(html, "Wedding Guests");
 */

// ── HTML escape ────────────────────────────────────────────────────────────

/**
 * Escape a string value for safe insertion into HTML text content.
 * @param {unknown} raw
 * @returns {string}
 */
function sanitizeText(raw) {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Header HTML ────────────────────────────────────────────────────────────

/**
 * Build a minimal HTML shell for print output.
 * @param {string} title — Plain text title shown in <h1> and <title>
 * @param {string} body  — Already-escaped HTML body content
 * @returns {string}
 */
export function buildPrintHTML(title, body) {
  const safeTitle = sanitizeText(title);
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>
body { font-family: Tahoma, Arial, sans-serif; direction: rtl; font-size: 12pt; margin: 20px; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #aaa; padding: 6px 8px; text-align: right; }
th { background: #f0f0f0; }
h1 { font-size: 16pt; margin-bottom: 12px; }
</style>
</head>
<body>
<h1>${safeTitle}</h1>
${body}
</body>
</html>`;
}

// ── Guest list ─────────────────────────────────────────────────────────────

/**
 * Build a print-optimised HTML guest table.
 *
 * @param {import('../types').Guest[]} guests
 * @param {{ title?: string }} [opts]
 * @returns {string}  Full print HTML string
 */
export function buildGuestListHTML(guests, opts = {}) {
  const title = opts.title ?? "רשימת אורחים";

  const header = `<tr>
    <th>#</th>
    <th>שם פרטי</th>
    <th>שם משפחה</th>
    <th>טלפון</th>
    <th>סטטוס</th>
    <th>אורחים</th>
    <th>ילדים</th>
    <th>שולחן</th>
  </tr>`;

  const rows = guests.map((g, idx) => {
    return `<tr>
    <td>${idx + 1}</td>
    <td>${sanitizeText(g.firstName ?? "")}</td>
    <td>${sanitizeText(g.lastName ?? "")}</td>
    <td>${sanitizeText(g.phone ?? "")}</td>
    <td>${sanitizeText(g.status ?? "")}</td>
    <td>${g.count ?? 1}</td>
    <td>${g.children ?? 0}</td>
    <td>${sanitizeText(String(g.tableId ?? ""))}</td>
  </tr>`;
  });

  const body = `<table><thead>${header}</thead><tbody>${rows.join("")}</tbody></table>`;
  return buildPrintHTML(title, body);
}

// ── Seating chart ──────────────────────────────────────────────────────────

/**
 * Build a print-optimised seating chart (one section per table).
 *
 * @param {import('../types').Table[]} tables
 * @param {import('../types').Guest[]} guests
 * @param {{ title?: string }} [opts]
 * @returns {string}
 */
export function buildSeatingChartHTML(tables, guests, opts = {}) {
  const title = opts.title ?? "פלן ישיבה";

  const sections = tables.map((table) => {
    const seated = guests.filter((g) => g.tableId === table.id);
    const rows = seated.map(
      (g, i) => `<tr><td>${i + 1}</td><td>${sanitizeText(g.firstName ?? "")} ${sanitizeText(g.lastName ?? "")}</td></tr>`,
    );
    const header = `<tr><th>#</th><th>שם</th></tr>`;
    return `<h2>${sanitizeText(table.name ?? "")}</h2>
<table><thead>${header}</thead><tbody>${rows.join("")}</tbody></table>`;
  });

  return buildPrintHTML(title, sections.join("\n"));
}

// ── Vendor & budget ────────────────────────────────────────────────────────

/**
 * Build a print-optimised vendor list with payment summary.
 *
 * @param {import('../types').Vendor[]} vendors
 * @param {{ title?: string }} [opts]
 * @returns {string}
 */
export function buildVendorListHTML(vendors, opts = {}) {
  const title = opts.title ?? "ספקים";

  const header = `<tr>
    <th>ספק</th>
    <th>קטגוריה</th>
    <th>מחיר</th>
    <th>שולם</th>
    <th>יתרה</th>
  </tr>`;

  const rows = vendors.map((v) => {
    const remaining = (v.price ?? 0) - (v.paid ?? 0);
    return `<tr>
    <td>${sanitizeText(v.name ?? "")}</td>
    <td>${sanitizeText(v.category ?? "")}</td>
    <td>${v.price ?? 0}</td>
    <td>${v.paid ?? 0}</td>
    <td>${remaining}</td>
  </tr>`;
  });

  const body = `<table><thead>${header}</thead><tbody>${rows.join("")}</tbody></table>`;
  return buildPrintHTML(title, body);
}

// ── triggerPrint ───────────────────────────────────────────────────────────

/**
 * Open HTML in a new window and trigger `window.print()`.
 * Safe to call only in browser contexts.
 *
 * @param {string} html        Full print HTML string (from buildPrintHTML etc.)
 * @param {string} [windowName]
 */
export function triggerPrint(html, windowName = "print") {
  const win = window.open("", windowName, "width=900,height=600");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract plain text from a minimal HTML snippet (strips tags).
 * Used internally for test-friendly inspection.
 *
 * @param {string} html
 * @returns {string}
 */
export function stripTags(html) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
