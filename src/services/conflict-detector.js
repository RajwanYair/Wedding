/**
 * src/services/conflict-detector.js — Field-level conflict detection (Sprint 64)
 *
 * Pure logic — no DOM, no store, no side-effects.
 * Compares a local array of records against a remote array and returns
 * a list of field-level conflicts for records that both sides have modified.
 *
 * A conflict exists when:
 *  - Both local and remote have a record with the same id
 *  - At least one field has different values
 *  - The record has an `updatedAt` timestamp (used for tie-breaking)
 *
 * Designed to feed conflict-resolver.js's `showConflictModal()`.
 *
 * Usage:
 *   const conflicts = detectConflicts(localGuests, remoteGuests, { skip: ["updatedAt"] });
 *   const resolved  = resolveConflict(conflicts[0], "remote");
 */

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
 * Pick a default strategy by comparing `updatedAt` timestamps.
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
