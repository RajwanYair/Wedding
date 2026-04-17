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
