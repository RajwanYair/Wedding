/**
 * src/services/sheets-impl.js — Google Sheets raw sync implementation
 *
 * Extracted from sheets.js so that backend.js can lazy-import it
 * without circular dependencies. NOT imported by sections directly.
 */

import { SHEETS_WEBAPP_URL as _CONFIG_URL } from "../core/config.js";
import { load } from "../core/state.js";
import { storeGet } from "../core/store.js";

/**
 * Runtime-overridable Sheets Web App URL.
 * @returns {string}
 */
function _getWebAppUrl() {
  const stored = load("sheetsWebAppUrl", "");
  return (stored && String(stored).trim()) || _CONFIG_URL || "";
}

// ── Sheet name mapping ──────────────────────────────────────────────────
/** @type {Record<string, string>} */
const _SHEET_NAMES = {
  guests: "Attendees",
  tables: "Tables",
  vendors: "Vendors",
  expenses: "Expenses",
  weddingInfo: "Config",
};

/**
 * Column ordering per sheet — must match GAS COL index map.
 * GAS validates by index, so order is critical.
 * @type {Record<string, string[]>}
 */
const _COL_ORDER = {
  guests: [
    "id",
    "firstName",
    "lastName",
    "phone",
    "email",
    "count",
    "children",
    "status",
    "side",
    "group",
    "relationship",
    "meal",
    "mealNotes",
    "accessibility",
    "transport",
    "tableId",
    "gift",
    "notes",
    "sent",
    "rsvpDate",
    "createdAt",
    "updatedAt",
  ],
  tables: ["id", "name", "capacity", "shape"],
  vendors: [
    "id",
    "category",
    "name",
    "contact",
    "phone",
    "price",
    "paid",
    "notes",
    "updatedAt",
    "createdAt",
  ],
  expenses: ["id", "category", "description", "amount", "date", "createdAt"],
};

/**
 * Convert a record to a row array in the correct column order for the sheet.
 * @param {Record<string, unknown>} record
 * @param {string} storeKey
 * @returns {unknown[]}
 */
function _recordToRow(record, storeKey) {
  const cols = _COL_ORDER[storeKey];
  if (cols) return cols.map((k) => record[k] ?? "");
  return Object.values(record);
}

/**
 * POST data to the Apps Script Web App.
 * @param {Record<string, unknown>} payload
 * @returns {Promise<unknown>}
 */
export async function sheetsPostImpl(payload) {
  const url = _getWebAppUrl();
  if (!url) throw new Error("SHEETS_WEBAPP_URL not configured");
  const resp = await fetch(url, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/**
 * Sync all records of a store key to their Sheets tab (replaceAll).
 * No-op when Sheets Web App URL is not configured.
 * @param {string} storeKey
 * @returns {Promise<void>}
 */
export async function syncStoreKeyToSheetsImpl(storeKey) {
  if (!_getWebAppUrl()) return;
  const sheetName = _SHEET_NAMES[storeKey];
  if (!sheetName) return;
  const records = /** @type {any[]} */ (storeGet(storeKey) ?? []);
  const rows = records.map((r) => _recordToRow(r, storeKey));
  await sheetsPostImpl({ action: "replaceAll", sheet: sheetName, rows });
}

/**
 * Append a single RSVP log entry to the RSVP_Log sheet.
 * No-op when Sheets Web App URL is not configured.
 * @param {{ phone: string, firstName: string, lastName: string, status: string, count: number, timestamp: string }} entry
 * @returns {Promise<void>}
 */
export async function appendToRsvpLogImpl(entry) {
  if (!_getWebAppUrl()) return;
  await sheetsPostImpl({
    action: "append",
    sheet: "RSVP_Log",
    row: [
      entry.timestamp,
      entry.phone,
      `${entry.firstName} ${entry.lastName}`.trim(),
      entry.status,
      entry.count,
    ],
  });
}

/**
 * Verify the Apps Script Web App is reachable.
 * @returns {Promise<boolean>}
 */
export async function sheetsCheckConnectionImpl() {
  const url = _getWebAppUrl();
  if (!url) return false;
  try {
    // GAS doGet returns { ok: true, service: 'Wedding Manager', version: '...' }
    const result = await fetch(url, { method: "GET", cache: "no-store" });
    if (!result.ok) return false;
    const data = /** @type {any} */ (await result.json());
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

/**
 * Ask the Apps Script to create any missing sheet tabs.
 * @returns {Promise<unknown>}
 */
export async function createMissingSheetTabsImpl() {
  return sheetsPostImpl({ action: "ensureSheets" });
}

/**
 * Read data from Google Sheets via GViz query.
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function sheetsReadImpl(spreadsheetId, sheetName) {
  const url = new URL(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`,
  );
  url.searchParams.set("sheet", sheetName);
  url.searchParams.set("tqx", "out:json");
  const resp = await fetch(url.toString(), { cache: "no-store" });
  const text = await resp.text();
  const json = text.replace(/^[^(]+\(/, "").replace(/\);?\s*$/, "");
  const data = JSON.parse(json);
  return _gvizToRows(data);
}

/** @param {{ table?: { cols?: Array<{ label: string }>, rows?: Array<{ c: Array<{ v: unknown } | null> }> } }} data */
function _gvizToRows(data) {
  const cols = (data?.table?.cols ?? []).map((c) => c.label || "");
  const rows = data?.table?.rows ?? [];
  return rows.map((row) => {
    /** @type {Record<string, unknown>} */
    const obj = {};
    (row.c ?? []).forEach((cell, i) => {
      obj[cols[i]] = cell?.v ?? null;
    });
    return obj;
  });
}
