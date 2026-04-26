/**
 * src/services/error-pipeline.js — Error pipeline service (Sprint 47)
 *
 * Captures, enriches, stores, and summarises application errors.
 * All captured errors are persisted to the `appErrors` store key and
 * (optionally) sent to the `error-receiver` Edge Function when online.
 *
 * Usage:
 *   import { captureError, getErrors, getErrorSummary } from "../services/error-pipeline.js";
 *
 *   captureError(new Error("Something failed"), { section: "guests", action: "save" });
 */

import { storeGet, storeUpsert, storeSet } from "../core/store.js";
import { APP_VERSION } from "../core/config.js";

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_STORED_ERRORS = 200;

// ── Types ──────────────────────────────────────────────────────────────────
/**
 * @typedef {import('../types').AppError} AppError
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function nowMs() {
  return Date.now();
}

/** @returns {AppError[]} */
function getAll() {
  return /** @type {AppError[]} */ (storeGet("appErrors") ?? []);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Capture and store an error, enriched with context and version info.
 *
 * @param {unknown} err  Any caught value (Error object or primitive)
 * @param {Record<string, unknown>} [context]
 * @returns {AppError}
 */
export function captureError(err, context = {}) {
  const isError = err instanceof Error;
  const record = /** @type {AppError} */ ({
    id: `err_${nowMs()}_${Math.random().toString(36).slice(2, 7)}`,
    type: isError ? err.name || "Error" : typeof err,
    message: isError ? err.message : String(err),
    stack: isError ? err.stack : undefined,
    context: { ...context },
    version: APP_VERSION,
    ts: nowMs(),
  });

  // Upsert into store (will add new; store already has no item with this id)
  storeUpsert("appErrors", record);

  // Trim to max capacity — keep newest 200
  const all = getAll();
  if (all.length > MAX_STORED_ERRORS) {
    const trimmed = all.sort((a, b) => b.ts - a.ts).slice(0, MAX_STORED_ERRORS);
    storeSet("appErrors", trimmed);
  }

  return record;
}

/**
 * Retrieve all stored errors, newest first.
 *
 * @param {{ type?: string, since?: number }} [filter]
 * @returns {AppError[]}
 */
export function getErrors(filter = {}) {
  let errors = getAll().sort((a, b) => b.ts - a.ts);
  if (filter.type) errors = errors.filter((e) => e.type === filter.type);
  if (filter.since) errors = errors.filter((e) => e.ts >= filter.since);
  return errors;
}

/**
 * Remove all stored errors.
 */
export function clearErrors() {
  storeSet("appErrors", []);
}

/**
 * Get a grouped summary of stored errors.
 *
 * @returns {{ total: number, byType: Record<string, number>, latest?: AppError }}
 */
export function getErrorSummary() {
  const errors = getAll();
  if (errors.length === 0) return { total: 0, byType: {} };

  /** @type {Record<string, number>} */
  const byType = {};
  for (const e of errors) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  }

  const sorted = [...errors].sort((a, b) => b.ts - a.ts);
  return { total: errors.length, byType, latest: sorted[0] };
}

/**
 * Get the count of errors captured since `since` (ms epoch).
 *
 * @param {number} [since]  Defaults to last 60 seconds
 * @returns {number}
 */
export function getRecentErrorCount(since) {
  const cutoff = since ?? nowMs() - 60_000;
  return getAll().filter((e) => e.ts >= cutoff).length;
}
