/**
 * src/services/supabase.js — Supabase REST sync service (zero-dep)
 *
 * Uses Supabase PostgREST endpoints directly — no SDK needed.
 * Table mapping: guests → guests, tables → tables, vendors → vendors,
 *                expenses → expenses, weddingInfo → config, rsvp_log → rsvp_log
 *
 * Requires `SUPABASE_URL` + `SUPABASE_ANON_KEY` in config.
 * Row-Level Security (RLS) should be configured on the Supabase project.
 */

import { getSupabaseAnonKey, getSupabaseUrl } from "../core/app-config.js";
import { storeGet } from "../core/store.js";

// ── Runtime-overridable credentials ──────────────────────────────────────

function _getUrl() {
  return getSupabaseUrl();
}

function _getKey() {
  return getSupabaseAnonKey();
}

/** @returns {boolean} */
export function isConfigured() {
  return Boolean(_getUrl() && _getKey());
}

// ── Table name mapping (store key → Supabase table) ─────────────────────

/** @type {Record<string, string>} */
const _TABLE_NAMES = {
  guests: "guests",
  tables: "tables",
  vendors: "vendors",
  expenses: "expenses",
  budget: "budget",
  timeline: "timeline",
  contacts: "contacts",
  gallery: "gallery",
  weddingInfo: "config",
};

/** Store keys that use key-value (map) format — stored as rows of { key, value }. */
const _KV_TABLES = new Set(["weddingInfo"]);

// ── Low-level REST helpers ───────────────────────────────────────────────

/**
 * @param {string} path   PostgREST path (e.g. "/rest/v1/guests")
 * @param {RequestInit} [opts]
 * @returns {Promise<unknown>}
 */
async function _rest(path, opts = {}) {
  const base = _getUrl();
  const key = _getKey();
  if (!base || !key) throw new Error("Supabase not configured");

  const url = `${base}${path}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: /** @type {string} */ (
      /** @type {Record<string, string>} */ (opts.headers)?.["Prefer"] ??
        "return=minimal"
    ),
    ...opts.headers,
  };

  const resp = await fetch(url, { ...opts, headers });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Supabase ${resp.status}: ${body}`);
  }
  // 204 No Content
  if (resp.status === 204) return null;
  const ct = resp.headers.get("content-type") ?? "";
  return ct.includes("json") ? resp.json() : resp.text();
}

// ── Public sync API (mirrors sheets.js surface) ─────────────────────────

/**
 * Replace all rows in a Supabase table with the current store data.
 * Uses DELETE + INSERT in a single call via PostgREST bulk insert.
 * No-op when Supabase is not configured.
 *
 * @param {string} storeKey   e.g. "guests", "vendors"
 * @returns {Promise<void>}
 */
export async function syncStoreKeyToSupabase(storeKey) {
  if (!isConfigured()) return;
  const table = _TABLE_NAMES[storeKey];
  if (!table) return;

  /** @type {any[]} */
  let records;
  if (_KV_TABLES.has(storeKey)) {
    // weddingInfo: convert { key: value } object → [{ key, value }, ...]
    const obj = /** @type {Record<string, unknown>} */ (storeGet(storeKey) ?? {});
    records = Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v ?? "") }));
  } else {
    records = /** @type {any[]} */ (storeGet(storeKey) ?? []);
  }

  // DELETE all existing rows, then bulk INSERT
  await _rest(`/rest/v1/${table}?id=neq.___never_match___`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });

  if (records.length > 0) {
    await _rest(`/rest/v1/${table}`, {
      method: "POST",
      body: JSON.stringify(records),
      headers: { Prefer: "return=minimal" },
    });
  }
}

/**
 * Append a single RSVP log entry.
 * @param {{ phone: string, firstName: string, lastName: string, status: string, count: number, timestamp: string }} entry
 * @returns {Promise<void>}
 */
export async function appendToRsvpLogSupabase(entry) {
  if (!isConfigured()) return;
  await _rest("/rest/v1/rsvp_log", {
    method: "POST",
    body: JSON.stringify({
      timestamp: entry.timestamp,
      phone: entry.phone,
      name: `${entry.firstName} ${entry.lastName}`.trim(),
      status: entry.status,
      count: entry.count,
    }),
    headers: { Prefer: "return=minimal" },
  });
}

/**
 * Read all rows from a Supabase table.
 * @param {string} table  Supabase table name
 * @returns {Promise<any[]>}
 */
export async function supabaseRead(table) {
  if (!isConfigured()) return [];
  const result = await _rest(`/rest/v1/${table}?select=*`, {
    method: "GET",
    headers: { Prefer: "return=representation" },
  });
  return Array.isArray(result) ? result : [];
}

/**
 * Verify Supabase connection by reading from a health-check-safe table.
 * @returns {Promise<boolean>}
 */
export async function supabaseCheckConnection() {
  try {
    await _rest("/rest/v1/", { method: "GET" });
    return true;
  } catch {
    return false;
  }
}

// ── Audit log query (Phase 8.3) ──────────────────────────────────────────

/**
 * Fetch recent audit log entries from Supabase.
 * Ordered by timestamp descending, limited to `limit` rows.
 * Requires an admin session with RLS privileges.
 *
 * @param {number} [limit=200]
 * @returns {Promise<Array<{action:string, entity:string, entity_id:string|null, user_email:string, ts:string, diff:unknown}>>}
 */
export async function fetchAuditLog(limit = 200) {
  if (!isConfigured()) return [];
  try {
    const path = `/rest/v1/audit_log?select=action,entity,entity_id,user_email,ts,diff&order=ts.desc&limit=${limit}`;
    const result = await _rest(path, { method: "GET", headers: { Prefer: "return=representation" } });
    if (!Array.isArray(result)) return [];
    return result.map((row) => ({
      action: row.action ?? "",
      entity: row.entity ?? "",
      entityId: row.entity_id ?? null,
      userEmail: row.user_email ?? "",
      ts: row.ts ?? "",
      diff: row.diff ?? null,
    }));
  } catch {
    return [];
  }
}
