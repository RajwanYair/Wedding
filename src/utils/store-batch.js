/**
 * src/utils/store-batch.js — Declarative batch mutation helper (Sprint 58)
 *
 * `storeBatchMutate` applies an ordered list of store mutation descriptors
 * inside a single `storeBatch()` call (one notification flush per key).
 *
 * Mutation types:
 *   { type: "set",    key, value }   → storeSet(key, value)
 *   { type: "upsert", key, item }    → storeUpsert(key, item)
 *   { type: "update", key, id, patch } → storeUpdate(key, id, patch)
 *   { type: "remove", key, id }      → storeRemove(key, id)
 *
 * Usage:
 *   import { storeBatchMutate } from "../utils/store-batch.js";
 *   storeBatchMutate([
 *     { type: "upsert", key: "guests", item: guest },
 *     { type: "update", key: "tables", id: "t1", patch: { guestCount: 5 } },
 *   ]);
 */

import {
  storeBatch,
  storeSet,
  storeUpsert,
  storeUpdate,
  storeRemove,
} from "../core/store.js";

/**
 * @typedef {{ type: "set", key: string, value: unknown }} SetMutation
 * @typedef {{ type: "upsert", key: string, item: { id: string } }} UpsertMutation
 * @typedef {{ type: "update", key: string, id: string, patch: Record<string, unknown> }} UpdateMutation
 * @typedef {{ type: "remove", key: string, id: string }} RemoveMutation
 * @typedef {SetMutation | UpsertMutation | UpdateMutation | RemoveMutation} StoreMutation
 */

/**
 * Apply a list of mutations in a single atomic batch.
 * All subscriber notifications are deferred until every mutation has run.
 *
 * @param {StoreMutation[]} mutations
 * @returns {{ applied: number, errors: Array<{ index: number, error: unknown }> }}
 */
export function storeBatchMutate(mutations) {
  let applied = 0;
  /** @type {Array<{ index: number, error: unknown }>} */
  const errors = [];

  storeBatch(() => {
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      try {
        switch (m.type) {
          case "set":
            storeSet(m.key, m.value);
            break;
          case "upsert":
            storeUpsert(m.key, m.item);
            break;
          case "update":
            storeUpdate(m.key, m.id, m.patch);
            break;
          case "remove":
            storeRemove(m.key, m.id);
            break;
          default:
            throw new TypeError(`Unknown mutation type: ${/** @type {*} */ (m).type}`);
        }
        applied++;
      } catch (error) {
        errors.push({ index: i, error });
      }
    }
  });

  return { applied, errors };
}

/**
 * Build a canonical "upsert" mutation descriptor.
 * @param {string} key
 * @param {{ id: string }} item
 * @returns {UpsertMutation}
 */
export function upsertMutation(key, item) {
  return { type: "upsert", key, item };
}

/**
 * Build a canonical "update" mutation descriptor.
 * @param {string} key
 * @param {string} id
 * @param {Record<string, unknown>} patch
 * @returns {UpdateMutation}
 */
export function updateMutation(key, id, patch) {
  return { type: "update", key, id, patch };
}

/**
 * Build a canonical "remove" mutation descriptor.
 * @param {string} key
 * @param {string} id
 * @returns {RemoveMutation}
 */
export function removeMutation(key, id) {
  return { type: "remove", key, id };
}

/**
 * Build a canonical "set" mutation descriptor.
 * @param {string} key
 * @param {unknown} value
 * @returns {SetMutation}
 */
export function setMutation(key, value) {
  return { type: "set", key, value };
}
