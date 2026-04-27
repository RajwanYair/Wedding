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

import { getBackendTypeConfig, getSupabaseUrl } from "../core/app-config.js";
import { STORAGE_KEYS } from "../core/constants.js";
import { load } from "../core/state.js";
import { readBrowserStorage } from "../core/storage.js";

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
/** @type {typeof import('./sheets-impl.js').pushAllToSheetsImpl | null} */
let _sheetPushAll = null;

/** @type {typeof import('./supabase.js').syncStoreKeyToSupabase | null} */
let _sbSync = null;
/** @type {typeof import('./supabase.js').appendToRsvpLogSupabase | null} */
let _sbLog = null;
/** @type {typeof import('./supabase.js').supabaseCheckConnection | null} */
let _sbCheck = null;

/**
 * Return the active backend type.
 * Priority: runtime localStorage → build-time config → "sheets".
 * @returns {'sheets'|'supabase'|'both'|'none'}
 */
export function getBackendType() {
  const stored = /** @type {string} */ (load("backendType", "") ?? "");
  const val = stored.trim() || getBackendTypeConfig();
  if (val === "supabase" || val === "none" || val === "both") return val;
  return "sheets";
}

// ── S96: Backend flip prep ────────────────────────────────────────────────
//
// v13.0 will flip the default backend from "sheets" to "supabase". These
// helpers let admins opt-in to dual-write today and let the UI surface a
// readiness check. The actual flip is gated by `BACKEND_TYPE` config.

/** Default backend candidate for the next major version. */
export const BACKEND_FLIP_CANDIDATE = "supabase";

/**
 * Whether dual-write mode is currently active. Either the build-time config
 * is "both" or the user opted in via Settings (localStorage `backendType`).
 * @returns {boolean}
 */
export function isDualWriteActive() {
  return getBackendType() === "both";
}

/**
 * Coarse readiness check for the v13 backend flip. We are "ready" when the
 * Supabase connection has been verified at least once (cached in state) AND
 * dual-write has been active long enough to mirror existing data.
 *
 * This is advisory — the source of truth is the manual flip in
 * `app-config.js`. Intended for the Settings UI to show a hint.
 *
 * @returns {{ ready: boolean, reasons: string[] }}
 */
export function isBackendFlipReady() {
  const reasons = [];
  if (!getSupabaseUrl()) reasons.push("supabase_url_missing");
  if (!isDualWriteActive()) reasons.push("dual_write_inactive");
  const lastOk = /** @type {number} */ (load("supabaseLastOkAt", 0) ?? 0);
  if (!lastOk) reasons.push("supabase_never_verified");
  return { ready: reasons.length === 0, reasons };
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
  _sheetPushAll = m.pushAllToSheetsImpl;
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
 * "both" mode writes to sheets AND supabase in parallel.
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
  if (backend === "both") {
    await Promise.all([
      _loadSheetsModule().then(() => _sheetSync?.(storeKey)),
      _loadSupabaseModule().then(() => _sbSync?.(storeKey)),
    ]);
    return;
  }
  await _loadSheetsModule();
  return _sheetSync?.(storeKey);
}

/**
 * Append an RSVP log entry to the active backend.
 * "both" mode appends to sheets AND supabase in parallel.
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
  if (backend === "both") {
    await Promise.all([
      _loadSheetsModule().then(() => _sheetLog?.(entry)),
      _loadSupabaseModule().then(() => _sbLog?.(entry)),
    ]);
    return;
  }
  await _loadSheetsModule();
  return _sheetLog?.(entry);
}

/**
 * Check connection to the active backend.
 * "both" mode checks both; falls back if primary fails (F2.2.5).
 * @returns {Promise<boolean>}
 */
export async function checkConnection() {
  const backend = getBackendType();
  if (backend === "none") return false;
  if (backend === "supabase") {
    await _loadSupabaseModule();
    return _sbCheck?.() ?? false;
  }
  if (backend === "both") {
    await Promise.all([_loadSheetsModule(), _loadSupabaseModule()]);
    const [sheetsOk, sbOk] = await Promise.all([
      _sheetCheck?.() ?? Promise.resolve(false),
      _sbCheck?.() ?? Promise.resolve(false),
    ]);
    // Log fallback status for debugging
    if (!sheetsOk && sbOk) {
      console.warn("[backend] Sheets unreachable — Supabase available (fallback)");
    } else if (sheetsOk && !sbOk) {
      console.warn("[backend] Supabase unreachable — Sheets available (fallback)");
    }
    return sheetsOk || sbOk;
  }
  // "sheets" — sheets is the primary health signal
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
 * "both" mode pulls from sheets (authoritative source).
 * Supabase-only: no-op (use supabaseRead directly for targeted reads).
 * @returns {Promise<Record<string, number>>}
 */
export async function pullAll() {
  if (getBackendType() === "supabase" || getBackendType() === "none") return {};
  await _loadSheetsModule();
  return _sheetPull?.() ?? {};
}

/**
 * Force-push ALL stores to the active backend (ignores the write queue).
 * "both" mode pushes to sheets (primary). Individual key syncs cover supabase.
 * @returns {Promise<Record<string, number>>}
 */
export async function pushAll() {
  if (getBackendType() === "supabase" || getBackendType() === "none") return {};
  await _loadSheetsModule();
  return _sheetPushAll?.() ?? {};
}

// ── Edge Function helpers (Phase 7.6) ─────────────────────────────────────

import { load as _edgeLoad } from "../core/state.js";

/**
 * Derive the Supabase Edge Function base URL.
 * @returns {string}
 */
function _edgeFnBase() {
  const stored = _edgeLoad("supabaseUrl", "");
  const base = (stored && String(stored).trim()) || getSupabaseUrl() || "";
  return base ? `${base}/functions/v1` : "";
}

/**
 * Call a Supabase Edge Function by name with a JSON body.
 * Returns null if the edge function base is not configured.
 *
 * @param {string} name   Function name (e.g. "health", "rsvp-email")
 * @param {object} [body] Request body (POST) or undefined (GET)
 * @returns {Promise<{ ok: boolean, data?: unknown, error?: string }>}
 */
export async function callEdgeFunction(name, body) {
  const base = _edgeFnBase();
  if (!base) return { ok: false, error: "not_configured" };

  const method = body !== undefined ? "POST" : "GET";
  const opts = /** @type {RequestInit} */ ({
    method,
    headers: { "Content-Type": "application/json" },
  });
  if (body !== undefined) opts.body = JSON.stringify(body);

  try {
    const resp = await fetch(`${base}/${name}`, opts);
    const data = await resp.json().catch(() => null);
    if (!resp.ok) return { ok: false, error: data?.error ?? `HTTP ${resp.status}` };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Call the health-check Edge Function.
 * @returns {Promise<{ ok: boolean, version?: string, uptime_ms?: number }>}
 */
export async function checkEdgeHealth() {
  const result = await callEdgeFunction("health");
  if (!result.ok) return { ok: false };
  const d = /** @type {Record<string, unknown>} */ (result.data ?? {});
  return {
    ok: d.status === "ok",
    version: /** @type {string | undefined} */ (d.version),
    uptime_ms: /** @type {number | undefined} */ (d.uptime_ms),
  };
}

/**
 * Send an RSVP confirmation email via the rsvp-email Edge Function.
 * Fire-and-forget — errors are logged but do not block the RSVP flow.
 *
 * @param {string} guestName
 * @param {string} guestEmail
 * @param {'confirmed'|'declined'|'maybe'} status
 * @param {{ mealChoice?: string, weddingDate?: string, venue?: string, groomName?: string, brideName?: string }} [opts]
 * @returns {Promise<void>}
 */
export async function sendRsvpEmail(guestName, guestEmail, status, opts = {}) {
  if (!guestEmail) return;
  const result = await callEdgeFunction("rsvp-email", {
    guestName,
    guestEmail,
    status,
    ...opts,
  });
  if (!result.ok) {
    console.warn("[backend] sendRsvpEmail failed:", result.error);
  }
}

// ── Phase 7.5 — Sheets Mirror via Edge Function ──────────────────────────

/**
 * Push a resource (guests / tables / vendors / expenses) to Google Sheets
 * via the `sync-to-sheets` Edge Function.
 *
 * Pass `rows` as a 2-D array (header row first).
 *
 * @param {'guests'|'tables'|'vendors'|'expenses'|'rsvp_log'} resource
 * @param {unknown[][]} rows
 * @returns {Promise<{ok: boolean, updatedCells?: number, error?: string}>}
 */
export async function syncToSheetsEdge(resource, rows) {
  return callEdgeFunction("sync-to-sheets", { resource, rows });
}

/**
 * Check whether the Sheets mirror feature is enabled in localStorage.
 * Controlled by the Settings section toggle.
 * @returns {boolean}
 */
export function isSheetsMirrorEnabled() {
  return readBrowserStorage(STORAGE_KEYS.SHEETS_MIRROR) === "true";
}

// ── Phase 10.1 — WhatsApp Cloud API client helper ─────────────────────────

/**
 * Send a WhatsApp message via the `whatsapp-send` Edge Function.
 *
 * @param {string} to - recipient E.164 phone number (digits only, no +)
 * @param {{ text?: string, template?: string, lang?: string, params?: string[] }} msg
 * @returns {Promise<{ok: boolean, messageId?: string, error?: string}>}
 */
export async function sendWhatsAppCloudMessage(to, msg) {
  return callEdgeFunction("whatsapp-send", { to, ...msg });
}

/**
 * S108 — Bulk WhatsApp send. Iterates sequentially, reports progress, and
 * tolerates per-recipient failures. Returns aggregate result.
 *
 * @param {string[]} recipients - E.164 numbers
 * @param {{ text?: string, template?: string, lang?: string, params?: string[] }} msg
 * @param {(i: number, total: number, ok: boolean) => void} [onProgress]
 * @param {(to: string, msg: object) => Promise<{ok: boolean, error?: string}>} [sender]
 *        Optional override (used by tests). Defaults to `sendWhatsAppCloudMessage`.
 * @returns {Promise<{ ok: number, failed: number, errors: Array<{to: string, error: string}> }>}
 */
export async function sendWhatsAppBulk(recipients, msg, onProgress, sender) {
  const send = sender ?? sendWhatsAppCloudMessage;
  let ok = 0;
  let failed = 0;
  /** @type {Array<{to: string, error: string}>} */
  const errors = [];
  const total = recipients.length;
  for (let i = 0; i < total; i += 1) {
    const to = recipients[i];
    try {
      const res = await send(to, msg);
      if (res?.ok) {
        ok += 1;
      } else {
        failed += 1;
        errors.push({ to, error: res?.error ?? "unknown" });
      }
      onProgress?.(i + 1, total, Boolean(res?.ok));
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ to, error: message });
      onProgress?.(i + 1, total, false);
    }
  }
  return { ok, failed, errors };
}
