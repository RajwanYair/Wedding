/**
 * src/utils/guest-timeline.js — S654 Per-guest activity timeline
 *
 * Pure helpers for building a chronological activity timeline for each
 * guest — RSVP, table assignment, check-in, meal selection, and
 * custom milestone tracking.
 *
 * @module guest-timeline
 * @owner guests
 */

let _entryCounter = 0;

/** Reset counter (for tests). */
export function resetEntryCounter() {
  _entryCounter = 0;
}

/**
 * @typedef {object} TimelineEntry
 * @property {string} id
 * @property {string} guestId
 * @property {string} type - "rsvp"|"table"|"checkin"|"meal"|"note"|"milestone"
 * @property {string} description
 * @property {string} timestamp
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * Add an entry to a guest's timeline.
 *
 * @param {string} guestId
 * @param {string} type
 * @param {string} description
 * @param {Record<string, unknown>} [metadata]
 * @returns {TimelineEntry}
 */
export function addEntry(guestId, type, description, metadata) {
  _entryCounter++;
  return {
    id: `tle_${_entryCounter}`,
    guestId: String(guestId ?? ""),
    type: String(type ?? "note"),
    description: String(description ?? ""),
    timestamp: new Date().toISOString(),
    metadata: metadata ?? undefined,
  };
}

/**
 * Create a RSVP event entry.
 *
 * @param {string} guestId
 * @param {"confirmed"|"declined"|"pending"|"maybe"} status
 * @returns {TimelineEntry}
 */
export function rsvpEntry(guestId, status) {
  return addEntry(guestId, "rsvp", `RSVP: ${status}`, { status });
}

/**
 * Create a table assignment entry.
 *
 * @param {string} guestId
 * @param {string|number} tableId
 * @returns {TimelineEntry}
 */
export function tableAssignEntry(guestId, tableId) {
  return addEntry(guestId, "table", `Assigned to table ${tableId}`, { tableId });
}

/**
 * Create a check-in entry.
 *
 * @param {string} guestId
 * @param {"qr"|"nfc"|"manual"} [method]
 * @returns {TimelineEntry}
 */
export function checkinEntry(guestId, method) {
  return addEntry(guestId, "checkin", `Checked in via ${method ?? "manual"}`, { method: method ?? "manual" });
}

/**
 * Create a meal selection entry.
 *
 * @param {string} guestId
 * @param {string} meal
 * @returns {TimelineEntry}
 */
export function mealEntry(guestId, meal) {
  return addEntry(guestId, "meal", `Meal: ${meal}`, { meal });
}

/**
 * Create a custom milestone entry.
 *
 * @param {string} guestId
 * @param {string} milestone
 * @returns {TimelineEntry}
 */
export function milestoneEntry(guestId, milestone) {
  return addEntry(guestId, "milestone", milestone);
}

/**
 * Get timeline entries for a specific guest, sorted chronologically.
 *
 * @param {TimelineEntry[]} entries
 * @param {string} guestId
 * @returns {TimelineEntry[]}
 */
export function getGuestTimeline(entries, guestId) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((e) => e.guestId === guestId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Get the latest entry for a guest.
 *
 * @param {TimelineEntry[]} entries
 * @param {string} guestId
 * @returns {TimelineEntry|null}
 */
export function latestEntry(entries, guestId) {
  const timeline = getGuestTimeline(entries, guestId);
  return timeline.length > 0 ? timeline[timeline.length - 1] : null;
}

/**
 * Filter entries by type.
 *
 * @param {TimelineEntry[]} entries
 * @param {string} type
 * @returns {TimelineEntry[]}
 */
export function filterByType(entries, type) {
  if (!Array.isArray(entries)) return [];
  return entries.filter((e) => e.type === type);
}

/**
 * Get timeline summary for a guest.
 *
 * @param {TimelineEntry[]} entries
 * @param {string} guestId
 * @returns {{ total: number, types: Record<string, number>, firstActivity: string|null, lastActivity: string|null }}
 */
export function timelineSummary(entries, guestId) {
  const timeline = getGuestTimeline(entries, guestId);
  if (timeline.length === 0) {
    return { total: 0, types: {}, firstActivity: null, lastActivity: null };
  }

  /** @type {Record<string, number>} */
  const types = {};
  for (const e of timeline) {
    types[e.type] = (types[e.type] ?? 0) + 1;
  }

  return {
    total: timeline.length,
    types,
    firstActivity: timeline[0].timestamp,
    lastActivity: timeline[timeline.length - 1].timestamp,
  };
}

/**
 * Check if a guest has a specific event type in their timeline.
 *
 * @param {TimelineEntry[]} entries
 * @param {string} guestId
 * @param {string} type
 * @returns {boolean}
 */
export function hasEvent(entries, guestId, type) {
  if (!Array.isArray(entries)) return false;
  return entries.some((e) => e.guestId === guestId && e.type === type);
}
