/**
 * src/utils/guest-tagging.js — Sprint 125
 *
 * Tag management for guests: add/remove/list tags, search by tag.
 * Tags stored inline on guest records (guests.tags: string[]).
 * A separate tag registry in the store handles global tag CRUD.
 */

import { storeGet, storeSet } from "../core/store.js";
import { enqueueWrite } from "../services/sheets.js";

const _TAGS_KEY   = "guestTags";     // registry: string[]
const _GUESTS_KEY = "guests";

/** @returns {string[]} registered tags */
function _registry() { return storeGet(_TAGS_KEY) ?? []; }

/** @returns {any[]} guests array */
function _guests() { return storeGet(_GUESTS_KEY) ?? []; }

function _saveGuests(list) {
  storeSet(_GUESTS_KEY, list);
  enqueueWrite(_GUESTS_KEY, () => Promise.resolve());
}

function _saveRegistry(tags) {
  storeSet(_TAGS_KEY, tags);
}

// ── Tag registry ──────────────────────────────────────────────────────────

/**
 * Register a global tag (normalised to lowercase, trimmed).
 * @param {string} tag
 * @returns {boolean} true if newly added
 */
export function registerTag(tag) {
  const norm = tag.trim().toLowerCase();
  if (!norm) throw new Error("Tag must not be empty");
  const reg = _registry();
  if (reg.includes(norm)) return false;
  _saveRegistry([...reg, norm]);
  return true;
}

/**
 * Remove a tag from the registry AND strip it from all guests.
 * @param {string} tag
 * @returns {boolean}
 */
export function removeTag(tag) {
  const norm = tag.trim().toLowerCase();
  const reg = _registry();
  if (!reg.includes(norm)) return false;
  _saveRegistry(reg.filter((t) => t !== norm));
  // strip from guests
  const updated = _guests().map((g) => ({
    ...g,
    tags: Array.isArray(g.tags) ? g.tags.filter((t) => t !== norm) : [],
  }));
  _saveGuests(updated);
  return true;
}

/**
 * List all registered tags.
 * @returns {string[]}
 */
export function listTags() { return _registry().slice(); }

// ── Guest tag operations ──────────────────────────────────────────────────

/**
 * Add a tag to a guest. Registers the tag globally if not yet present.
 * @param {string} guestId
 * @param {string} tag
 * @returns {boolean} true if the tag was actually added (not already present)
 */
export function addTagToGuest(guestId, tag) {
  const norm = tag.trim().toLowerCase();
  if (!norm) throw new Error("Tag must not be empty");
  registerTag(norm);
  const guests = _guests();
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx === -1) return false;
  const existing = Array.isArray(guests[idx].tags) ? guests[idx].tags : [];
  if (existing.includes(norm)) return false;
  guests[idx] = { ...guests[idx], tags: [...existing, norm] };
  _saveGuests(guests);
  return true;
}

/**
 * Remove a tag from a specific guest.
 * @param {string} guestId
 * @param {string} tag
 * @returns {boolean} true if removed
 */
export function removeTagFromGuest(guestId, tag) {
  const norm = tag.trim().toLowerCase();
  const guests = _guests();
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx === -1) return false;
  const existing = Array.isArray(guests[idx].tags) ? guests[idx].tags : [];
  if (!existing.includes(norm)) return false;
  guests[idx] = { ...guests[idx], tags: existing.filter((t) => t !== norm) };
  _saveGuests(guests);
  return true;
}

/**
 * Get all tags on a guest.
 * @param {string} guestId
 * @returns {string[]}
 */
export function getGuestTags(guestId) {
  const g = _guests().find((g) => g.id === guestId);
  return Array.isArray(g?.tags) ? g.tags.slice() : [];
}

/**
 * Find all guests that have a specific tag.
 * @param {string} tag
 * @returns {any[]}
 */
export function getGuestsByTag(tag) {
  const norm = tag.trim().toLowerCase();
  return _guests().filter((g) => Array.isArray(g.tags) && g.tags.includes(norm));
}
