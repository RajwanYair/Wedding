/**
 * src/services/audit.js — Client-side audit entry writer (Phase 8.3)
 *
 * Writes audit entries to the `audit_log` Supabase table (created in migration 004).
 * Provides structured logging for all admin CRUD operations.
 *
 * Only fires when:
 *   - BACKEND_TYPE is "supabase"
 *   - An authenticated admin session exists
 *   - The Supabase project is configured
 *
 * Usage:
 *   import { audit } from '../services/audit.js';
 *   audit('UPDATE', 'guests', guestId, { before: oldGuest, after: newGuest });
 */

import { APP_VERSION } from "../core/config.js";
import {
  getBackendTypeConfig,
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "../core/app-config.js";
import { STORAGE_KEYS } from "../core/constants.js";

// ── Runtime credential helpers ─────────────────────────────────────────

function _url() {
  return getSupabaseUrl();
}

function _key() {
  return getSupabaseAnonKey();
}

function _getAdminEmail() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPABASE_SESSION);
    if (!raw) return null;
    const sess = JSON.parse(raw);
    return sess?.user?.email ?? null;
  } catch {
    return null;
  }
}

// ── Session token for RLS ──────────────────────────────────────────────

function _getAccessToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPABASE_SESSION);
    if (!raw) return null;
    const sess = JSON.parse(raw);
    return sess?.access_token ?? null;
  } catch {
    return null;
  }
}

// ── Fire-and-forget write ─────────────────────────────────────────────

/**
 * @param {string} action   e.g. "INSERT", "UPDATE", "DELETE"
 * @param {string} entity   e.g. "guests", "tables", "vendors"
 * @param {string | null}   entityId
 * @param {{ before?: unknown, after?: unknown } | null} diff
 * @returns {void}
 */
export function audit(action, entity, entityId, diff = null) {
  if (getBackendTypeConfig() !== "supabase") return;
  const baseUrl = _url();
  const key = _key();
  if (!baseUrl || !key) return;

  const userEmail = _getAdminEmail();
  if (!userEmail) return; // Only log admin actions

  const token = _getAccessToken();

  const entry = {
    user_email: userEmail,
    action: String(action).toUpperCase(),
    entity: String(entity),
    entity_id: entityId ?? null,
    diff: diff ?? null,
    app_version: APP_VERSION,
    ts: new Date().toISOString(),
  };

  // Fire-and-forget: errors should not block UI
  fetch(`${baseUrl}/rest/v1/audit_log`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(entry),
  }).catch((err) => {
    console.error("[audit] Write failed:", err);
  });
}

// ── logAdminAction ────────────────────────────────────────────────────────

/**
 * High-level helper that maps permission-model actions to audit entries.
 *
 * Combines the roles module with the audit trail so callers don't need
 * to construct action/entity strings manually.
 *
 * @param {string} permission  "resource:action" string from roles.js
 * @param {string} entityId    ID of the affected record (empty string for bulk)
 * @param {{ before?: unknown, after?: unknown } | null} [diff]
 */
export function logAdminAction(permission, entityId, diff = null) {
  const [entity = "unknown", action = "unknown"] = permission.split(":");
  audit(action.toUpperCase(), entity, entityId, diff);
}

// ── Error logger ─────────────────────────────────────────────────────

/**
 * Log a client-side error to the `error_log` Supabase table (migration 005).
 * @param {Error | unknown} err
 * @param {{ context?: string, url?: string }} [opts]
 */
export function logError(err, opts = {}) {
  if (getBackendTypeConfig() !== "supabase") return;
  const baseUrl = _url();
  const key = _key();
  if (!baseUrl || !key) return;

  const sessionId = _getSessionId();
  const msg = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? (err.stack ?? "") : "";

  const entry = {
    level: "error",
    message: msg,
    stack,
    url: opts.url ?? (typeof location !== "undefined" ? location.href : ""),
    context: opts.context ?? null,
    session_id: sessionId,
    app_version: APP_VERSION,
  };

  fetch(`${baseUrl}/rest/v1/error_log`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(entry),
  }).catch(() => {}); // Swallow silently — logging must not cause cascading errors
}

// ── Session ID (anonymous, per-tab) ──────────────────────────────────

let _sessionId = "";
function _getSessionId() {
  if (!_sessionId) {
    try {
      _sessionId = sessionStorage.getItem(STORAGE_KEYS.ERROR_SESSION_ID) ?? "";
      if (!_sessionId) {
        _sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem(STORAGE_KEYS.ERROR_SESSION_ID, _sessionId);
      }
    } catch {
      _sessionId = `${Date.now()}`;
    }
  }
  return _sessionId;
}
