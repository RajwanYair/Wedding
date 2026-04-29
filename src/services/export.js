/**
 * src/services/export.js — Print preview, print row builders, and Web Share API (S248)
 *
 * Merged from:
 *   - print-preview.js (S149/S170) — HTML print preview, row builders, print runner
 *   - share.js (S23f/S86)          — Web Share API wrapper with clipboard fallback
 *
 * §1 Print helpers — buildGuestRows, buildSeatingRows, buildPrintableHtml,
 *    buildPreviewHtml, executePrint, escapeHtml, printHtmlDocument.
 * §2 Web Share API — isShareSupported, canShareFiles, share, shareGuestRsvpLink,
 *    shareWithFallback, buildShareUrl.
 *
 * Named exports only — no window.* side effects (except printHtmlDocument opener).
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
      table: g.tableId ? tableNameById.get(String(g.tableId)) ?? `#${g.tableId}` : "—",
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


// ── §2 — Web Share API ────────────────────────────────────────────────────


// ── Feature detection ─────────────────────────────────────────────────────

/**
 * True when the Web Share API (`navigator.share`) is available.
 * Available in Chrome/Safari on HTTPS. Desktop Chrome 89+, iOS Safari 12.4+.
 * @returns {boolean}
 */
export function isShareSupported() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * True when the browser can share files via `navigator.canShare`.
 * @param {File[]} files
 * @returns {boolean}
 */
export function canShareFiles(files) {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
    return false;
  }
  return navigator.canShare({ files });
}

// ── Core share API ────────────────────────────────────────────────────────

/**
 * @typedef {{ title?: string, text?: string, url?: string, files?: File[] }} ShareData
 */

/**
 * Invoke the native Web Share sheet.
 * Resolves `true` on success, `false` if user cancelled.
 * Rejects only on unsupported or unexpected errors.
 *
 * @param {ShareData} data
 * @returns {Promise<boolean>}
 * @throws {Error} if share API is not supported
 */
export async function share(data) {
  if (!isShareSupported()) {
    throw new Error("Web Share API not supported on this device");
  }
  try {
    await navigator.share(data);
    return true;
  } catch (err) {
    // AbortError = user dismissed the share sheet — not a real error
    if (err instanceof Error && err.name === "AbortError") {
      return false;
    }
    throw err;
  }
}

/**
 * Build and share a per-guest RSVP link.
 * Falls back gracefully when the API is unavailable.
 *
 * @param {{ firstName: string, lastName?: string, id?: string }} guest
 * @param {{ title?: string, text?: string }} [options]
 * @returns {Promise<boolean>} true if shared, false if cancelled or unsupported
 */
export async function shareGuestRsvpLink(guest, options = {}) {
  const name = `${guest.firstName}${guest.lastName ? ` ${guest.lastName}` : ""}`;
  const baseUrl = globalThis.location?.href?.split("?")[0] ?? "";
  const params = guest.id ? `?guestId=${encodeURIComponent(guest.id)}` : "";
  const url = `${baseUrl}${params}`;

  if (!isShareSupported()) {
    return false;
  }

  return share({
    title: options.title ?? `RSVP — ${name}`,
    text: options.text ?? `${name} — Wedding RSVP`,
    url,
  });
}

// ── Share with clipboard fallback (S86 — merged from share-service.js) ────
//
// `shareWithFallback` differs from `share()` above: it never throws, returns a
// structured ShareResult, and falls back to clipboard when Web Share is
// unavailable. Useful for invitations/links where best-effort is acceptable.

/**
 * @typedef {{ method: "native"|"clipboard"|"none", success: boolean, error?: string }} ShareResult
 */

/** Alias for {@link isShareSupported} kept for API compatibility. */
export const isNativeShareSupported = isShareSupported;

/**
 * Attempt to share data using Web Share API with clipboard fallback.
 * @param {ShareData} data
 * @param {{
 *   nativeShare?: ((data: ShareData) => Promise<void>) | null,
 *   clipboardWrite?: ((text: string) => Promise<void>) | null,
 * }} [overrides]  Injectable overrides for testability
 * @returns {Promise<ShareResult>}
 */
export async function shareWithFallback(data, overrides = {}) {
  const nativeShare =
    overrides.nativeShare !== undefined
      ? overrides.nativeShare
      : (typeof navigator !== "undefined" && navigator.share?.bind(navigator)) || null;
  const clipWrite =
    overrides.clipboardWrite !== undefined
      ? overrides.clipboardWrite
      : (typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText?.bind(navigator.clipboard)) ||
        null;

  if (nativeShare) {
    try {
      await nativeShare(data);
      return { method: "native", success: true };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { method: "native", success: false, error: "AbortError" };
      }
      // fall through to clipboard
    }
  }

  const text = [data.title, data.text, data.url].filter(Boolean).join("\n");
  if (clipWrite) {
    try {
      await clipWrite(text);
      return { method: "clipboard", success: true };
    } catch (err) {
      return { method: "clipboard", success: false, error: String(err) };
    }
  }

  return { method: "none", success: false, error: "No share API available" };
}

/**
 * Build a share URL for a wedding RSVP page.
 * @param {string} baseUrl
 * @param {{ eventId?: string }} [opts]
 * @returns {string}
 */
export function buildShareUrl(baseUrl, { eventId } = {}) {
  const url = new URL(baseUrl);
  if (eventId) url.searchParams.set("event", eventId);
  return url.toString();
}

