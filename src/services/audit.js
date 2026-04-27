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
import { getBackendTypeConfig, getSupabaseAnonKey, getSupabaseUrl } from "../core/app-config.js";
import { STORAGE_KEYS } from "../core/constants.js";
import {
  readBrowserStorageJson,
  readSessionStorage,
  writeSessionStorage,
} from "../core/storage.js";

// ── Runtime credential helpers ─────────────────────────────────────────

function _url() {
  return getSupabaseUrl();
}

function _key() {
  return getSupabaseAnonKey();
}

function _getAdminEmail() {
  const sess = readBrowserStorageJson(STORAGE_KEYS.SUPABASE_SESSION, null);
  return sess?.user?.email ?? null;
}

// ── Session token for RLS ──────────────────────────────────────────────

function _getAccessToken() {
  const sess = readBrowserStorageJson(STORAGE_KEYS.SUPABASE_SESSION, null);
  return sess?.access_token ?? null;
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
    _sessionId = readSessionStorage(STORAGE_KEYS.ERROR_SESSION_ID, "") ?? "";
    if (!_sessionId) {
      try {
        _sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        writeSessionStorage(STORAGE_KEYS.ERROR_SESSION_ID, _sessionId);
      } catch {
        _sessionId = `${Date.now()}`;
      }
    }
    if (!_sessionId) {
      _sessionId = `${Date.now()}`;
    }
  }
  return _sessionId;
}

// ── Audit Pipeline (S85 — merged from audit-pipeline.js) ──────────────────
//
// Batched, queued writer to `audit_log`. Used by integration tests and
// future Sprint 88 IDB queue. Falls back to console.warn when supabase is null.

/** @typedef {import("@supabase/supabase-js").SupabaseClient} SupabaseClient */

/**
 * @typedef {"low"|"medium"|"high"|"critical"} Severity
 *
 * @typedef {{
 *   action: string,
 *   entityType?: string,
 *   entityId?: string,
 *   userId?: string,
 *   severity?: Severity,
 *   metadata?: Record<string, unknown>
 * }} AuditEvent
 *
 * @typedef {{
 *   log(event: AuditEvent): void,
 *   flush(): Promise<void>,
 *   pending(): number,
 *   destroy(): void
 * }} AuditPipeline
 */

const PIPELINE_BATCH_SIZE = 20;
const PIPELINE_FLUSH_MS = 5_000;

const HIGH_SEVERITY_ACTIONS = new Set([
  "guest.delete",
  "guest.erase",
  "user.ban",
  "settings.change",
  "admin.login",
  "admin.logout",
]);

/**
 * Resolve severity — caller hint is respected but certain actions are elevated.
 * @param {string} action
 * @param {Severity} [hint]
 * @returns {Severity}
 */
function resolveSeverity(action, hint) {
  if (HIGH_SEVERITY_ACTIONS.has(action)) {
    const levels = ["low", "medium", "high", "critical"];
    const hintIdx = hint ? levels.indexOf(hint) : -1;
    return hintIdx >= 2 ? /** @type {Severity} */ (hint) : "high";
  }
  return hint ?? "low";
}

/**
 * Create a batched audit pipeline.
 *
 * @param {SupabaseClient | null} supabase  Pass null for offline / test mode.
 * @param {{ batchSize?: number, flushMs?: number }} [opts]
 * @returns {AuditPipeline}
 */
export function createAuditPipeline(supabase, opts = {}) {
  const batchSize = opts.batchSize ?? PIPELINE_BATCH_SIZE;
  const flushMs = opts.flushMs ?? PIPELINE_FLUSH_MS;

  /** @type {AuditEvent[]} */
  const queue = [];
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  let destroyed = false;

  function scheduleFlush() {
    if (timer || destroyed) return;
    timer = setTimeout(() => {
      timer = null;
      flushQueue();
    }, flushMs);
  }

  async function flushQueue() {
    if (queue.length === 0) return;
    const batch = queue.splice(0, batchSize);
    if (!supabase) {
      for (const e of batch) {
        console.warn("[audit]", e.action, e.severity, e.entityType, e.entityId);
      }
      return;
    }
    try {
      await supabase.from("audit_log").insert(batch);
    } catch {
      queue.unshift(...batch);
    }
  }

  return {
    log(event) {
      if (destroyed) return;
      const enriched = {
        ...event,
        severity: resolveSeverity(event.action, event.severity),
        logged_at: new Date().toISOString(),
      };
      queue.push(enriched);
      if (queue.length >= batchSize) {
        flushQueue();
      } else {
        scheduleFlush();
      }
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await flushQueue();
    },
    pending() {
      return queue.length;
    },
    destroy() {
      destroyed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
