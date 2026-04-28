/**
 * src/services/print-preview.js — S149 print preview + section template picker.
 *
 * Builds HTML previews for each printable section. The modal picks a section,
 * renders an HTML preview into a pane, and the "Print" button sends it to
 * `printHtmlDocument()` from print-rows.js.
 */

import { storeGet } from "../core/store.js";
import { t } from "../core/i18n.js";
import {
  buildGuestRows,
  buildSeatingRows,
  buildPrintableHtml,
  escapeHtml,
  printHtmlDocument,
} from "./print-rows.js";

/**
 * Available print templates.
 * @type {ReadonlyArray<{key: string, labelKey: string}>}
 */
export const PRINT_TEMPLATES = [
  { key: "guests", labelKey: "nav_guests" },
  { key: "seating", labelKey: "print_seating" },
  { key: "vendors", labelKey: "nav_vendors" },
  { key: "budget", labelKey: "nav_budget" },
  { key: "timeline", labelKey: "nav_timeline" },
];

/**
 * Build preview HTML for the given section key.
 * @param {string} sectionKey
 * @returns {string} safe HTML string
 */
export function buildPreviewHtml(sectionKey) {
  switch (sectionKey) {
    case "guests":
      return _guestPreview();
    case "seating":
      return _seatingPreview();
    case "vendors":
      return _vendorPreview();
    case "budget":
      return _budgetPreview();
    case "timeline":
      return _timelinePreview();
    default:
      return `<p>${escapeHtml(t("print_no_data"))}</p>`;
  }
}

/**
 * Execute print for the given section key.
 * @param {string} sectionKey
 * @param {((url?: string, target?: string) => any)} [opener]
 */
export function executePrint(sectionKey, opener) {
  const body = buildPreviewHtml(sectionKey);
  const title = `${t("app_title")} — ${t(`nav_${sectionKey}`) || sectionKey}`;
  const html = buildPrintableHtml(title, body);
  return printHtmlDocument(html, opener);
}

// ── Section preview builders ─────────────────────────────────────────────

function _guestPreview() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const rows = buildGuestRows(
    guests.map((g) => ({
      name: `${g.firstName || ""} ${g.lastName || ""}`.trim(),
      phone: g.phone,
      status: g.status,
      side: g.side,
      tableId: g.tableId,
      count: g.count,
    })),
    tables,
  );
  if (rows.length === 0) return `<p>${escapeHtml(t("print_no_data"))}</p>`;
  let html = `<table><thead><tr><th>${escapeHtml(t("col_name"))}</th><th>${escapeHtml(t("col_phone"))}</th><th>${escapeHtml(t("col_status"))}</th><th>${escapeHtml(t("col_table"))}</th></tr></thead><tbody>`;
  for (const r of rows) {
    html += `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.phone)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.table)}</td></tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function _seatingPreview() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const rows = buildSeatingRows(
    guests.map((g) => ({
      name: `${g.firstName || ""} ${g.lastName || ""}`.trim(),
      tableId: g.tableId,
    })),
    tables,
  );
  if (rows.length === 0) return `<p>${escapeHtml(t("print_no_data"))}</p>`;
  let html = "";
  for (const tbl of rows) {
    html += `<h3>${escapeHtml(tbl.name)} (${tbl.seated}/${tbl.capacity})</h3>`;
    if (tbl.guests.length) {
      html += `<ul>${tbl.guests.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>`;
    } else {
      html += `<p><em>${escapeHtml(t("print_empty_table"))}</em></p>`;
    }
  }
  return html;
}

function _vendorPreview() {
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  if (vendors.length === 0) return `<p>${escapeHtml(t("print_no_data"))}</p>`;
  let html = `<table><thead><tr><th>${escapeHtml(t("col_vendor_name"))}</th><th>${escapeHtml(t("col_expense_category"))}</th><th>${escapeHtml(t("col_expense_amount"))}</th><th>${escapeHtml(t("vendor_paid"))}</th></tr></thead><tbody>`;
  for (const v of vendors) {
    html += `<tr><td>${escapeHtml(v.name)}</td><td>${escapeHtml(v.category || "")}</td><td>₪${Number(v.price || 0).toLocaleString()}</td><td>₪${Number(v.paid || 0).toLocaleString()}</td></tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function _budgetPreview() {
  const entries = /** @type {any[]} */ (storeGet("budget") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const giftRows = guests
    .filter((g) => g.gift)
    .map((g) => ({
      name: `${g.firstName || ""} ${g.lastName || ""}`.trim(),
      amount: Number(g.gift) || 0,
    }));
  const all = [...entries.map((e) => ({ name: e.name, amount: e.amount })), ...giftRows];
  if (all.length === 0) return `<p>${escapeHtml(t("print_no_data"))}</p>`;
  const total = all.reduce((s, r) => s + (r.amount || 0), 0);
  let html = `<table><thead><tr><th>${escapeHtml(t("col_name"))}</th><th>${escapeHtml(t("col_amount"))}</th></tr></thead><tbody>`;
  for (const r of all) {
    html += `<tr><td>${escapeHtml(r.name)}</td><td>₪${Number(r.amount || 0).toLocaleString()}</td></tr>`;
  }
  html += `</tbody><tfoot><tr><td><strong>${escapeHtml(t("budget_total"))}</strong></td><td><strong>₪${total.toLocaleString()}</strong></td></tr></tfoot></table>`;
  return html;
}

function _timelinePreview() {
  const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
  if (items.length === 0) return `<p>${escapeHtml(t("print_no_data"))}</p>`;
  let html = `<table><thead><tr><th>${escapeHtml(t("col_date"))}</th><th>${escapeHtml(t("col_title"))}</th><th>${escapeHtml(t("col_description"))}</th></tr></thead><tbody>`;
  for (const item of items) {
    html += `<tr><td>${escapeHtml(item.date || "")}</td><td>${escapeHtml(item.title || "")}</td><td>${escapeHtml(item.description || "")}</td></tr>`;
  }
  html += `</tbody></table>`;
  return html;
}
