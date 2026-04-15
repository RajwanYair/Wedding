/**
 * src/services/backend.js — Backend dispatcher (S3.10)
 *
 * Unified sync interface that routes to Google Sheets or Supabase based on
 * the user's `backendType` runtime setting (localStorage) or the build-time
 * `BACKEND_TYPE` config constant.
 *
 * Sections never call this directly — they import from sheets.js which
 * delegates via this module.
 */

import { BACKEND_TYPE as _CONFIG_BACKEND } from "../core/config.js";
import { load } from "../core/state.js";

// ── Lazy imports (avoid circular) ────────────────────────────────────────
/** @type {typeof import('./sheets.js').syncStoreKeyToSheets | null} */
let _sheetSync = null;
/** @type {typeof import('./sheets.js').appendToRsvpLog | null} */
let _sheetLog = null;
/** @type {typeof import('./sheets.js').sheetsCheckConnection | null} */
let _sheetCheck = null;
/** @type {typeof import('./sheets.js').createMissingSheetTabs | null} */
let _sheetCreate = null;
/** @type {typeof import('./sheets-impl.js').pullAllFromSheetsImpl | null} */
let _sheetPull = null;

/** @type {typeof import('./supabase.js').syncStoreKeyToSupabase | null} */
let _sbSync = null;
/** @type {typeof import('./supabase.js').appendToRsvpLogSupabase | null} */
let _sbLog = null;
/** @type {typeof import('./supabase.js').supabaseCheckConnection | null} */
let _sbCheck = null;

/**
 * Return the active backend type.
 * Priority: runtime localStorage → build-time config → "sheets".
 * @returns {'sheets'|'supabase'|'none'}
 */
export function getBackendType() {
  const stored = /** @type {string} */ (load("backendType", "") ?? "");
  const val = stored.trim() || _CONFIG_BACKEND || "sheets";
  if (val === "supabase" || val === "none") return val;
  return "sheets";
}

// ── Dynamic loader (called once per backend) ─────────────────────────────

async function _loadSheetsModule() {
  if (_sheetSync) return;
  const m = await import("./sheets-impl.js");
  _sheetSync = m.syncStoreKeyToSheetsImpl;
  _sheetLog = m.appendToRsvpLogImpl;
  _sheetCheck = m.sheetsCheckConnectionImpl;
  _sheetCreate = m.createMissingSheetTabsImpl;
  _sheetPull = m.pullAllFromSheetsImpl;
}

async function _loadSupabaseModule() {
  if (_sbSync) return;
  const m = await import("./supabase.js");
  _sbSync = m.syncStoreKeyToSupabase;
  _sbLog = m.appendToRsvpLogSupabase;
  _sbCheck = m.supabaseCheckConnection;
}

// ── Dispatch API ─────────────────────────────────────────────────────────

/**
 * Sync a store key to the active backend.
 * @param {string} storeKey
 * @returns {Promise<void>}
 */
export async function syncStoreKey(storeKey) {
  const backend = getBackendType();
  if (backend === "none") return;
  if (backend === "supabase") {
    await _loadSupabaseModule();
    return _sbSync?.(storeKey);
  }
  await _loadSheetsModule();
  return _sheetSync?.(storeKey);
}

/**
 * Append an RSVP log entry to the active backend.
 * @param {{ phone: string, firstName: string, lastName: string, status: string, count: number, timestamp: string }} entry
 * @returns {Promise<void>}
 */
export async function appendRsvpLog(entry) {
  const backend = getBackendType();
  if (backend === "none") return;
  if (backend === "supabase") {
    await _loadSupabaseModule();
    return _sbLog?.(entry);
  }
  await _loadSheetsModule();
  return _sheetLog?.(entry);
}

/**
 * Check connection to the active backend.
 * @returns {Promise<boolean>}
 */
export async function checkConnection() {
  const backend = getBackendType();
  if (backend === "none") return false;
  if (backend === "supabase") {
    await _loadSupabaseModule();
    return _sbCheck?.() ?? false;
  }
  await _loadSheetsModule();
  return _sheetCheck?.() ?? false;
}

/**
 * Create missing tables/tabs (Sheets-specific; no-op for Supabase).
 * @returns {Promise<unknown>}
 */
export async function createMissingTabs() {
  const backend = getBackendType();
  if (backend === "sheets") {
    await _loadSheetsModule();
    return _sheetCreate?.();
  }
  return undefined;
}

/**
 * Pull all data from the active backend into the local store.
 * Sheets-only — no-op for Supabase or none.
 * @returns {Promise<Record<string, number>>}
 */
export async function pullAll() {
  if (getBackendType() !== "sheets") return {};
  await _loadSheetsModule();
  return _sheetPull?.() ?? {};
}
