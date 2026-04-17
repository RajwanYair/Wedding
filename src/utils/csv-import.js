/**
 * src/utils/csv-import.js — Guest CSV import/export (Sprint 94)
 *
 * Pure CSV parser/serialiser with no external dependencies.
 * Handles: quoted fields, embedded commas, LF and CRLF line endings.
 */

/**
 * @typedef {{ firstName: string, lastName: string, phone?: string, email?: string,
 *             count?: number, status?: string, side?: string, group?: string,
 *             meal?: string, notes?: string }} GuestRow
 */

/** Columns that are exported / expected on import. */
export const GUEST_CSV_COLUMNS = [
  "firstName", "lastName", "phone", "email",
  "count", "status", "side", "group", "meal", "notes",
];

// ── Parser ────────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of raw string objects.
 * @param {string} csv
 * @returns {Record<string, string>[]}
 */
export function parseCsv(csv) {
  const rows = splitCsvRows(csv.trim());
  if (rows.length < 2) return [];

  const headers = parseRow(rows[0]).map((h) => h.trim());
  const result = [];

  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    const values = parseRow(rows[i]);
    /** @type {Record<string, string>} */
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j] ?? "";
    }
    result.push(obj);
  }

  return result;
}

/**
 * Split CSV text into row strings (preserving quoted newlines).
 * @param {string} csv
 * @returns {string[]}
 */
function splitCsvRows(csv) {
  const rows = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      inQuote = !inQuote;
      current += ch;
    } else if ((ch === "\n" || (ch === "\r" && csv[i + 1] === "\n")) && !inQuote) {
      if (ch === "\r") i++;
      rows.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) rows.push(current);
  return rows;
}

/**
 * Parse one CSV row into a string array.
 * @param {string} row
 * @returns {string[]}
 */
function parseRow(row) {
  const fields = [];
  let field = "";
  let inQuote = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuote && row[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      fields.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

// ── Coercion ──────────────────────────────────────────────────────────────

/**
 * Map raw CSV row strings to a GuestRow.
 * @param {Record<string, string>} raw
 * @returns {GuestRow}
 */
export function coerceCsvRow(raw) {
  return {
    firstName: (raw.firstName ?? raw.first_name ?? "").trim(),
    lastName:  (raw.lastName  ?? raw.last_name  ?? "").trim(),
    phone:     (raw.phone     ?? "").trim() || undefined,
    email:     (raw.email     ?? "").trim() || undefined,
    count:     raw.count ? Math.max(1, parseInt(raw.count, 10) || 1) : 1,
    status:    (raw.status    ?? "pending").trim().toLowerCase(),
    side:      (raw.side      ?? "").trim().toLowerCase() || undefined,
    group:     (raw.group     ?? "").trim().toLowerCase() || undefined,
    meal:      (raw.meal      ?? "").trim().toLowerCase() || undefined,
    notes:     (raw.notes     ?? "").trim() || undefined,
  };
}

/**
 * Parse CSV and coerce all rows into GuestRow objects.
 * Skips rows without firstName and lastName.
 * @param {string} csv
 * @returns {{ rows: GuestRow[], skipped: number }}
 */
export function importGuestsFromCsv(csv) {
  const raw = parseCsv(csv);
  let skipped = 0;
  const rows = [];

  for (const r of raw) {
    const g = coerceCsvRow(r);
    if (!g.firstName || !g.lastName) { skipped++; continue; }
    rows.push(g);
  }

  return { rows, skipped };
}

// ── Serialiser ────────────────────────────────────────────────────────────

/**
 * Escape a value for CSV output.
 * @param {unknown} val
 * @returns {string}
 */
function escapeCsv(val) {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export an array of guest objects to a CSV string.
 * @param {Record<string, unknown>[]} guests
 * @param {string[]} [columns]
 * @returns {string}
 */
export function exportGuestsToCsv(guests, columns = GUEST_CSV_COLUMNS) {
  const header = columns.join(",");
  const bodyRows = guests.map((g) =>
    columns.map((col) => escapeCsv(g[col])).join(",")
  );
  return [header, ...bodyRows].join("\n");
}
