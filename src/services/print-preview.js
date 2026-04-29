/**
 * src/services/print-preview.js — S149 print preview + section template picker.
 * S170: Merged print-rows.js (S120 PDF/print row helpers) into this file.
 *
 * Builds HTML previews for each printable section. The modal picks a section,
 * renders an HTML preview into a pane, and the "Print" button sends it to
 * `printHtmlDocument()` (see inlined helpers below).
 */

import { storeGet } from "../core/store.js";
import { t } from "../core/i18n.js";

// ── S170 — Inlined from print-rows.js (S120) ─────────────────────────────

/** @typedef {{ name: string, phone?: string, status?: string, side?: string, tableId?: string|null, count?: number }} GuestPdfInput */
/** @typedef {{ name: string, capacity?: number }} TablePdfInput */

const _statusLabel = {
  confirmed: "✔",
  pending: "·",
  declined: "✗",
  maybe: "?",
};

/**
 * Build a printable guest list (sorted by table → name). Empty / pending
 * tables flatten to "—".
 *
 * @param {GuestPdfInput[]} guests
 * @param {TablePdfInput[]} [tables]
 */
export function buildGuestRows(guests, tables = []) {
  const tableNameById = new Map(tables.map((t, i) => [String(i + 1), t.name]));
  return guests
    .map((g) => ({
      name: g.name,
      phone: g.phone ?? "",
      status: _statusLabel[/** @type {keyof typeof _statusLabel} */ (g.status ?? "pending")] ?? "·",
      side: g.side ?? "",
      table: g.tableId ? (tableNameById.get(String(g.tableId)) ?? `#${g.tableId}`) : "—",
      count: g.count ?? 1,
    }))
    .sort((a, b) => {
      if (a.table === b.table) return a.name.localeCompare(b.name);
      if (a.table === "—") return 1;
      if (b.table === "—") return -1;
      return a.table.localeCompare(b.table);
    });
}

/**
 * Build a per-table seating chart payload.
 * @param {GuestPdfInput[]} guests
 * @param {TablePdfInput[]} tables
 * @returns {Array<{ name: string, capacity: number, seated: number, guests: string[] }>}
 */
export function buildSeatingRows(guests, tables) {
  return tables.map((t, i) => {
    const id = String(i + 1);
    const seated = guests.filter((g) => String(g.tableId) === id);
    return {
      name: t.name,
      capacity: t.capacity ?? 0,
      seated: seated.length,
      guests: seated.map((g) => g.name).sort((a, b) => a.localeCompare(b)),
    };
  });
}

/**
 * Build a self-contained printable HTML document. RTL-aware (via `dir`).
 * @param {string} title
 * @param {string} bodyHtml — already-escaped HTML
 * @param {{ dir?: "rtl"|"ltr", lang?: string }} [opts]
 */
export function buildPrintableHtml(title, bodyHtml, opts = {}) {
  const dir = opts.dir ?? "rtl";
  const lang = opts.lang ?? "he";
  return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:tahoma,Arial,sans-serif;margin:24px;color:#111}h1{margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:start}th{background:#eee}@media print{@page{size:A4;margin:14mm}}</style></head><body><h1>${escapeHtml(title)}</h1>${bodyHtml}</body></html>`;
}

/**
 * Tiny HTML escaper — strings only.
 * @param {unknown} s
 */
export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Print the given HTML via an injected window-opener (defaults to `window.open`).
 * Returns `{ ok: boolean, error?: string }` — never throws.
 *
 * @param {string} html
 * @param {(url?: string, target?: string) => any} [opener]
 */
export function printHtmlDocument(html, opener) {
  const fn = opener ?? (typeof window !== "undefined" ? window.open : null);
  if (typeof fn !== "function") return { ok: false, error: "no_window" };
  try {
    const w = fn("", "_blank");
    if (!w?.document) return { ok: false, error: "popup_blocked" };
    w.document.open();
    w.document.write(html);
    w.document.close();
    if (typeof w.focus === "function") w.focus();
    if (typeof w.print === "function") w.print();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── End inlined print-rows.js ─────────────────────────────────────────────

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
