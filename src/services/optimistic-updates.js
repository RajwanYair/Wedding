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
