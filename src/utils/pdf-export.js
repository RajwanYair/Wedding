/**
 * src/utils/pdf-export.js — Print-to-PDF helpers (Sprint 57)
 *
 * Uses window.open() + CSS @media print — zero dependencies.
 * The exported functions open a new browser window ready for Ctrl+P / Save as PDF.
 *
 * Exports:
 *   buildPrintHtml(title, columns, rows, opts?) → string
 *   printGuestList()                            — opens printable guest roster
 *   printTableLayout()                          — opens printable table seating map
 */

import { storeGet } from "../core/store.js";
import { t } from "../core/i18n.js";

// ── Core print-page builder ────────────────────────────────────────────────

/**
 * @typedef {{ label: string; key: string; align?: "start"|"end"|"center" }} PrintColumn
 */

/**
 * Build a self-contained printable HTML document as a string.
 *
 * @param {string} title
 * @param {PrintColumn[]} columns
 * @param {Record<string, unknown>[]} rows
 * @param {{ footer?: string; dir?: "ltr"|"rtl" }} [opts]
 * @returns {string}
 */
export function buildPrintHtml(title, columns, rows, opts = {}) {
  const dir = opts.dir ?? "rtl";
  const footer = opts.footer ?? "";

  const thead = columns.map((c) => `<th>${c.label}</th>`).join("");
  const tbody = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const val = row[c.key];
          const text = val === null || val === undefined ? "" : String(val);
          const align = c.align ? ` style="text-align:${c.align}"` : "";
          return `<td${align}>${text}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return [
    `<!DOCTYPE html><html dir="${dir}" lang="${dir === "rtl" ? "he" : "en"}">`,
    "<head>",
    `<meta charset="utf-8"><title>${title}</title>`,
    "<style>",
    "body{font-family:Arial,sans-serif;margin:0;padding:1rem;color:#000;background:#fff}",
    "h1{font-size:1.1rem;margin:0 0 0.5rem}",
    "table{width:100%;border-collapse:collapse;font-size:0.82rem}",
    "th,td{border:1px solid #ccc;padding:0.3rem 0.5rem;text-align:start}",
    "thead{background:#f0f0f0}",
    "tr:nth-child(even){background:#fafafa}",
    "footer{font-size:0.7rem;color:#888;margin-top:1rem;text-align:center}",
    "@media print{",
    "  @page{margin:1cm}",
    "  body{padding:0}",
    "  button,.no-print{display:none!important}",
    "}",
    "</style>",
    "</head>",
    "<body>",
    `<h1>${title}</h1>`,
    `<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`,
    footer ? `<footer>${footer}</footer>` : "",
    "</body></html>",
  ].join("");
}

// ── Guest list export ──────────────────────────────────────────────────────

/**
 * Open a printable guest list in a new window.
 * Includes: name, phone, status, table, count.
 */
export function printGuestList() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const tableMap = /** @type {Record<string,string>} */ (
    Object.fromEntries(tables.map((tb) => [tb.id, tb.name ?? tb.id]))
  );

  const title = t("btn_export_pdf_guests");
  const columns = /** @type {PrintColumn[]} */ ([
    { label: t("col_name") || "שם", key: "name" },
    { label: t("col_phone") || "טלפון", key: "phone" },
    { label: t("col_status") || "סטטוס", key: "status" },
    { label: t("col_table") || "שולחן", key: "table" },
    { label: t("col_count") || "מספר", key: "count", align: "center" },
  ]);

  const rows = guests.map((g) => ({
    name: `${g.firstName ?? ""} ${g.lastName ?? ""}`.trim(),
    phone: g.phone ?? "",
    status: t(`status_${g.status}`) || g.status || "",
    table: g.tableId ? (tableMap[g.tableId] ?? g.tableId) : "",
    count: g.count ?? 1,
  }));

  const footer = t("pdf_footer_guests") || `${title} — ${new Date().toLocaleDateString("he-IL")}`;
  const html = buildPrintHtml(title, columns, rows, { footer });
  _openPrintWindow(html);
}

// ── Table layout export ───────────────────────────────────────────────────

/**
 * Open a printable table seating layout in a new window.
 * Each table row lists: table name, capacity, guests assigned, names.
 */
export function printTableLayout() {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);

  const title = t("btn_export_pdf_tables");
  const columns = /** @type {PrintColumn[]} */ ([
    { label: t("col_table_name") || "שולחן", key: "name" },
    { label: t("col_capacity") || "קיבולת", key: "capacity", align: "center" },
    { label: t("col_assigned") || "משויכים", key: "assigned", align: "center" },
    { label: t("col_guests") || "אורחים", key: "guestNames" },
  ]);

  const rows = tables.map((tb) => {
    const seated = guests.filter((g) => g.tableId === tb.id && g.status !== "declined");
    const names = seated
      .map((g) => `${g.firstName ?? ""} ${g.lastName ?? ""}`.trim())
      .join(", ");
    return {
      name: tb.name ?? tb.id,
      capacity: tb.capacity ?? "",
      assigned: seated.length,
      guestNames: names,
    };
  });

  const footer = t("pdf_footer_tables") || `${title} — ${new Date().toLocaleDateString("he-IL")}`;
  const html = buildPrintHtml(title, columns, rows, { footer });
  _openPrintWindow(html);
}

// ── Internal helper ────────────────────────────────────────────────────────

/**
 * @param {string} html
 */
function _openPrintWindow(html) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
