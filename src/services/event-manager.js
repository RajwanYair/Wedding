/**
 * src/services/event-manager.js — S262 merged event management service
 *
 * Merged from:
 *   - state-tracking.js (Sprint 87) — optimistic UI state + dirty-state tracking
 *   - multi-event.js    (Sprint 114) — multi-event management (CRUD, active event)
 *
 * §1 State tracking: createOptimisticManager, createDirtyTracker, isDirty
 * §2 Multi-event: createEvent, updateEvent, deleteEvent, listEvents,
 *    getActiveEvent, setActiveEvent, duplicateEvent
 *
 * Named exports only — no window.* side effects.
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
 * @returns {object}
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
 * @typedef {{
 *   applyOptimistic: (storeKey: string, recordId: string, patch: AnyRecord) => ApplyResult,
 *   rollbackOptimistic: (snapshotId: string) => boolean,
 *   commitOptimistic: (snapshotId: string) => boolean,
 *   pendingSnapshots: () => OptimisticSnapshot[],
 *   rollbackAll: () => number,
 *   commitAll: () => number,
 * }} OptimisticManager
 */


// ── §2 — Multi-event management ────────────────────────────────────────

import {
  getActiveEventId as getGlobalActiveEventId,
  loadGlobal,
  saveGlobal,
  setActiveEvent as setGlobalActiveEvent,
} from "../core/state.js";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   date?: string,
 *   venue?: string,
 *   description?: string,
 *   label?: string,
 *   createdAt: number,
 *   updatedAt: number,
 * }} WeddingEvent
 *
 * `date` is an ISO date string when present.
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/** @returns {WeddingEvent[]} */
function _getEvents() {
  return /** @type {WeddingEvent[]} */ (loadGlobal("events", []) ?? []);
}

/** @param {WeddingEvent[]} events */
function _save(events) {
  saveGlobal("events", events);
}

function _id() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── CRUD ──────────────────────────────────────────────────────────────────

/**
 * Create a new event.
 * @param {{ name: string, date?: string, venue?: string, description?: string }} opts
 * @returns {string}  new event id
 */
export function createEvent(opts) {
  if (!opts.name?.trim()) throw new Error("multi-event: name is required");
  const event = /** @type {WeddingEvent} */ ({
    id: _id(),
    name: opts.name.trim(),
    label: opts.name.trim(),
    date: opts.date ?? null,
    venue: opts.venue ?? null,
    description: opts.description ?? null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  _save([..._getEvents(), event]);
  return event.id;
}

/**
 * Get an event by id.
 * @param {string} id
 * @returns {WeddingEvent | null}
 */
export function getEvent(id) {
  return _getEvents().find((e) => e.id === id) ?? null;
}

/**
 * List all events, sorted by date ascending (undated events last).
 * @returns {WeddingEvent[]}
 */
export function listEvents() {
  return [..._getEvents()].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

/**
 * Update an event.
 * @param {string} id
 * @param {Partial<Omit<WeddingEvent, "id" | "createdAt">>} patch
 * @returns {boolean}
 */
export function updateEvent(id, patch) {
  const events = _getEvents();
  const idx = events.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  const current = events[idx];
  if (!current) return false;
  const next = /** @type {WeddingEvent} */ ({ ...current, ...patch, updatedAt: Date.now() });
  if (typeof patch.name === "string") next.label = patch.name.trim();
  events[idx] = next;
  _save(events);
  return true;
}

/**
 * Delete an event.
 * @param {string} id
 * @returns {boolean}
 */
export function deleteEvent(id) {
  const events = _getEvents();
  const filtered = events.filter((e) => e.id !== id);
  if (filtered.length === events.length) return false;
  _save(filtered);
  // If we deleted the active event, clear active
  if (getGlobalActiveEventId() === id) setGlobalActiveEvent("default");
  return true;
}

// ── Active event ──────────────────────────────────────────────────────────

/**
 * Set the active event.
 * @param {string} id
 * @returns {boolean}  false if event not found
 */
export function setActiveEvent(id) {
  if (!getEvent(id)) return false;
  setGlobalActiveEvent(id);
  return true;
}

/**
 * Get the currently active event, or null.
 * @returns {WeddingEvent | null}
 */
export function getActiveEvent() {
  const id = getGlobalActiveEventId();
  if (!id || id === "default") return null;
  return getEvent(/** @type {string} */ (id));
}

/**
 * Clear the active event selection.
 */
export function clearActiveEvent() {
  setGlobalActiveEvent("default");
}

