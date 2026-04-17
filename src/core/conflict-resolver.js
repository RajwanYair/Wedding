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
    row.innerHTML = `
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
  const guests = /** @type {any[]} */ ([...(/** @type {any[]} */ (storeGet("guests") ?? []))]);
  for (let i = 0; i < _pendingConflicts.length; i++) {
    if (choices[i] === "remote") {
      const c = _pendingConflicts[i];
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
