/**
 * src/core/conflict-resolver.js — Conflict resolution modal logic (S10.2)
 *
 * Used when syncing with Google Sheets detects field-level conflicts
 * between local and remote guest data.
 */

import { storeGet, storeSet } from "./store.js";
import { t } from "./i18n.js";
import { openModal } from "./ui.js";

/** @type {Array<{ id: string, field: string, localVal: unknown, remoteVal: unknown }>} */
let _pendingConflicts = [];

/**
 * Show the conflict resolution modal with the given conflicts.
 * @param {Array<{ id: string, field: string, localVal: unknown, remoteVal: unknown }>} conflicts
 */
export async function showConflictModal(conflicts) {
  _pendingConflicts = conflicts;
  await openModal("conflictModal");
  const list = document.getElementById("conflictList");
  if (!list) return;
  list.textContent = "";
  conflicts.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "conflict-row";
    row.innerHTML = ` // nosec: all dynamic values pass through _escHtml()
      <strong>${_escHtml(c.id)} → ${_escHtml(c.field)}</strong>
      <label><input type="radio" name="conflict_${i}" value="local" checked>
        ${t("conflict_local")}: <code>${_escHtml(String(c.localVal ?? ""))}</code></label>
      <label><input type="radio" name="conflict_${i}" value="remote">
        ${t("conflict_remote")}: <code>${_escHtml(String(c.remoteVal ?? ""))}</code></label>`;
    list.appendChild(row);
  });
}

/**
 * Apply conflict resolutions. Each choice is "local" or "remote".
 * @param {string[]} choices
 */
export function applyConflictResolutions(choices) {
  const guests = /** @type {any[]} */ ([.../** @type {any[]} */ (storeGet("guests") ?? [])]);
  for (let i = 0; i < _pendingConflicts.length; i++) {
    if (choices[i] === "remote") {
      const c = _pendingConflicts[i];
      if (!c) continue;
      const guest = guests.find((g) => String(g.id) === c.id);
      if (guest) guest[c.field] = c.remoteVal;
    }
  }
  storeSet("guests", guests);
  _pendingConflicts = [];
}

/**
 * Get the current pending conflicts array.
 * @returns {Array<{ id: string, field: string, localVal: unknown, remoteVal: unknown }>}
 */
export function getPendingConflicts() {
  return _pendingConflicts;
}

/** @param {string} s */
function _escHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ── Pure logic helpers (framework-agnostic) ───────────────────────────────

/**
 * @typedef {{ id: string, field: string, localVal: unknown, remoteVal: unknown, localUpdatedAt?: string, remoteUpdatedAt?: string }} ConflictEntry
 */

/**
 * Detect field-level conflicts between a local record and a remote record.
 * A conflict exists when both sides have a non-null value for the same field
 * and those values differ.
 *
 * @template {{ id: string }} T
 * @param {T} local
 * @param {T} remote
 * @param {{ exclude?: string[] }} [opts]
 * @returns {ConflictEntry[]}
 */
export function detectConflicts(local, remote, opts = {}) {
  const exclude = new Set(["id", "updatedAt", "createdAt", ...(opts.exclude ?? [])]);
  /** @type {ConflictEntry[]} */
  const conflicts = [];

  for (const key of Object.keys({ ...local, ...remote })) {
    if (exclude.has(key)) continue;
    const lv = /** @type {Record<string, unknown>} */ (local)[key];
    const rv = /** @type {Record<string, unknown>} */ (remote)[key];
    if (lv === rv) continue; // identical → no conflict
    if (lv == null && rv == null) continue; // both empty → no conflict
    conflicts.push({
      id: local.id,
      field: key,
      localVal: lv,
      remoteVal: rv,
      localUpdatedAt: /** @type {any} */ (local).updatedAt,
      remoteUpdatedAt: /** @type {any} */ (remote).updatedAt,
    });
  }

  return conflicts;
}

/**
 * Merge two records at field level using a resolution strategy.
 *
 * @template {{ id: string }} T
 * @param {T} local
 * @param {T} remote
 * @param {"local"|"remote"|"newest"} strategy
 * @returns {T}
 */
export function fieldLevelMerge(local, remote, strategy) {
  if (strategy === "local") return { ...remote, ...local, id: local.id };
  if (strategy === "remote") return { ...local, ...remote, id: local.id };

  // "newest" — per-field, pick the value from whichever record was updated more recently
  const localTs = /** @type {any} */ (local).updatedAt ?? "0";
  const remoteTs = /** @type {any} */ (remote).updatedAt ?? "0";
  const base = localTs >= remoteTs ? { ...remote, ...local } : { ...local, ...remote };
  return /** @type {T} */ ({ ...base, id: local.id });
}

/**
 * Auto-resolve a list of conflicts according to a strategy.
 *
 * @param {ConflictEntry[]} conflicts
 * @param {"local"|"remote"|"newest"} strategy
 * @returns {Record<string, Record<string, unknown>>}
 *   Map of `guestId → { field: chosenValue }` patches to apply
 */
export function autoResolve(conflicts, strategy) {
  /** @type {Record<string, Record<string, unknown>>} */
  const patches = {};

  for (const c of conflicts) {
    if (!patches[c.id]) patches[c.id] = {};

    let chosen;
    if (strategy === "local") {
      chosen = c.localVal;
    } else if (strategy === "remote") {
      chosen = c.remoteVal;
    } else {
      // "newest" — pick the value from whichever record has the later timestamp
      const lts = c.localUpdatedAt ?? "0";
      const rts = c.remoteUpdatedAt ?? "0";
      chosen = lts >= rts ? c.localVal : c.remoteVal;
    }

    patches[c.id][c.field] = chosen;
  }

  return patches;
}
