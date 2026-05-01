/**
 * src/utils/guest-csv-import.js — S452: Guest CSV import
 *
 * Parses a CSV file (comma or semicolon delimited) and returns an array of
 * guest-shaped objects. Deduplicates against existing guests by phone number.
 *
 * Exports:
 *   parseCsvGuests(csvText)              → GuestRow[]
 *   importGuestsCsv(csvText, existing)   → { imported: number, skipped: number, guests: GuestRow[] }
 * @owner sections
 */

import { cleanPhone } from "./phone.js";

/** Recognised header aliases → canonical guest field */
const HEADER_MAP = {
  name: "name", שם: "name", "full name": "name", fullname: "name",
  phone: "phone", טלפון: "phone", "phone number": "phone", mobile: "phone",
  email: "email", "אימייל": "email", "דואר אלקטרוני": "email",
  notes: "notes", הערות: "notes", note: "notes",
  table: "table", שולחן: "table", "table number": "table",
  status: "status", סטטוס: "status", rsvp: "status",
  meal: "meal", ארוחה: "meal", "meal preference": "meal",
  plusone: "plusOne", "plus one": "plusOne", "plus 1": "plusOne", "ביה": "plusOne",
  side: "side", צד: "side",
  city: "city", עיר: "city",
  group: "group", קבוצה: "group",
};

/**
 * @typedef {{
 *   name: string,
 *   phone: string,
 *   email?: string,
 *   notes?: string,
 *   table?: string,
 *   status?: string,
 *   meal?: string,
 *   plusOne?: string,
 *   side?: string,
 *   city?: string,
 *   group?: string,
 * }} GuestRow
 */

/**
 * Split a CSV line respecting double-quoted fields.
 * @param {string} line
 * @param {string} delimiter
 * @returns {string[]}
 */
function _splitLine(line, delimiter) {
  const result = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === delimiter && !inQuotes) {
      result.push(field.trim());
      field = "";
    } else {
      field += ch;
    }
  }
  result.push(field.trim());
  return result;
}

/**
 * Detect the most likely delimiter in the CSV (comma or semicolon).
 * @param {string} firstLine
 * @returns {string}
 */
function _detectDelimiter(firstLine) {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

/**
 * Map a raw header string to a canonical guest field name.
 * @param {string} raw
 * @returns {string}
 */
function _mapHeader(raw) {
  const key = raw.toLowerCase().trim().replace(/\s+/g, " ");
  return HEADER_MAP[key] ?? key;
}

/**
 * Parse CSV text into an array of GuestRow objects.
 * @param {string} csvText
 * @returns {GuestRow[]}
 */
export function parseCsvGuests(csvText) {
  const lines = csvText.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delimiter = _detectDelimiter(lines[0]);
  const headers = _splitLine(lines[0], delimiter).map(_mapHeader);

  /** @type {GuestRow[]} */
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = _splitLine(lines[i], delimiter);
    if (cells.every((c) => !c)) continue; // skip blank rows
    /** @type {Record<string, string>} */
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = cells[j] ?? "";
    }
    // Require at least a name or phone
    if (!row.name && !row.phone) continue;
    rows.push(/** @type {GuestRow} */ (row));
  }
  return rows;
}

/**
 * Filter parsed guests against existing guests by normalised phone,
 * returning only new entries.
 * @param {string} csvText
 * @param {{ phone?: string }[]} existing
 * @returns {{ imported: number, skipped: number, guests: GuestRow[] }}
 */
export function importGuestsCsv(csvText, existing = []) {
  const parsed = parseCsvGuests(csvText);
  const existingPhones = new Set(
    existing.map((g) => g.phone ? cleanPhone(g.phone) : "").filter(Boolean),
  );

  /** @type {GuestRow[]} */
  const toImport = [];
  let skipped = 0;

  for (const row of parsed) {
    const norm = row.phone ? cleanPhone(row.phone) : "";
    if (norm && existingPhones.has(norm)) {
      skipped++;
    } else {
      if (norm) existingPhones.add(norm); // prevent duplicates within the CSV itself
      toImport.push(row);
    }
  }

  return { imported: toImport.length, skipped, guests: toImport };
}
