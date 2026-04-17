/**
 * src/services/multi-event.js — Multi-event management (Sprint 114)
 *
 * Allows the app to track multiple wedding events (ceremony, reception,
 * shabbat dinner, etc.) and switch the active event context.
 *
 * Persisted under "events" in the store.  The active event id is stored
 * under "activeEventId".
 *
 * Usage:
 *   import { createEvent, listEvents, setActiveEvent, getActiveEvent } from "./multi-event.js";
 */

import { storeGet, storeSet } from "../core/store.js";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id:          string,
 *   name:        string,
 *   date?:       string,          // ISO date string
 *   venue?:      string,
 *   description?: string,
 *   createdAt:   number,
 *   updatedAt:   number,
 * }} WeddingEvent
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/** @returns {WeddingEvent[]} */
function _getEvents() {
  return /** @type {WeddingEvent[]} */ (storeGet("events") ?? []);
}

/** @param {WeddingEvent[]} events */
function _save(events) {
  storeSet("events", events);
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
    id:          _id(),
    name:        opts.name.trim(),
    date:        opts.date       ?? null,
    venue:       opts.venue      ?? null,
    description: opts.description ?? null,
    createdAt:   Date.now(),
    updatedAt:   Date.now(),
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
  events[idx] = { ...events[idx], ...patch, updatedAt: Date.now() };
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
  if (storeGet("activeEventId") === id) storeSet("activeEventId", null);
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
  storeSet("activeEventId", id);
  return true;
}

/**
 * Get the currently active event, or null.
 * @returns {WeddingEvent | null}
 */
export function getActiveEvent() {
  const id = storeGet("activeEventId");
  if (!id) return null;
  return getEvent(/** @type {string} */ (id));
}

/**
 * Clear the active event selection.
 */
export function clearActiveEvent() {
  storeSet("activeEventId", null);
}
