/**
 * src/services/supabase.js — Unified Supabase service (S230)
 *
 * Merged from:
 *   - supabase.js        (S0)   — REST sync (PostgREST, zero-dep)
 *   - supabase-health.js (S17)  — health check / ping utilities
 *   - supabase-auth.js   (S230) — OAuth, magic link, anonymous sessions
 */

import { getApprovedAdminEmails, getSupabaseAnonKey, getSupabaseUrl } from "../core/app-config.js";
import { storeGet } from "../core/store.js";
import { getSupabaseClient } from "../core/supabase-client.js";

// ── Runtime-overridable credentials ──────────────────────────────────────

function _getUrl() {
  return getSupabaseUrl();
}

function _getKey() {
  return getSupabaseAnonKey();
}

/** @returns {boolean} */
function isConfigured() {
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
      /** @type {Record<string, string>} */ (opts.headers)?.["Prefer"] ?? "return=minimal"
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
async function _supabaseRead(table) {
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
    const result = await _rest(path, {
      method: "GET",
      headers: { Prefer: "return=representation" },
    });
    if (!Array.isArray(result)) return [];
    return result.map((row) => ({
      action: row.action ?? "",
      entity: row.entity ?? "",
      entity_id: row.entity_id ?? null,
      user_email: row.user_email ?? "",
      ts: row.ts ?? "",
      diff: row.diff ?? null,
    }));
  } catch {
    return [];
  }
}

// ── Health checks (merged from supabase-health.js, S17) ──────────────────

/**
 * @typedef {{ ok: boolean, latencyMs: number, error?: string }} HealthResult
 * @typedef {{ ok: boolean, latencyMs: number, tables: Record<string, boolean>, error?: string }} HealthReport
 */

const CRITICAL_TABLES = ["guests", "tables", "vendors", "expenses"];

/**
 * Perform a fast health check (single row select from `guests`).
 * @param {import("@supabase/supabase-js").SupabaseClient | null} [supabase]
 * @returns {Promise<HealthResult>}
 */
export async function checkSupabaseHealth(supabase) {
  const client = supabase ?? getSupabaseClient();
  if (!client) return { ok: false, latencyMs: 0, error: "Supabase not configured" };
  const start = Date.now();
  try {
    const { error } = await client.from("guests").select("id").limit(1);
    const latencyMs = Date.now() - start;
    if (error) return { ok: false, latencyMs, error: error.message };
    return { ok: true, latencyMs };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: String(err) };
  }
}

/**
 * Detailed health report — checks every critical table.
 * @param {import("@supabase/supabase-js").SupabaseClient | null} [supabase]
 * @returns {Promise<HealthReport>}
 */
export async function getHealthReport(supabase) {
  const client = supabase ?? getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      latencyMs: 0,
      tables: Object.fromEntries(CRITICAL_TABLES.map((t) => [t, false])),
      error: "Supabase not configured",
    };
  }
  const start = Date.now();
  /** @type {Record<string, boolean>} */
  const tables = {};
  let overallOk = true;
  /** @type {string | undefined} */
  let firstError;
  await Promise.all(
    CRITICAL_TABLES.map(async (table) => {
      try {
        const { error } = await client.from(table).select("id").limit(1);
        tables[table] = !error;
        if (error && !firstError) { firstError = error.message; overallOk = false; }
      } catch (err) {
        tables[table] = false;
        if (!firstError) { firstError = String(err); overallOk = false; }
      }
    }),
  );
  const latencyMs = Date.now() - start;
  /** @type {{ ok: boolean; latencyMs: number; tables: Record<string, boolean>; error?: string }} */
  const report = { ok: overallOk, latencyMs, tables };
  if (firstError) report.error = firstError;
  return report;
}

// ══════════════════════════════════════════════════════════════════════════
// §4 — Supabase Auth (merged from supabase-auth.js, S230)
// ══════════════════════════════════════════════════════════════════════════

import {
  readBrowserStorageJson,
  removeBrowserStorage,
  writeBrowserStorageJson,
} from "../core/storage.js";
import { STORAGE_KEYS } from "../core/constants.js";

/** @returns {boolean} */
export function isSupabaseAuthConfigured() {
  return Boolean(_getUrl() && _getKey());
}

/**
 * @typedef {{
 *   access_token: string,
 *   refresh_token: string,
 *   expires_at: number,
 *   user: { id: string, email: string, [key: string]: unknown }
 * }} SupabaseSession
 */

/** @returns {SupabaseSession | null} */
export function getSession() {
  const sess = /** @type {SupabaseSession | null} */ (readBrowserStorageJson(STORAGE_KEYS.SUPABASE_SESSION, null));
  if (!sess) return null;
  if (sess.expires_at && Date.now() / 1000 > sess.expires_at - 60) {
    _refreshSession(sess.refresh_token).catch(() => clearSession());
  }
  return sess;
}

/** @param {SupabaseSession} sess */
function _saveSession(sess) {
  writeBrowserStorageJson(STORAGE_KEYS.SUPABASE_SESSION, sess);
}

export function clearSession() {
  removeBrowserStorage(STORAGE_KEYS.SUPABASE_SESSION);
}

/**
 * @param {string} path
 * @param {RequestInit} opts
 * @returns {Promise<unknown>}
 */
async function _authRest(path, opts) {
  const base = _getUrl();
  const key = _getKey();
  if (!base || !key) throw new Error("Supabase not configured");
  const resp = await fetch(`${base}/auth/v1${path}`, {
    ...opts,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "Network error");
    throw new Error(`Supabase Auth ${resp.status}: ${text}`);
  }
  return resp.json().catch(() => null);
}

/**
 * Initiate OAuth sign-in by redirecting to the Supabase provider URL.
 * @param {'google'|'facebook'|'apple'} provider
 * @param {string} [redirectUrl]
 */
export function signInWithProvider(provider, redirectUrl = `${window.location.origin}/Wedding/`) {
  const url = _getUrl();
  const key = _getKey();
  if (!url || !key) {
    console.warn("[supabase-auth] Not configured — cannot sign in via Supabase Auth");
    return;
  }
  const authUrl = `${url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUrl)}`;
  window.location.href = authUrl;
}

/**
 * Send a magic-link email (passwordless sign-in).
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function signInWithMagicLink(email) {
  try {
    await _authRest("/magiclink", { method: "POST", body: JSON.stringify({ email }) });
    return true;
  } catch (err) {
    console.error("[supabase-auth] Magic link error:", err);
    return false;
  }
}

/**
 * Sign in anonymously (for guests who haven't authenticated).
 * @returns {Promise<SupabaseSession | null>}
 */
export async function signInAnonymous() {
  try {
    const result = /** @type {SupabaseSession} */ (
      await _authRest("/signup", { method: "POST", body: JSON.stringify({ email: "", is_anonymous: true }) })
    );
    if (result?.access_token) _saveSession(result);
    return result ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
async function _refreshSession(refreshToken) {
  const result = /** @type {SupabaseSession} */ (
    await _authRest("/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  );
  if (result?.access_token) _saveSession(result);
}

/**
 * Call on app load to detect if we just returned from an OAuth redirect.
 * @returns {SupabaseSession | null}
 */
export function handleOAuthRedirect() {
  const hash = window.location.hash;
  if (!hash.includes("access_token")) return null;
  try {
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token") ?? "";
    const expiresIn = parseInt(params.get("expires_in") ?? "3600", 10);
    if (!accessToken) return null;
    const payload = JSON.parse(
      atob((accessToken.split(".")[1] ?? "e30=").replace(/-/g, "+").replace(/_/g, "/")),
    );
    const sess = /** @type {SupabaseSession} */ ({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      user: {
        id: payload.sub ?? "",
        email: payload.email ?? "",
        name: payload.user_metadata?.name ?? payload.user_metadata?.full_name ?? "",
        picture: payload.user_metadata?.avatar_url ?? "",
        provider: payload.app_metadata?.provider ?? "unknown",
      },
    });
    _saveSession(sess);
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    return sess;
  } catch {
    return null;
  }
}

/**
 * Determine if the current session is an admin (email allowlist check).
 * @param {SupabaseSession | null} sess
 * @returns {boolean}
 */
export function isAdmin(sess) {
  if (!sess?.user?.email) return false;
  return getApprovedAdminEmails().includes(sess.user.email.trim().toLowerCase());
}
