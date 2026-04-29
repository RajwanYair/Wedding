/**
 * src/services/rls-audit.js — Row Level Security audit helpers (Sprint 82)
 *
 * Utilities for verifying that RLS is enabled and inspecting policies.
 * All functions accept a Supabase client; they query pg_catalog views via RPC.
 */

/**
 * @typedef {import("@supabase/supabase-js").SupabaseClient} SupabaseClient
 * @typedef {{ tablename: string, rowsecurity: boolean }} RlsTableRow
 * @typedef {{ policyname: string, tablename: string, cmd: string, roles: string[], qual: string, with_check: string }} PolicyRow
 */

/** Tables that MUST have RLS enabled in production. */
export const REQUIRED_RLS_TABLES = [
  "guests",
  "tables",
  "vendors",
  "expenses",
  "contacts",
  "timeline",
  "rsvp_log",
  "events",
];

/**
 * Check whether RLS is enabled on every required table.
 *
 * @param {SupabaseClient} supabase
 * @returns {Promise<{ ok: boolean, missing: string[], tableStatus: Record<string, boolean> }>}
 */
export async function verifyRlsEnabled(supabase) {
  const { data, error } = await supabase.rpc("get_rls_status");
  if (error) throw error;

  /** @type {RlsTableRow[]} */
  const rows = data ?? [];
  /** @type {Record<string, boolean>} */
  const tableStatus = Object.fromEntries(rows.map((r) => [r.tablename, r.rowsecurity]));

  const missing = REQUIRED_RLS_TABLES.filter((t) => !tableStatus[t]);
  return { ok: missing.length === 0, missing, tableStatus };
}

/**
 * List all RLS policies for a given table.
 *
 * @param {SupabaseClient} supabase
 * @param {string} tableName
 * @returns {Promise<PolicyRow[]>}
 */
export async function listPolicies(supabase, tableName) {
  const { data, error } = await supabase.rpc("get_table_policies", {
    p_table: tableName,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * Check that every required table has at least one SELECT policy.
 *
 * @param {SupabaseClient} supabase
 * @returns {Promise<{ ok: boolean, unprotected: string[] }>}
 */
export async function verifySelectPolicies(supabase) {
  const results = await Promise.all(
    REQUIRED_RLS_TABLES.map(async (table) => {
      const policies = await listPolicies(supabase, table);
      const hasSelect = policies.some((p) => p.cmd === "SELECT" || p.cmd === "ALL");
      return { table, hasSelect };
    }),
  );

  const unprotected = results.filter((r) => !r.hasSelect).map((r) => r.table);

  return { ok: unprotected.length === 0, unprotected };
}


// ────────────────────────────────────────────────────────────
// Merged from: health.js
// ────────────────────────────────────────────────────────────

/**
 * src/services/health.js — App health monitor (Sprint 10 / Phase 4 Observability)
 *
 * Collects a lightweight in-memory health snapshot for the current session:
 *  - Session error count and recent error messages
 *  - Offline queue depth
 *  - Global unhandled-rejection count
 *
 * Usage:
 *   import { getHealthReport, captureHealthError } from "../services/health.js";
 *   const report = getHealthReport();
 *   // → { errors: 2, recentErrors: [{ msg, ts }], queueDepth: 1, warnings: [] }
 */

import { getQueueStats } from "./offline-queue.js";

// ── In-memory session state ───────────────────────────────────────────────

/** @type {{ msg: string, ts: string, context?: string }[]} */
const _errors = [];
const MAX_ERRORS_KEPT = 50;

/** @type {number} */
let _unhandledRejections = 0;

// ── Browser event hooks (wired on first import) ───────────────────────────

if (typeof window !== "undefined") {
  window.addEventListener("error", (e) => {
    _push(e.message ?? "Unknown error", "window.onerror");
  });
  window.addEventListener("unhandledrejection", (e) => {
    _unhandledRejections++;
    const msg = /** @type {any} */ (e.reason)?.message ?? String(e.reason);
    _push(msg, "unhandledRejection");
  });
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Capture an application-level error into the health monitor.
 * Call this alongside logError() for local observability.
 *
 * @param {Error | string} err
 * @param {string} [context]
 */
export function captureHealthError(err, context = "") {
  const msg = err instanceof Error ? err.message : String(err);
  _push(msg, context);
}

/**
 * Get the current health report for the session.
 *
 * @returns {{
 *   errors: number,
 *   recentErrors: { msg: string, ts: string, context?: string }[],
 *   unhandledRejections: number,
 *   offlineQueue: { total: number, exhausted: number, oldestAddedAt: string | null },
 *   status: "healthy" | "degraded" | "critical",
 *   warnings: string[]
 * }}
 */
export function getHealthReport() {
  const queue = getQueueStats();
  const warnings = /** @type {string[]} */ ([]);

  if (_errors.length > 5) warnings.push(`${_errors.length} errors this session`);
  if (queue.exhausted > 0) warnings.push(`${queue.exhausted} offline items exhausted (dropped)`);
  if (queue.total > 10) warnings.push(`Offline queue has ${queue.total} pending items`);

  let status = /** @type {"healthy" | "degraded" | "critical"} */ ("healthy");
  if (warnings.length > 0) status = "degraded";
  if (_errors.length > 10 || _unhandledRejections > 3) status = "critical";

  return {
    errors: _errors.length,
    recentErrors: _errors.slice(-10),
    unhandledRejections: _unhandledRejections,
    offlineQueue: queue,
    status,
    warnings,
  };
}

/**
 * Reset health state (useful for testing or on sign-out).
 */
export function resetHealthState() {
  _errors.length = 0;
  _unhandledRejections = 0;
}

// ── Internal ──────────────────────────────────────────────────────────────

/**
 * @param {string} msg
 * @param {string} [context]
 */
function _push(msg, context = "") {
  _errors.push({ msg, ts: new Date().toISOString(), context });
  if (_errors.length > MAX_ERRORS_KEPT) _errors.shift();
}
