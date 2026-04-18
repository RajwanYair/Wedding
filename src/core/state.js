/**
 * src/core/state.js — localStorage persistence layer (S0 named-export module)
 *
 * Thin wrapper around localStorage with JSON serialisation.
 * Supports multi-event namespacing (S9.1): each event gets its own prefix.
 * No window.* side effects.
 */

import { STORAGE_PREFIX } from "./config.js";

const _BASE_PREFIX = STORAGE_PREFIX;

/** @type {string} Active event ID — "default" for backward compat */
let _activeEventId = "default";

/**
 * Get the current storage prefix, scoped to the active event.
 * "default" event uses the original prefix for backward compatibility.
 * @returns {string}
 */
function _prefix() {
  return _activeEventId === "default"
    ? _BASE_PREFIX
    : `${_BASE_PREFIX}evt_${_activeEventId}_`;
}

// ── Event management (S9.1) ───────────────────────────────────────────────

/**
 * List all event IDs stored in localStorage.
 * @returns {Array<{id: string, label: string}>}
 */
export function listEvents() {
  return /** @type {Array<{id: string, label: string}>} */ (
    _loadGlobal("events", [{ id: "default", label: "" }])
  );
}

/**
 * Get the active event ID.
 * @returns {string}
 */
export function getActiveEventId() {
  return _activeEventId;
}

/**
 * Switch the active event. Returns the new event's ID.
 * Call this BEFORE re-initialising the store — the store will read
 * from the new event's key namespace.
 * @param {string} eventId
 */
export function setActiveEvent(eventId) {
  _activeEventId = eventId;
  _saveGlobal("activeEventId", eventId);
}

/**
 * Add a new event to the registry.
 * @param {string} id
 * @param {string} label
 */
export function addEvent(id, label) {
  const events = listEvents();
  if (!events.some((e) => e.id === id)) {
    events.push({ id, label });
    _saveGlobal("events", events);
  }
}

/**
 * Remove an event from the registry (does NOT clear its data).
 * @param {string} id
 */
export function removeEvent(id) {
  if (id === "default") return;
  const events = listEvents().filter((e) => e.id !== id);
  _saveGlobal("events", events);
}

/**
 * Rename an event label.
 * @param {string} id
 * @param {string} newLabel
 */
export function renameEvent(id, newLabel) {
  const events = listEvents();
  const evt = events.find((e) => e.id === id);
  if (evt) {
    evt.label = newLabel;
    _saveGlobal("events", events);
  }
}

/**
 * Restore the last-used event ID from localStorage.
 * Called during bootstrap before initStore.
 */
export function restoreActiveEvent() {
  const stored = _loadGlobal("activeEventId", "default");
  _activeEventId = typeof stored === "string" ? stored : "default";
}

// ── Global storage (event-independent) ────────────────────────────────────

/**
 * Save a value to global (non-event-scoped) storage.
 * @param {string} key
 * @param {unknown} value
 */
function _saveGlobal(key, value) {
  try {
    localStorage.setItem(_BASE_PREFIX + key, JSON.stringify(value));
  } catch {}
}

/**
 * Load a value from global (non-event-scoped) storage.
 * @template T
 * @param {string} key
 * @param {T} [fallback]
 * @returns {T | undefined}
 */
function _loadGlobal(key, fallback) {
  try {
    const raw = localStorage.getItem(_BASE_PREFIX + key);
    if (raw === null) return fallback;
    return /** @type {T} */ (JSON.parse(raw));
  } catch {
    return fallback;
  }
}

// ── Per-event storage ─────────────────────────────────────────────────────

/**
 * Save a value to localStorage (scoped to current event).
 * @param {string} key   Key without prefix
 * @param {unknown} value
 */
export function save(key, value) {
  try {
    localStorage.setItem(_prefix() + key, JSON.stringify(value));
  } catch {}
}

/**
 * Load a value from localStorage (scoped to current event).
 * @template T
 * @param {string} key
 * @param {T} [fallback]
 * @returns {T | undefined}
 */
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(_prefix() + key);
    if (raw === null) return fallback;
    return /** @type {T} */ (JSON.parse(raw));
  } catch {
    return fallback;
  }
}

/**
 * Remove a key from localStorage (scoped to current event).
 * @param {string} key
 */
export function remove(key) {
  try {
    localStorage.removeItem(_prefix() + key);
  } catch {}
}

/**
 * Clear all keys for the ACTIVE event from localStorage.
 */
export function clearAll() {
  try {
    const pfx = _prefix();
    Object.keys(localStorage)
      .filter((k) => k.startsWith(pfx))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/**
 * Clear all keys for a specific event from localStorage.
 * @param {string} eventId
 */
export function clearEventData(eventId) {
  try {
    const pfx =
      eventId === "default"
        ? _BASE_PREFIX
        : `${_BASE_PREFIX}evt_${eventId}_`;
    // Only remove data keys — never remove global registry keys
    const globalKeys = new Set([
      `${_BASE_PREFIX}events`,
      `${_BASE_PREFIX}activeEventId`,
      `${_BASE_PREFIX}lang`,
    ]);
    Object.keys(localStorage)
      .filter((k) => k.startsWith(pfx) && !globalKeys.has(k))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}
