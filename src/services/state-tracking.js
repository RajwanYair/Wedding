/**
 * src/services/dirty-state.js — Dirty-state tracking service (Sprint 59)
 *
 * Tracks which store keys have unsaved changes since the last "save" baseline.
 * Used to:
 *  - Show "unsaved changes" indicators in the UI
 *  - Guard against accidental navigation
 *  - Determine which keys need to be synced
 *
 * Usage:
 *   import { markDirty, markClean, isDirty, getDirtyKeys, snapshotBaseline } from "./dirty-state.js";
 *   snapshotBaseline(["guests", "tables"]);  // record current values as baseline
 *   storeSet("guests", updatedGuests);
 *   markDirty("guests");
 *   isDirty("guests"); // → true
 *   markClean("guests");
 *   isDirty("guests"); // → false
 */

/** @type {Set<string>} keys with unsaved changes */
const _dirty = new Set();

/** @type {Map<string, string>} baseline JSON snapshots per key */
const _baseline = new Map();

// ── Dirty tracking ────────────────────────────────────────────────────────

/**
 * Mark a store key as having unsaved changes.
 * @param {string} key
 */
export function markDirty(key) {
  _dirty.add(key);
}

/**
 * Mark a store key as clean (changes saved).
 * @param {string} key
 */
export function markClean(key) {
  _dirty.delete(key);
}

/**
 * Mark ALL currently-dirty keys as clean.
 */
export function markAllClean() {
  _dirty.clear();
}

/**
 * Whether a store key has unsaved changes.
 * @param {string} key
 * @returns {boolean}
 */
export function isDirty(key) {
  return _dirty.has(key);
}

/**
 * Whether ANY tracked key has unsaved changes.
 * @returns {boolean}
 */
export function hasUnsavedChanges() {
  return _dirty.size > 0;
}

/**
 * Return all currently-dirty key names.
 * @returns {string[]}
 */
export function getDirtyKeys() {
  return [..._dirty];
}

/**
 * Return the count of dirty keys.
 * @returns {number}
 */
export function dirtyCount() {
  return _dirty.size;
}

// ── Baseline / auto-detect ────────────────────────────────────────────────

/**
 * Record the current serialised state of the given value as a baseline.
 * @param {string} key
 * @param {unknown} value  Current value for the key
 */
export function snapshotBaseline(key, value) {
  try {
    _baseline.set(key, JSON.stringify(value));
  } catch {
    _baseline.set(key, String(value));
  }
}

/**
 * Compare a value against its baseline.  Returns true when the value has
 * changed from the recorded baseline.  Also calls `markDirty` / `markClean`
 * automatically.
 *
 * If no baseline was recorded for the key, the function returns false.
 *
 * @param {string} key
 * @param {unknown} currentValue
 * @returns {boolean} true when changed from baseline
 */
export function checkDirty(key, currentValue) {
  const base = _baseline.get(key);
  if (base === undefined) return false;
  let current;
  try {
    current = JSON.stringify(currentValue);
  } catch {
    current = String(currentValue);
  }
  if (current !== base) {
    _dirty.add(key);
    return true;
  }
  _dirty.delete(key);
  return false;
}

/**
 * Clear all baseline snapshots.
 */
export function clearBaselines() {
  _baseline.clear();
}

/**
 * Return a diagnostic summary.
 * @returns {{ dirtyKeys: string[], baselineKeys: string[], hasUnsaved: boolean }}
 */
export function getDirtyStateSummary() {
  return {
    dirtyKeys: getDirtyKeys(),
    baselineKeys: [..._baseline.keys()],
    hasUnsaved: hasUnsavedChanges(),
  };
}


// ────────────────────────────────────────────────────────────
// Merged from: optimistic-updates.js
// ────────────────────────────────────────────────────────────

/**
 * src/services/optimistic-updates.js — Optimistic update manager (Sprint 69)
 *
 * Enables immediate UI updates before a server write completes.
 * If the server write fails, the original value is restored (rolled back).
 *
 * Pattern:
 *  1. Call `applyOptimistic(key, id, patch)` — returns { rollback, snapshotId }
 *  2. Kick off your async server write
 *  3a. On success: call `commitOptimistic(snapshotId)` — discards the snapshot
 *  3b. On failure: call `rollbackOptimistic(snapshotId)` — restores via snapshot
 *
 * Note: state is held in-memory (per page load).  Caller owns the storeGet/
 * storeSet injections to keep this module store-agnostic and fully testable.
 *
 * Usage:
 *   import { createOptimisticManager } from "./optimistic-updates.js";
 *   const opt = createOptimisticManager(storeGet, storeSet);
 *   const { rollback, snapshotId } = opt.applyOptimistic("guests", "g1", { status: "confirmed" });
 *   myServer.update(guest).catch(() => rollback());
 */

/**
 * @typedef {Record<string, unknown>} AnyRecord
 * @typedef {object} OptimisticSnapshot
 * @property {string}  snapshotId
 * @property {string}  storeKey
 * @property {string}  recordId
 * @property {AnyRecord[]} before       Full array before the patch
 * @property {AnyRecord}   original     The original record (before patch)
 * @property {number}  createdAt
 * @typedef {object} ApplyResult
 * @property {string}     snapshotId
 * @property {() => void} rollback       Convenience: rolls back this snapshot
 * @property {() => void} commit         Convenience: commits this snapshot
 */

/**
 * @typedef {(key: string) => AnyRecord[]} GetFn
 * @typedef {(key: string, value: AnyRecord[]) => void} SetFn
 */

/**
 * Create an optimistic update manager bound to the provided store accessors.
 * @param {GetFn} getFn    e.g. storeGet
 * @param {SetFn} setFn    e.g. storeSet
 * @returns {OptimisticManager}
 */
export function createOptimisticManager(getFn, setFn) {
  /** @type {Map<string, OptimisticSnapshot>} */
  const _snapshots = new Map();
  let _counter = 0;

  /**
   * Apply a patch to a record in the store optimistically.
   * @param {string} storeKey
   * @param {string} recordId
   * @param {AnyRecord} patch
   * @returns {ApplyResult}
   */
  function applyOptimistic(storeKey, recordId, patch) {
    const before = getFn(storeKey) ?? [];
    const original = before.find((r) => String(r.id) === String(recordId));
    if (!original) {
      const noop = () => {};
      return { snapshotId: "", rollback: noop, commit: noop };
    }

    const snapshotId = `opt-${++_counter}-${Date.now()}`;
    const snapshot = {
      snapshotId,
      storeKey,
      recordId: String(recordId),
      before: before.map((r) => ({ ...r })), // shallow-clone each record
      original: { ...original },
      createdAt: Date.now(),
    };
    _snapshots.set(snapshotId, snapshot);

    // Apply the patch immediately
    const patched = before.map((r) => (String(r.id) === String(recordId) ? { ...r, ...patch } : r));
    setFn(storeKey, patched);

    return {
      snapshotId,
      rollback: () => rollbackOptimistic(snapshotId),
      commit: () => commitOptimistic(snapshotId),
    };
  }

  /**
   * Restore the store to the pre-patch state.
   * @param {string} snapshotId
   * @returns {boolean} Whether the rollback succeeded.
   */
  function rollbackOptimistic(snapshotId) {
    const snap = _snapshots.get(snapshotId);
    if (!snap) return false;
    setFn(snap.storeKey, snap.before);
    _snapshots.delete(snapshotId);
    return true;
  }

  /**
   * Discard the snapshot — confirms the optimistic change is permanent.
   * @param {string} snapshotId
   * @returns {boolean}
   */
  function commitOptimistic(snapshotId) {
    return _snapshots.delete(snapshotId);
  }

  /**
   * Get a list of all pending snapshot IDs.
   * @returns {string[]}
   */
  function pendingSnapshots() {
    return [..._snapshots.keys()];
  }

  /**
   * Roll back ALL pending snapshots (e.g. on network error / modal cancel).
   * Applied in reverse order (newest first) to unwind changes correctly.
   * @returns {number} Count of rolled-back snapshots.
   */
  function rollbackAll() {
    const ids = [..._snapshots.keys()].reverse();
    let count = 0;
    for (const id of ids) {
      rollbackOptimistic(id);
      count++;
    }
    return count;
  }

  /**
   * Commit ALL pending snapshots.
   * @returns {number} Count of committed snapshots.
   */
  function commitAll() {
    const ids = [..._snapshots.keys()];
    let count = 0;
    for (const id of ids) {
      commitOptimistic(id);
      count++;
    }
    return count;
  }

  return {
    applyOptimistic,
    rollbackOptimistic,
    commitOptimistic,
    pendingSnapshots,
    rollbackAll,
    commitAll,
  };
}

/**
 * @typedef {ReturnType<typeof createOptimisticManager>} OptimisticManager
 */
