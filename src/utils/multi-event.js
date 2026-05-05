/**
 * src/utils/multi-event.js — S650 Multi-event workspace helpers
 *
 * Pure helpers for managing multiple wedding events within a single
 * workspace — CRUD, active event switching, guest list merging,
 * and event templates.
 *
 * @module multi-event
 * @owner workspace
 */

let _eventCounter = 0;

/** Reset counter (for tests). */
export function resetEventCounter() {
  _eventCounter = 0;
}

/**
 * @typedef {object} WeddingEvent
 * @property {string} id
 * @property {string} name
 * @property {string} [date]
 * @property {string} [venue]
 * @property {string} [status] - "draft"|"active"|"archived"
 * @property {number} [guestCount]
 * @property {string} createdAt
 */

/**
 * Create a new wedding event.
 *
 * @param {string} name
 * @param {{ date?: string, venue?: string }} [options]
 * @returns {WeddingEvent}
 */
export function createEvent(name, options = {}) {
  _eventCounter++;
  return {
    id: `evt_${_eventCounter}`,
    name: String(name ?? "").trim(),
    date: options.date ?? undefined,
    venue: options.venue ?? undefined,
    status: "draft",
    guestCount: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Activate an event (set status to "active").
 *
 * @param {WeddingEvent} event
 * @returns {WeddingEvent}
 */
export function activateEvent(event) {
  if (!event) return event;
  return { ...event, status: "active" };
}

/**
 * Archive an event.
 *
 * @param {WeddingEvent} event
 * @returns {WeddingEvent}
 */
export function archiveEvent(event) {
  if (!event) return event;
  return { ...event, status: "archived" };
}

/**
 * Switch the active event in a list. Deactivates all others.
 *
 * @param {WeddingEvent[]} events
 * @param {string} eventId
 * @returns {WeddingEvent[]}
 */
export function switchActiveEvent(events, eventId) {
  if (!Array.isArray(events)) return [];
  return events.map((e) => ({
    ...e,
    status: e.id === eventId ? "active" : (e.status === "active" ? "draft" : e.status),
  }));
}

/**
 * Get the currently active event.
 *
 * @param {WeddingEvent[]} events
 * @returns {WeddingEvent|null}
 */
export function getActiveEvent(events) {
  if (!Array.isArray(events)) return null;
  return events.find((e) => e.status === "active") ?? null;
}

/**
 * Merge guest lists from multiple events, deduplicating by name.
 *
 * @param {{ name: string, [key: string]: unknown }[][]} guestLists
 * @returns {{ name: string, sourceEvents: number, [key: string]: unknown }[]}
 */
export function mergeGuestLists(guestLists) {
  if (!Array.isArray(guestLists)) return [];
  /** @type {Map<string, { guest: Record<string, unknown>, count: number }>} */
  const map = new Map();

  for (const list of guestLists) {
    if (!Array.isArray(list)) continue;
    for (const guest of list) {
      const key = (guest.name ?? "").trim().toLowerCase();
      if (!key) continue;
      if (map.has(key)) {
        // @ts-ignore
        map.get(key).count++;
      } else {
        map.set(key, { guest: { ...guest }, count: 1 });
      }
    }
  }

  return [...map.values()].map(({ guest, count }) => ({
    ...guest,
    name: String(guest.name),
    sourceEvents: count,
  }));
}

/**
 * Create an event from a template.
 *
 * @param {"traditional"|"intimate"|"destination"|"garden"} templateName
 * @param {string} eventName
 * @returns {WeddingEvent}
 */
export function createFromTemplate(templateName, eventName) {
  const templates = {
    traditional: { venue: "Banquet Hall", guestCount: 300 },
    intimate: { venue: "Restaurant", guestCount: 50 },
    destination: { venue: "Resort", guestCount: 100 },
    garden: { venue: "Garden Venue", guestCount: 150 },
  };

  const tpl = templates[templateName] ?? templates.traditional;
  const event = createEvent(eventName);
  return { ...event, venue: tpl.venue, guestCount: tpl.guestCount };
}

/**
 * Get event summary stats.
 *
 * @param {WeddingEvent[]} events
 * @returns {{ total: number, active: number, draft: number, archived: number }}
 */
export function eventSummary(events) {
  if (!Array.isArray(events)) return { total: 0, active: 0, draft: 0, archived: 0 };
  let active = 0;
  let draft = 0;
  let archived = 0;
  for (const e of events) {
    if (e.status === "active") active++;
    else if (e.status === "draft") draft++;
    else if (e.status === "archived") archived++;
  }
  return { total: events.length, active, draft, archived };
}

/**
 * Duplicate an event (new ID, draft status, new timestamp).
 *
 * @param {WeddingEvent} event
 * @param {string} [newName]
 * @returns {WeddingEvent}
 */
export function duplicateEvent(event, newName) {
  if (!event) return createEvent(newName ?? "Untitled");
  _eventCounter++;
  return {
    ...event,
    id: `evt_${_eventCounter}`,
    name: newName ?? `${event.name} (copy)`,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}
