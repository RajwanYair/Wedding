/**
 * src/utils/optimistic.js — Optimistic update helpers (Phase 2)
 *
 * Applies a local store mutation immediately for snappy UX, then
 * reconciles after the async server operation resolves or rejects.
 * On rejection the store is automatically restored to its pre-mutation snapshot.
 *
 * Usage:
 *   import { withOptimistic } from "../utils/optimistic.js";
 *
 *   // Simple case — mutate store, call server, auto-rollback on failure
 *   await withOptimistic(
 *     "guests",
 *     (guests) => guests.filter((g) => g.id !== id),   // local mutation
 *     () => guestRepo.delete(id)                        // async server op
 *   );
 *
 *   // With callbacks
 *   await withOptimistic(
 *     "guests",
 *     (guests) => [...guests, newGuest],
 *     () => guestRepo.create(newGuest),
 *     { onSuccess: (result) => console.log("saved", result),
 *       onError:   (err)    => toast.error(err.message) }
 *   );
 */

import { storeGet, storeSet } from "../core/store.js";
import { deepClone } from "./immutable.js";

// ── Types (JSDoc) ─────────────────────────────────────────────────────────

/**
 * @template T
 * @typedef {{
 *   onSuccess?: (result: T) => void,
 *   onError?:   (err: Error) => void,
 *   onSettle?:  () => void
 * }} OptimisticOptions
 */

// ── Core API ──────────────────────────────────────────────────────────────

/**
 * Snapshot the current store value for `key`, apply `mutate` to the store
 * immediately, then await `serverOp`. Rolls back to the snapshot if the
 * operation throws. Returns the server result on success.
 *
 * @template T
 * @param {string}   key         Store key to mutate (e.g. "guests")
 * @param {(current: unknown) => unknown} mutate  Pure function returning the new store value
 * @param {() => Promise<T>}     serverOp  Async operation that commits the change
 * @param {OptimisticOptions<T>} [opts]
 * @returns {Promise<T>}
 */
export async function withOptimistic(key, mutate, serverOp, opts = {}) {
  const snapshot = deepClone(storeGet(key) ?? null);
  // Apply local mutation immediately
  storeSet(key, mutate(storeGet(key) ?? null));
  try {
    const result = await serverOp();
    opts.onSuccess?.(result);
    return result;
  } catch (err) {
    // Rollback
    storeSet(key, snapshot);
    const error = err instanceof Error ? err : new Error(String(err));
    opts.onError?.(error);
    throw error;
  } finally {
    opts.onSettle?.();
  }
}

/**
 * Take a deep-clone snapshot of `storeGet(key)` and return it along with
 * a `rollback()` function that restores the store to that snapshot.
 * Useful when you need manual rollback control.
 *
 * @param {string} key
 * @returns {{ snapshot: unknown, rollback: () => void }}
 */
export function createOptimisticCheckpoint(key) {
  const snapshot = deepClone(storeGet(key) ?? null);
  return {
    snapshot,
    rollback() {
      storeSet(key, snapshot);
    },
  };
}

/**
 * Apply multiple optimistic mutations to multiple keys at once.
 * If any async operation fails, ALL keys are rolled back.
 *
 * @param {Array<{ key: string, mutate: (current: unknown) => unknown }>} mutations
 * @param {() => Promise<unknown>} serverOp
 * @returns {Promise<unknown>}
 */
export async function withOptimisticBatch(mutations, serverOp) {
  // Snapshot all keys
  const checkpoints = mutations.map(({ key }) => createOptimisticCheckpoint(key));
  // Apply all mutations
  mutations.forEach(({ key, mutate }) => {
    storeSet(key, mutate(storeGet(key) ?? null));
  });
  try {
    return await serverOp();
  } catch (err) {
    // Rollback all
    checkpoints.forEach((cp) => cp.rollback());
    throw err;
  }
}

/**
 * Optimistically append `item` to the array at `key`, then call `serverOp`.
 * On success the item is left in place; on failure it is removed.
 *
 * @template {{ id: string }} T
 * @param {string} key
 * @param {T} item
 * @param {() => Promise<T>} serverOp  Should return the final server item
 * @returns {Promise<T>}
 */
export async function optimisticAppend(key, item, serverOp) {
  return withOptimistic(
    key,
    (current) => [.../** @type {T[]} */ (current ?? []), item],
    serverOp,
  );
}

/**
 * Optimistically remove the item with `id` from the array at `key`,
 * then call `serverOp`. On failure the item is restored.
 *
 * @template {{ id: string }} T
 * @param {string} key
 * @param {string} id
 * @param {() => Promise<void>} serverOp
 * @returns {Promise<void>}
 */
export async function optimisticRemove(key, id, serverOp) {
  return withOptimistic(
    key,
    (current) => /** @type {T[]} */ (current ?? []).filter((item) => item.id !== id),
    serverOp,
  );
}
