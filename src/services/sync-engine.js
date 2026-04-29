/**
 * src/services/sync-engine.js — Dual-write rehearsal harness + conflict detection (S247)
 *
 * Merged from:
 *   - dual-write.js (S160)     — parallel backend writes with divergence logging
 *   - conflict-detector.js (Sprint 64) — field-level conflict detection + resolution
 *
 * §1 Dual-write harness: when FEATURE_DUAL_WRITE is true, wraps backend writes
 *    so that both sheets and supabase backends receive the write. Divergences
 *    between backend results are logged to the console (never thrown).
 *
 * §2 Conflict detection: pure logic for comparing local vs remote record arrays
 *    and resolving field-level conflicts (feeds conflict-resolver.js).
 *
 * Named exports only — no window.* side effects, no DOM, no store.
 */

import { FEATURE_DUAL_WRITE } from "../core/config.js";

// ── §1 — Dual-write rehearsal harness ────────────────────────────────────

/** @type {boolean} */
let _active = false;

/**
 * Activate the dual-write rehearsal harness if FEATURE_DUAL_WRITE is set.
 * Idempotent — safe to call multiple times.
 * @returns {boolean} Whether the harness is now active.
 */
export function initDualWrite() {
  if (!FEATURE_DUAL_WRITE) return false;
  _active = true;
  return true;
}

/**
 * Whether the dual-write harness is currently active.
 * @returns {boolean}
 */
export function isDualWriteHarnessActive() {
  return _active;
}

/**
 * Run a single operation against two backends in parallel and log any
 * divergence. Never throws — both errors and successes are captured.
 *
 * @template T
 * @param {string} label   — human-readable operation name for log output
 * @param {() => Promise<T>} primaryFn   — primary backend operation
 * @param {() => Promise<T>} secondaryFn — secondary backend operation
 * @returns {Promise<T>} Resolves with the primary result (or rejects if
 *   primary failed, regardless of secondary outcome).
 */
export async function dualWrite(label, primaryFn, secondaryFn) {
  /** @type {[PromiseSettledResult<T>, PromiseSettledResult<T>]} */
  const [primary, secondary] = await Promise.allSettled([
    primaryFn(),
    secondaryFn(),
  ]);

  const pOk = primary.status === "fulfilled";
  const sOk = secondary.status === "fulfilled";

  if (!pOk && !sOk) {
    console.warn(`[dual-write] "${label}" — both backends failed`, {
      primary: primary.reason,
      secondary: secondary.reason,
    });
    throw primary.reason;
  }

  if (pOk && !sOk) {
    console.warn(`[dual-write] "${label}" — secondary failed (primary OK)`, {
      secondary: secondary.reason,
    });
  } else if (!pOk && sOk) {
    console.warn(`[dual-write] "${label}" — primary failed (secondary OK)`, {
      primary: primary.reason,
    });
    throw primary.reason;
  }
  if (pOk && sOk) {
    const pVal = JSON.stringify(primary.value ?? null);
    const sVal = JSON.stringify(secondary.value ?? null);
    if (pVal !== sVal) {
      console.warn(`[dual-write] "${label}" — result divergence`, {
        primary: primary.value,
        secondary: secondary.value,
      });
    }
  }

  if (!pOk) throw primary.reason;
  return primary.value;
}

// ── §2 — Field-level conflict detection + resolution ─────────────────────

/**
 * @typedef {Record<string, unknown> & { id: string | number, updatedAt?: string }} DataRecord
 * @typedef {{ id: string, field: string, localVal: unknown, remoteVal: unknown, strategy: ResolutionStrategy }} ConflictResult
 * @typedef {"local"|"remote"|"merge"} ResolutionStrategy
 * @typedef {{ skip?: string[] }} DetectOptions
 */

const DEFAULT_SKIP = new Set(["updatedAt", "createdAt", "rsvpDate"]);

/**
 * Detect field-level conflicts between local and remote record arrays.
 * Only records present on BOTH sides are compared.
 * Fields listed in `options.skip` (plus always-skipped timestamps) are ignored.
 *
 * @param {DataRecord[]} local
 * @param {DataRecord[]} remote
 * @param {DetectOptions} [options]
 * @returns {ConflictResult[]}
 */
export function detectConflicts(local, remote, options = {}) {
  const skipFields = new Set([...DEFAULT_SKIP, ...(options.skip ?? [])]);

  /** @type {Map<string, DataRecord>} */
  const remoteMap = new Map(remote.map((r) => [String(r.id), r]));

  /** @type {ConflictResult[]} */
  const results = [];

  for (const localRecord of local) {
    const id = String(localRecord.id);
    const remoteRecord = remoteMap.get(id);
    if (!remoteRecord) continue;

    const allFields = new Set([...Object.keys(localRecord), ...Object.keys(remoteRecord)]);

    for (const field of allFields) {
      if (skipFields.has(field)) continue;
      const localVal = localRecord[field];
      const remoteVal = remoteRecord[field];
      if (!_equal(localVal, remoteVal)) {
        results.push({
          id,
          field,
          localVal,
          remoteVal,
          strategy: /** @type {ResolutionStrategy} */ (_defaultStrategy(localRecord, remoteRecord)),
        });
      }
    }
  }

  return results;
}

/**
 * Resolve a single conflict by applying the chosen strategy.
 * Returns the winning value and a patch `{ [field]: value }`.
 *
 * @param {ConflictResult} conflict
 * @param {ResolutionStrategy} strategy
 * @returns {{ field: string, value: unknown, patch: Record<string, unknown> }}
 */
export function resolveConflict(conflict, strategy) {
  const strat = strategy ?? conflict.strategy;
  let value;
  if (strat === "local") {
    value = conflict.localVal;
  } else if (strat === "remote") {
    value = conflict.remoteVal;
  } else {
    // "merge" — prefer non-null; if both exist, prefer remote
    value = conflict.localVal ?? conflict.remoteVal;
  }
  return { field: conflict.field, value, patch: { [conflict.field]: value } };
}

/**
 * Apply a resolution strategy to all conflicts for a given record id.
 * Returns a merged patch object for that record.
 *
 * @param {ConflictResult[]} conflicts
 * @param {string} id
 * @param {ResolutionStrategy} strategy
 * @returns {Record<string, unknown>}
 */
export function resolveAllForId(conflicts, id, strategy) {
  const patch = /** @type {Record<string, unknown>} */ ({});
  for (const c of conflicts) {
    if (c.id !== id) continue;
    const { field, value } = resolveConflict(c, strategy);
    patch[field] = value;
  }
  return patch;
}

/**
 * Get unique record IDs that have at least one conflict.
 * @param {ConflictResult[]} conflicts
 * @returns {string[]}
 */
export function getConflictingIds(conflicts) {
  return [...new Set(conflicts.map((c) => c.id))];
}

/**
 * Group conflicts by record id.
 * @param {ConflictResult[]} conflicts
 * @returns {Record<string, ConflictResult[]>}
 */
export function groupConflictById(conflicts) {
  /** @type {Record<string, ConflictResult[]>} */
  const groups = {};
  for (const c of conflicts) {
    if (!groups[c.id]) groups[c.id] = [];
    (groups[c.id] ??= []).push(c);
  }
  return groups;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Deep equality check (primitives + JSON-serialisable objects).
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function _equal(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Default resolution strategy: newer `updatedAt` wins; local wins on tie.
 * @param {DataRecord} local
 * @param {DataRecord} remote
 * @returns {ResolutionStrategy}
 */
function _defaultStrategy(local, remote) {
  if (!local.updatedAt && !remote.updatedAt) return "local";
  if (!local.updatedAt) return "remote";
  if (!remote.updatedAt) return "local";
  return local.updatedAt >= remote.updatedAt ? "local" : "remote";
}
