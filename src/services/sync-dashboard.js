/**
 * src/services/sync-dashboard.js — Sync health dashboard (Sprint 48)
 *
 * Aggregates per-domain sync states from sync-tracker.js into high-level
 * health metrics for dashboards, status bars, and admin views.
 *
 * Usage:
 *   import { getSyncStatus, isSyncHealthy } from "../services/sync-dashboard.js";
 */

import {
  getAllSyncStates,
  getSyncState,
} from "./sync-tracker.js";

// ── Types ──────────────────────────────────────────────────────────────────
/**
 * @typedef {{
 *   pending: number,
 *   syncing: number,
 *   failed: number,
 *   offline: number,
 *   total: number,
 *   lastSync: string|null,
 * }} SyncStatusSummary
 */

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Aggregate all tracked domain states into a summary.
 *
 * @returns {SyncStatusSummary}
 */
export function getSyncStatus() {
  const states = getAllSyncStates();
  /** @type {SyncStatusSummary} */
  const summary = { pending: 0, syncing: 0, failed: 0, offline: 0, total: states.length, lastSync: null };

  let latestSyncMs = 0;

  for (const s of states) {
    if (s.status === "pending")  summary.pending++;
    if (s.status === "syncing")  summary.syncing++;
    if (s.status === "error")    summary.failed++;
    if (s.status === "offline")  summary.offline++;

    if (s.lastSyncAt) {
      const ms = new Date(s.lastSyncAt).getTime();
      if (ms > latestSyncMs) {
        latestSyncMs = ms;
        summary.lastSync = s.lastSyncAt;
      }
    }
  }

  return summary;
}

/**
 * Total number of pending writes across all domains.
 *
 * @returns {number}
 */
export function getQueueDepth() {
  return getAllSyncStates().reduce(
    (sum, s) => sum + (s.pendingWrites ?? 0),
    0,
  );
}

/**
 * ISO timestamp of the most recent successful sync, or null.
 *
 * @returns {string|null}
 */
export function getLastSyncTime() {
  let latest = null;
  let latestMs = 0;
  for (const s of getAllSyncStates()) {
    if (s.lastSyncAt) {
      const ms = new Date(s.lastSyncAt).getTime();
      if (ms > latestMs) { latestMs = ms; latest = s.lastSyncAt; }
    }
  }
  return latest;
}

/**
 * True when there are no pending, syncing, failed, or offline domains.
 *
 * @returns {boolean}
 */
export function isSyncHealthy() {
  const s = getSyncStatus();
  return s.pending === 0 && s.syncing === 0 && s.failed === 0 && s.offline === 0;
}

/**
 * Get sync state for a single domain key (delegate to sync-tracker).
 *
 * @param {string} key
 * @returns {import('../types').SyncState}
 */
export function getDomainSyncState(key) {
  return getSyncState(key);
}

/**
 * List all domains that currently have failures.
 *
 * @returns {string[]}
 */
export function getFailedDomains() {
  return getAllSyncStates()
    .filter((s) => s.status === "error")
    .map((s) => s.key);
}

/**
 * List all domains that have pending writes.
 *
 * @returns {string[]}
 */
export function getPendingDomains() {
  return getAllSyncStates()
    .filter((s) => (s.pendingWrites ?? 0) > 0)
    .map((s) => s.key);
}
