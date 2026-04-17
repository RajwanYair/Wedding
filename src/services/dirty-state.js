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
