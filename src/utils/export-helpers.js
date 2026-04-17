/**
 * src/utils/export-helpers.js — CSV and JSON export utilities (Sprint 33)
 *
 * Provides purely functional helpers to convert app data models to
 * exportable formats and trigger browser downloads.  No DOM side-effects
 * in the conversion functions; only `downloadFile` touches window/document.
 *
 * Usage:
 *   import { guestsToCSV, jsonToBlob, downloadFile } from "../utils/export-helpers.js";
 *
 *   const csv = guestsToCSV(guests);
 *   downloadFile(csv, "guests.csv", "text/csv");
 */

// ── CSV helpers ────────────────────────────────────────────────────────────

/**
 * Escape a single CSV cell value.
 * Wraps in double-quotes when the value contains a comma, newline or quote.
 * @param {unknown} raw
 * @returns {string}
 */
export function escapeCSV(raw) {
  const s = raw === null || raw === undefined ? "" : String(raw);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convert an array of objects to a CSV string.
 * The first row is a header derived from the keys of the first object.
 * Missing keys in subsequent rows produce empty cells.
 *
 * @param {Record<string, unknown>[]} rows
 * @param {{ columns?: string[] }} [opts]  Optional explicit column order
 * @returns {string}  UTF-8 CSV (BOM-prefixed for Excel compatibility)
 */
export function rowsToCSV(rows, opts = {}) {
  if (!rows.length) return "\uFEFF";

  const columns = opts.columns ?? Object.keys(rows[0]);
  const header = columns.map(escapeCSV).join(",");
  const body = rows.map((row) =>
    columns.map((col) => escapeCSV(row[col])).join(","),
  );

  return `\uFEFF${header}\n${body.join("\n")}`;
}

/**
 * Convert guests to a CSV string with canonical column order.
 *
 * @param {import('../types').Guest[]} guests
 * @returns {string}
 */
export function guestsToCSV(guests) {
  const COLUMNS = [
    "id", "firstName", "lastName", "phone", "email",
    "count", "children", "status", "side", "group",
    "meal", "mealNotes", "accessibility", "tableId",
    "gift", "notes", "sent", "checkedIn", "rsvpDate",
    "createdAt", "updatedAt",
  ];
  return rowsToCSV(/** @type {Record<string,unknown>[]} */ (guests), { columns: COLUMNS });
}

/**
 * Convert vendors to a CSV string with canonical column order.
 *
 * @param {import('../types').Vendor[]} vendors
 * @returns {string}
 */
export function vendorsToCSV(vendors) {
  const COLUMNS = [
    "id", "category", "name", "contact", "phone",
    "price", "paid", "notes", "createdAt", "updatedAt",
  ];
  return rowsToCSV(/** @type {Record<string,unknown>[]} */ (vendors), { columns: COLUMNS });
}

/**
 * Convert expenses to a CSV string.
 * @param {import('../types').Expense[]} expenses
 * @returns {string}
 */
export function expensesToCSV(expenses) {
  const COLUMNS = ["id", "category", "description", "amount", "date", "createdAt"];
  return rowsToCSV(/** @type {Record<string,unknown>[]} */ (expenses), { columns: COLUMNS });
}

// ── JSON helpers ───────────────────────────────────────────────────────────

/**
 * Serialize a value to indented JSON, suitable for export.
 * Handles circular references by replacing them with "[circular]".
 *
 * @param {unknown} data
 * @param {number} [indent]  Default 2
 * @returns {string}
 */
export function toJSON(data, indent = 2) {
  const seen = new WeakSet();
  return JSON.stringify(
    data,
    (_key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[circular]";
        seen.add(val);
      }
      return val;
    },
    indent,
  );
}

/**
 * Create a Blob from a JSON-serializable value.
 * @param {unknown} data
 * @returns {Blob}
 */
export function jsonToBlob(data) {
  return new Blob([toJSON(data)], { type: "application/json" });
}

// ── Download ───────────────────────────────────────────────────────────────

/**
 * Trigger a browser file download.
 * Safe to call only in browser contexts (not in tests/node by default).
 *
 * @param {string | Blob} content  String or Blob to download
 * @param {string} filename
 * @param {string} [mimeType]  Default "text/plain"
 */
export function downloadFile(content, filename, mimeType = "text/plain") {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Clean up after next task tick
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Parse a CSV string (with optional BOM) back to an array of objects.
 * The first row is treated as the header.
 *
 * @param {string} csv
 * @returns {Record<string, string>[]}
 */
export function parseCSV(csv) {
  const stripped = csv.startsWith("\uFEFF") ? csv.slice(1) : csv;
  const lines = stripped.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = _splitCSVRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = _splitCSVRow(line);
    /** @type {Record<string, string>} */
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

/**
 * Split a single CSV row respecting quoted cells.
 * @param {string} row
 * @returns {string[]}
 */
function _splitCSVRow(row) {
  const cells = /** @type {string[]} */ ([]);
  let current = "";
  let inQuote = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuote && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  cells.push(current);
  return cells;
}
