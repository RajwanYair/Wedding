/**
 * src/services/sheets.js — Sync facade + raw Sheets implementation (S3.10 / S169)
 *
 * Public API consumed by all section modules.
 * Owns the write queue, debounce, retry, and status management.
 * Actual backend I/O (Google Sheets raw calls, schema, pull/push) lives in
 * the second half of this file — previously in sheets-impl.js (merged S169).
 *
 * Sections continue to `import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js"`.
 */

import { DEBOUNCE_MS, MAX_RETRIES, BACKOFF_BASE_MS } from "../core/config.js";
import { storageGet, storageSet, storageRemove } from "../core/storage.js";
import { getSheetsWebAppUrl, getSpreadsheetId } from "../core/app-config.js";
import { storeGet, storeSet } from "../core/store.js";
import { registerBackgroundSync } from "./background-sync.js";
import {
  syncStoreKey,
  appendRsvpLog,
  checkConnection,
  createMissingTabs,
  pullAll,
  pushAll,
  getBackendType,
} from "./backend.js";

/** @type {Map<string, { syncFn: () => Promise<void>, timer: ReturnType<typeof setTimeout> | null }>} */
const _queue = new Map();

/** @type {'idle'|'syncing'|'synced'|'error'} */
let _syncStatus = "idle";

/** @type {((status: 'idle'|'syncing'|'synced'|'error') => void) | null} */
let _onStatusChange = null;

/**
 * Register a status-change listener.
 * @param {(status: 'idle'|'syncing'|'synced'|'error') => void} fn
 */
export function onSyncStatus(fn) {
  _onStatusChange = fn;
}

function _setStatus(/** @type {'idle'|'syncing'|'synced'|'error'} */ s) {
  _syncStatus = s;
  _onStatusChange?.(s);
}

/**
 * Return current sync status.
 * @returns {'idle'|'syncing'|'synced'|'error'}
 */
export function syncStatus() {
  return _syncStatus;
}

/**
 * Enqueue a debounced write operation. Coalesces per `key`.
 * @param {string} key       Unique key per data type (e.g. 'guests', 'vendors')
 * @param {() => Promise<void>} syncFn  Async function that performs the actual POST
 */
export function enqueueWrite(key, syncFn) {
  const existing = _queue.get(key);
  if (existing?.timer) clearTimeout(existing.timer);
  const timer = setTimeout(() => _flush(key), DEBOUNCE_MS);
  _queue.set(key, { syncFn, timer });
  _persistQueueKeys().catch(() => {});
}

/** @type {Map<string, number>} track retry count per key */
const _retryCount = new Map();

/** @param {string} key */
async function _flush(key) {
  const entry = _queue.get(key);
  if (!entry) return;
  _queue.delete(key);
  _persistQueueKeys().catch(() => {});
  _setStatus("syncing");
  try {
    await entry.syncFn();
    _retryCount.delete(key);
    _setStatus("synced");
    // Reset to idle after a short confirmation window
    setTimeout(() => {
      if (_syncStatus === "synced" && _queue.size === 0) _setStatus("idle");
    }, 3000);
  } catch {
    const attempt = (_retryCount.get(key) ?? 0) + 1;
    if (attempt <= MAX_RETRIES) {
      _retryCount.set(key, attempt);
      const delay = BACKOFF_BASE_MS * 2 ** (attempt - 1) + Math.random() * 500;
      const timer = setTimeout(() => _flush(key), delay);
      _queue.set(key, { syncFn: entry.syncFn, timer });
      _setStatus("syncing");
    } else {
      _retryCount.delete(key);
      _setStatus("error");
      // S89: ask the SW to retry once connectivity returns.
      registerBackgroundSync().catch(() => {});
    }
  }
}

// ── Sheet name mapping ──────────────────────────────────────────────────
// (kept for mergeLastWriteWins — still used by legacy pull-refresh)

/**
 * Last-write-wins conflict resolution (S3.4).
 * @param {any[]} local
 * @param {any[]} remote
 * @returns {any[]}
 */
export function mergeLastWriteWins(local, remote) {
  const localMap = new Map(local.map((r) => [r.id, r]));
  const remoteMap = new Map(remote.map((r) => [r.id, r]));
  remoteMap.forEach((remoteRecord, id) => {
    const localRecord = localMap.get(id);
    if (!localRecord) {
      localMap.set(id, remoteRecord);
    } else {
      const localTs = localRecord.updatedAt ?? localRecord.createdAt ?? 0;
      const remoteTs = remoteRecord.updatedAt ?? remoteRecord.createdAt ?? 0;
      if (remoteTs > localTs) localMap.set(id, remoteRecord);
    }
  });
  return [...localMap.values()];
}

/**
 * S10.2 — Detect conflicts between local and remote arrays.
 * Returns an array of conflict descriptions where local and remote differ.
 * @param {any[]} local
 * @param {any[]} remote
 * @returns {Array<{ id: string, field: string, localVal: unknown, remoteVal: unknown }>}
 */
export function detectConflicts(local, remote) {
  /** @type {Array<{ id: string, field: string, localVal: unknown, remoteVal: unknown }>} */
  const conflicts = [];
  const remoteMap = new Map(remote.map((r) => [String(r.id), r]));
  for (const localRec of local) {
    const remoteRec = remoteMap.get(String(localRec.id));
    if (!remoteRec) continue;
    const localTs = localRec.updatedAt ?? localRec.createdAt ?? "";
    const remoteTs = remoteRec.updatedAt ?? remoteRec.createdAt ?? "";
    // Only flag if both sides changed (different timestamps)
    if (localTs === remoteTs) continue;
    for (const key of Object.keys(remoteRec)) {
      if (key === "updatedAt" || key === "createdAt") continue;
      const lv = localRec[key];
      const rv = remoteRec[key];
      if (JSON.stringify(lv) !== JSON.stringify(rv)) {
        conflicts.push({ id: String(localRec.id), field: key, localVal: lv, remoteVal: rv });
      }
    }
  }
  return conflicts;
}

// ── Backend-delegated sync functions ────────────────────────────────────
// These keep the same names so that all section imports stay unchanged.

/**
 * Sync all records of a store key to the active backend.
 * @param {string} storeKey   e.g. "guests", "vendors", "expenses"
 * @returns {Promise<void>}
 */
export async function syncStoreKeyToSheets(storeKey) {
  return syncStoreKey(storeKey);
}

/**
 * POST to the active backend (Sheets-specific — delegates via backend.js).
 * Kept for backward compat with direct callers; prefers backend dispatcher.
 * @param {Record<string, unknown>} payload
 * @returns {Promise<unknown>}
 */
export async function sheetsPost(payload) {
  return sheetsPostImpl(payload);
}

/**
 * Read data from Google Sheets via GViz query (Sheets-specific).
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function sheetsRead(spreadsheetId, sheetName) {
  return sheetsReadImpl(spreadsheetId, sheetName);
}

/**
 * Flush all queued writes immediately (e.g. triggered by "Sync Now" button).
 * @returns {Promise<void>}
 */
export async function syncSheetsNow() {
  const keys = [..._queue.keys()];
  await Promise.allSettled(keys.map((k) => _flush(k)));
}

/**
 * S3.9 — Offline-to-online sync.
 * Registers a window "online" listener that flushes the write queue
 * whenever the browser regains network connectivity.
 * Also sets up "offline", and "visibilitychange" listeners.
 */
export function initOnlineSync() {
  window.addEventListener(
    "online",
    () => {
      if (_queue.size > 0) {
        syncSheetsNow();
      }
    },
    { passive: true },
  );

  window.addEventListener(
    "offline",
    () => {
      _setStatus("idle");
    },
    { passive: true },
  );

  // F2.4 — Flush queued writes when the tab becomes visible again
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "visible" && _queue.size > 0 && navigator.onLine) {
        syncSheetsNow();
      }
    },
    { passive: true },
  );
}

// ── F2.4 Queue persistence ──────────────────────────────────────────────
const _PENDING_KEYS_STORAGE = "wedding_offline_queue_keys";

/**
 * Persist the set of queued store-key names so they survive a page reload.
 * On next load, the app can re-enqueue writes for these keys.
 */
async function _persistQueueKeys() {
  const keys = [..._queue.keys()];
  if (keys.length > 0) {
    await storageSet(_PENDING_KEYS_STORAGE, JSON.stringify(keys));
  } else {
    await storageRemove(_PENDING_KEYS_STORAGE);
  }
}

/**
 * Recover queued keys from storage after a page reload.
 * Must be called after initStorage() and after store has been loaded.
 * @param {(key: string) => () => Promise<void>} syncFnFactory
 *   Given a store key, returns the async sync function for that key.
 * @returns {Promise<string[]>} The keys that were recovered
 */
export async function recoverOfflineQueue(syncFnFactory) {
  const raw = await storageGet(_PENDING_KEYS_STORAGE);
  if (!raw) return [];
  try {
    const keys = JSON.parse(raw);
    if (!Array.isArray(keys)) return [];
    for (const key of keys) {
      if (typeof key === "string") {
        enqueueWrite(key, syncFnFactory(key));
      }
    }
    await storageRemove(_PENDING_KEYS_STORAGE);
    return keys;
  } catch {
    return [];
  }
}

/**
 * Verify the active backend is reachable.
 * @returns {Promise<boolean>}
 */
export async function sheetsCheckConnection() {
  return checkConnection();
}

/**
 * Create missing tables/tabs on the active backend.
 * @returns {Promise<unknown>}
 */
export async function createMissingSheetTabs() {
  return createMissingTabs();
}

/**
 * Append a single RSVP log entry to the active backend.
 * Delegates to backend.js → sheets-impl (RSVP_Log sheet) or supabase (rsvp_log table).
 * @param {{ phone: string, firstName: string, lastName: string, status: string, count: number, timestamp: string }} entry
 * @returns {Promise<void>}
 */
export async function appendToRsvpLog(entry) {
  return appendRsvpLog(entry);
}

/**
 * Pull all sheets data into the local store (two-way sync: Sheets → App).
 * @returns {Promise<Record<string, number>>}  counts per store key
 */
export async function pullFromSheets() {
  return pullAll();
}

/**
 * Force-push ALL local stores to Google Sheets regardless of what is in the
 * write queue. Useful to seed column headers on a fresh spreadsheet or to do
 * a one-shot full sync.
 * @returns {Promise<Record<string, number>>}  row counts written per store key
 */
export async function pushAllToSheets() {
  return pushAll();
}

/**
 * Re-export for callers that need the current backend type.
 */
export { getBackendType };

// ── S10.1 Polling-based live sync ─────────────────────────────────────────

/** @type {ReturnType<typeof setInterval> | null} */
let _pollTimer = null;

/** Default poll interval: 30 seconds */
const _DEFAULT_POLL_MS = 30_000;

/**
 * Start polling for remote changes at a configurable interval.
 * Calls pullFromSheets() silently at each interval.
 * @param {number} [intervalMs] Poll interval in milliseconds (default 30 000)
 * @returns {() => void} Stop function
 */
export function startLiveSync(intervalMs = _DEFAULT_POLL_MS) {
  stopLiveSync();
  _pollTimer = setInterval(async () => {
    if (!navigator.onLine) return;
    try {
      await pullAll();
    } catch {
      // silent — next tick will retry
    }
  }, intervalMs);
  return stopLiveSync;
}

/**
 * Stop the live sync polling.
 */
export function stopLiveSync() {
  if (_pollTimer !== null) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}



// ── S18.1 Queue Monitor ───────────────────────────────────────────────────

/**
 * Return the number of pending write entries in the queue.
 * @returns {number}
 */
export function queueSize() {
  return _queue.size;
}

/**
 * Return an array of pending queue keys.
 * @returns {string[]}
 */
export function queueKeys() {
  return [..._queue.keys()];
}

// ── S169 — Inlined from sheets-impl.js ────────────────────────────────────
// Previously in src/services/sheets-impl.js; merged here to remove the extra
// indirection layer. backend.js now dynamically imports sheets.js directly.

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
    const obj = /** @type {Record<string, unknown>} */ (storeGet(storeKey) ?? {});
    const canonical = /** @type {Record<string, unknown>} */ (
      Object.fromEntries(_WEDDING_INFO_KEYS.map((k) => [k, ""]))
    );
    const merged = { ...canonical, ...obj };
    const canonicalRows = _WEDDING_INFO_KEYS.map((k) => [k, merged[k] ?? ""]);
    const extraKeys = Object.keys(merged).filter((k) => !_WEDDING_INFO_KEYS.includes(k));
    const extraRows = extraKeys.map((k) => [k, merged[k] ?? ""]);
    rows = [["key", "value"], ...canonicalRows, ...extraRows];
  } else if (storeKey === "timelineDone") {
    const obj = /** @type {Record<string, boolean>} */ (storeGet(storeKey) ?? {});
    const dataRows = Object.entries(obj).map(([k, v]) => [k, String(v)]);
    rows = [["itemId", "done"], ...dataRows];
  } else {
    const cols = _COL_ORDER[storeKey];
    const records = /** @type {any[]} */ (storeGet(storeKey) ?? []);
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
 * @returns {Promise<Record<string, number>>}  counts of records per store key
 */
export async function pullAllFromSheetsImpl() {
  /** @type {Record<string, number>} */
  const results = {};

  const arraySheets = /** @type {Array<[string, string]>} */ (
    Object.entries(_SHEET_NAMES).filter(([k]) => !_MAP_KEYS.has(k))
  );
  for (const [storeKey, sheetName] of arraySheets) {
    const rows = await sheetsReadImpl(_getSpreadsheetId(), sheetName);
    const valid = rows.filter((r) => r.id != null && String(r.id).trim() !== "");
    const coerced = valid.map((r) => _coerceRecord(r, storeKey));
    const existing = /** @type {any[]} */ (storeGet(storeKey) ?? []);
    const localMap = new Map(existing.map((r) => [String(r.id), r]));
    const merged = coerced.map((sheetRow) => {
      const local = localMap.get(String(sheetRow.id));
      return local ? { ...local, ...sheetRow } : sheetRow;
    });
    storeSet(storeKey, merged);
    results[storeKey] = merged.length;
  }

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
 * Full schema handshake: fetch server schema and validate it (F2.1.3).
 * @param {string} [clientVersion]
 * @returns {Promise<{ ok: boolean, errors: string[], serverVersion: string | undefined }>}
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

/**
 * Flush all pending write queue entries immediately.
 * Called by the Background Sync handler in ui.js when the SW sends
 * RSVP_SYNC_READY (i.e., network is back after an offline submission). (S18b)
 * @returns {Promise<void>}
 */
export async function flushWriteQueue() {
  const keys = [..._queue.keys()];
  await Promise.allSettled(keys.map((k) => _flush(k)));
}
