/**
 * src/services/sheets-impl.js — Google Sheets raw sync implementation
 *
 * Extracted from sheets.js so that backend.js can lazy-import it
 * without circular dependencies. NOT imported by sections directly.
 */

import { getSheetsWebAppUrl, getSpreadsheetId } from "../core/app-config.js";
import { storeGet, storeSet } from "../core/store.js";

/**
 * Runtime-overridable Sheets Web App URL (S9.3: per-event scoped).
 * @returns {string}
 */
function _getWebAppUrl() {
  return getSheetsWebAppUrl();
}

/**
 * Runtime-overridable Spreadsheet ID (S9.3: per-event scoped).
 * @returns {string}
 */
function _getSpreadsheetId() {
  return getSpreadsheetId();
}

// ── Sheet name mapping ──────────────────────────────────────────────────
/** @type {Record<string, string>} */
const _SHEET_NAMES = {
  guests: "Attendees",
  tables: "Tables",
  vendors: "Vendors",
  expenses: "Expenses",
  budget: "Budget",
  timeline: "Timeline",
  contacts: "Contacts",
  gallery: "Gallery",
  weddingInfo: "Config",
  timelineDone: "TimelineDone",
};

/** Store keys that use key-value (map) format instead of array rows. */
const _MAP_KEYS = new Set(["weddingInfo", "timelineDone"]);

/**
 * Canonical ordered list of all weddingInfo keys that must always appear
 * in the Config sheet, even when empty. Add new keys here as they are introduced.
 * Keeps the sheet schema stable regardless of what the user has filled in.
 */
const _WEDDING_INFO_KEYS = [
  "groom",
  "bride",
  "groomEn",
  "brideEn",
  "date",
  "hebrewDate",
  "time",
  "ceremonyTime",
  "rsvpDeadline",
  "venue",
  "venueAddress",
  "venueWaze",
  "venueMapLink",
  "budgetTarget",
  "registryLinks",
];

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
    "checkedIn",
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
  budget: ["id", "name", "amount", "note", "createdAt", "updatedAt"],
  timeline: ["id", "time", "title", "note", "icon"],
  contacts: [
    "id",
    "firstName",
    "lastName",
    "phone",
    "email",
    "side",
    "dietaryNotes",
    "submittedAt",
  ],
  gallery: ["id", "caption", "credit", "addedAt"],
};

// F1.5.4 — Column order validation (dev-only guard)
for (const [key, cols] of Object.entries(_COL_ORDER)) {
  if (!Array.isArray(cols) || cols.length === 0)
    console.warn(`_COL_ORDER[${key}] must be a non-empty array`);
  if (cols[0] !== "id")
    console.warn(`_COL_ORDER[${key}] first column must be "id", got "${cols[0]}"`);
  if (new Set(cols).size !== cols.length) console.warn(`_COL_ORDER[${key}] has duplicate columns`);
}

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
 * F2.1.6: Handles HTTP 429 (Too Many Requests) with exponential backoff.
 * @param {Record<string, unknown>} payload
 * @returns {Promise<unknown>}
 */
export async function sheetsPostImpl(payload) {
  const url = _getWebAppUrl();
  if (!url) throw new Error("SHEETS_WEBAPP_URL not configured");

  const _MAX_429_RETRIES = 3;
  const _429_BASE_MS = 3000;

  for (let attempt = 0; attempt <= _MAX_429_RETRIES; attempt++) {
    const resp = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
    if (resp.status === 429 && attempt < _MAX_429_RETRIES) {
      const delay = _429_BASE_MS * 2 ** attempt + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }
  throw new Error("Max retries exceeded");
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
  let rows;
  if (storeKey === "weddingInfo") {
    // Single config object → key-value rows with header (enables GViz pull).
    // Merge canonical key schema with store values so every key is always
    // present in the sheet — even if the user hasn't set it yet — and the
    // order is deterministic. Store-only keys (e.g. set by future features)
    // are appended after the canonical keys.
    const obj = /** @type {Record<string, unknown>} */ (storeGet(storeKey) ?? {});
    const canonical = /** @type {Record<string, unknown>} */ (
      Object.fromEntries(_WEDDING_INFO_KEYS.map((k) => [k, ""]))
    );
    const merged = { ...canonical, ...obj };
    // Put canonical keys first in defined order, then any extra keys
    const canonicalRows = _WEDDING_INFO_KEYS.map((k) => [k, merged[k] ?? ""]);
    const extraKeys = Object.keys(merged).filter((k) => !_WEDDING_INFO_KEYS.includes(k));
    const extraRows = extraKeys.map((k) => [k, merged[k] ?? ""]);
    rows = [["key", "value"], ...canonicalRows, ...extraRows];
  } else if (storeKey === "timelineDone") {
    // timelineDone is a plain { itemId: boolean } map → key-value rows
    const obj = /** @type {Record<string, boolean>} */ (storeGet(storeKey) ?? {});
    const dataRows = Object.entries(obj).map(([k, v]) => [k, String(v)]);
    rows = [["itemId", "done"], ...dataRows];
  } else {
    const cols = _COL_ORDER[storeKey];
    const records = /** @type {any[]} */ (storeGet(storeKey) ?? []);
    // Prepend header row so GViz can map column names when pulling
    rows = cols
      ? [cols, ...records.map((r) => _recordToRow(r, storeKey))]
      : records.map((r) => _recordToRow(r, storeKey));
  }
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
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`);
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
      const key = cols[i];
      if (key !== undefined) obj[key] = cell?.v ?? null;
    });
    return obj;
  });
}

// ── Pull from Sheets (two-way sync) ────────────────────────────────────────

/** @type {Record<string, string[]>} */
const _NUM_FIELDS = {
  guests: ["count", "children"],
  tables: ["capacity"],
  vendors: ["price", "paid"],
  expenses: ["amount"],
  budget: ["amount"],
  timeline: [],
  contacts: [],
  gallery: [],
};

/** @type {Record<string, string[]>} */
const _BOOL_FIELDS = {
  guests: ["sent", "accessibility", "checkedIn"],
};

/**
 * Coerce GViz-returned field types to their expected JS types.
 * @param {Record<string, unknown>} row
 * @param {string} storeKey
 * @returns {Record<string, unknown>}
 */
function _coerceRecord(row, storeKey) {
  const out = { ...row };
  (_NUM_FIELDS[storeKey] ?? []).forEach((f) => {
    if (out[f] != null && out[f] !== "") out[f] = Number(out[f]) || 0;
  });
  (_BOOL_FIELDS[storeKey] ?? []).forEach((f) => {
    if (typeof out[f] === "string") {
      out[f] = out[f].toLowerCase() === "true" || out[f] === "1";
    }
  });
  return out;
}

/**
 * Pull all data from Google Sheets via GViz and merge into the local store.
 * Requires the spreadsheet to be shared ("Anyone with the link can view").
 * Sheets must have been pushed at least once (to establish column header rows).
 * @returns {Promise<Record<string, number>>}  counts of records per store key
 */
export async function pullAllFromSheetsImpl() {
  /** @type {Record<string, number>} */
  const results = {};

  // Array sheets: pull each tab and merge by id
  const arraySheets = /** @type {Array<[string, string]>} */ (
    Object.entries(_SHEET_NAMES).filter(([k]) => !_MAP_KEYS.has(k))
  );
  for (const [storeKey, sheetName] of arraySheets) {
    const rows = await sheetsReadImpl(_getSpreadsheetId(), sheetName);
    const valid = rows.filter((r) => r.id != null && String(r.id).trim() !== "");
    const coerced = valid.map((r) => _coerceRecord(r, storeKey));
    // Merge: keep local-only fields (e.g. arrived, checkedIn) for matching IDs
    const existing = /** @type {any[]} */ (storeGet(storeKey) ?? []);
    const localMap = new Map(existing.map((r) => [String(r.id), r]));
    const merged = coerced.map((sheetRow) => {
      const local = localMap.get(String(sheetRow.id));
      return local ? { ...local, ...sheetRow } : sheetRow;
    });
    storeSet(storeKey, merged);
    results[storeKey] = merged.length;
  }

  // Config sheet: key-value rows → weddingInfo object
  const configRows = await sheetsReadImpl(_getSpreadsheetId(), /** @type {string} */ (_SHEET_NAMES["weddingInfo"]));
  /** @type {Record<string, unknown>} */
  const info = {};
  configRows.forEach((row) => {
    const key = String(row.key ?? "").trim();
    const val = row.value ?? "";
    if (key) info[key] = val;
  });
  if (Object.keys(info).length > 0) {
    const current = /** @type {Record<string, unknown>} */ (storeGet("weddingInfo") ?? {});
    storeSet("weddingInfo", { ...current, ...info });
    results.weddingInfo = Object.keys(info).length;
  }

  // TimelineDone sheet: key-value rows → { itemId: boolean } map
  try {
    const doneRows = await sheetsReadImpl(_getSpreadsheetId(), /** @type {string} */ (_SHEET_NAMES["timelineDone"]));
    /** @type {Record<string, boolean>} */
    const doneMap = {};
    doneRows.forEach((row) => {
      const key = String(row.itemId ?? "").trim();
      if (key) doneMap[key] = String(row.done).toLowerCase() === "true";
    });
    if (Object.keys(doneMap).length > 0) {
      const current = /** @type {Record<string, boolean>} */ (storeGet("timelineDone") ?? {});
      storeSet("timelineDone", { ...current, ...doneMap });
      results.timelineDone = Object.keys(doneMap).length;
    }
  } catch {
    // TimelineDone sheet may not exist yet — silently skip
  }

  return results;
}

/**
 * Push ALL stores to Google Sheets in one shot (replaceAll for each tab).
 * Pushes every key in _SHEET_NAMES regardless of the write queue.
 * For empty stores the tab will contain just the header row (column schema).
 * This is the "force full sync" used by the Push All button.
 * @returns {Promise<Record<string, number>>}  row counts written per store key
 */
export async function pushAllToSheetsImpl() {
  if (!_getWebAppUrl()) return {};
  /** @type {Record<string, number>} */
  const results = {};
  for (const storeKey of Object.keys(_SHEET_NAMES)) {
    await syncStoreKeyToSheetsImpl(storeKey);
    const data = storeGet(storeKey);
    results[storeKey] = Array.isArray(data)
      ? data.length
      : Object.keys(/** @type {object} */ (data ?? {})).length;
  }
  return results;
}

// ── F2.1.1 / F2.1.2 / F2.1.3 — Schema validation + version handshake ──

/**
 * Fetch the server schema via GAS `getSchema` action (F2.1.1).
 * Returns column order + sheet names + GAS version from the server.
 * @returns {Promise<{ colOrder?: Record<string,string[]>, sheetNames?: Record<string,string>, version?: string } | null>}
 */
export async function fetchServerSchema() {
  try {
    const result = await sheetsPostImpl({ action: "getSchema" });
    return /** @type {any} */ (result) ?? null;
  } catch {
    return null;
  }
}

/**
 * Validate the local `_COL_ORDER` against the server schema (F2.1.2).
 * Returns an array of mismatch descriptions, or empty if schemas match.
 * @param {Record<string, string[]>} serverColOrder
 * @returns {string[]}
 */
export function validateSchema(serverColOrder) {
  const errors = [];
  for (const [key, localCols] of Object.entries(_COL_ORDER)) {
    const serverCols = serverColOrder[key];
    if (!serverCols) {
      errors.push(`Missing server schema for "${key}"`);
      continue;
    }
    if (localCols.length !== serverCols.length) {
      errors.push(
        `Column count mismatch for "${key}": local=${localCols.length}, server=${serverCols.length}`,
      );
      continue;
    }
    for (let i = 0; i < localCols.length; i++) {
      if (localCols[i] !== serverCols[i]) {
        errors.push(
          `Column mismatch in "${key}" at index ${i}: local="${localCols[i]}", server="${serverCols[i]}"`,
        );
      }
    }
  }
  return errors;
}

/**
 * Perform schema + version handshake before first sync (F2.1.3).
 * Calls getSchema, validates columns, checks version compatibility.
 * @param {string} clientVersion  Current app version
 * @returns {Promise<{ ok: boolean, errors: string[], serverVersion?: string }>}
 */
export async function schemaHandshake(clientVersion) {
  const schema = await fetchServerSchema();
  if (!schema) return { ok: true, errors: [], serverVersion: undefined };

  const errors = [];

  // F2.1.2 — validate column order
  if (schema.colOrder) {
    errors.push(...validateSchema(schema.colOrder));
  }

  // F2.1.3 — version handshake
  if (schema.version && clientVersion) {
    const serverMajor = String(schema.version).split(".")[0];
    const clientMajor = clientVersion.split(".")[0];
    if (serverMajor !== clientMajor) {
      errors.push(`Major version mismatch: client=${clientVersion}, server=${schema.version}`);
    }
  }

  return { ok: errors.length === 0, errors, serverVersion: schema.version ?? undefined };
}
