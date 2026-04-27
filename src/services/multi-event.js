/**
 * src/services/multi-event.js — Multi-event management (Sprint 114)
 *
 * Allows the app to track multiple wedding events (ceremony, reception,
 * shabbat dinner, etc.) and switch the active event context.
 *
 * Persisted under the global "events" state key. The active event id is
 * managed by the global state layer so event switching stays aligned with the
 * store/storage prefix.
 *
 * Usage:
 *   import { createEvent, listEvents, setActiveEvent, getActiveEvent } from "./multi-event.js";
 */

import {
  getActiveEventId as getGlobalActiveEventId,
  loadGlobal,
  saveGlobal,
  setActiveEvent as setGlobalActiveEvent,
} from "../core/state.js";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id:          string,
 *   name:        string,
 *   date?:       string,          // ISO date string
 *   venue?:      string,
 *   description?: string,
 *   label?:      string,
 *   createdAt:   number,
 *   updatedAt:   number,
 * }} WeddingEvent
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
