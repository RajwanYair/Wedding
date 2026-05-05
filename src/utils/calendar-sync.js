/**
 * src/utils/calendar-sync.js — S644 Calendar two-way sync helpers
 *
 * Pure helpers for mapping wedding events to/from Google Calendar
 * format, conflict resolution, and sync status tracking.
 *
 * @module calendar-sync
 * @owner calendar
 */

/**
 * @typedef {object} CalendarEvent
 * @property {string} id
 * @property {string} title
 * @property {string} start — ISO 8601
 * @property {string} end — ISO 8601
 * @property {string} [location]
 * @property {string} [description]
 * @property {string} source — "local" | "remote"
 * @property {string} updatedAt — ISO 8601
 */

/**
 * @typedef {object} SyncResult
 * @property {CalendarEvent[]} toUpload — local events missing from remote
 * @property {CalendarEvent[]} toDownload — remote events missing from local
 * @property {{ local: CalendarEvent, remote: CalendarEvent }[]} conflicts — same id, different data
 */

/**
 * Map a wedding milestone to a calendar event.
 *
 * @param {{ id: string, title: string, date: string, time?: string, duration?: number, location?: string, description?: string }} milestone
 * @returns {CalendarEvent}
 */
export function milestoneToEvent(milestone) {
  const start = milestone.time
    ? `${milestone.date}T${milestone.time}`
    : `${milestone.date}T00:00:00`;
  const durationMs = (milestone.duration ?? 60) * 60_000;
  const end = new Date(new Date(start).getTime() + durationMs).toISOString();
  return {
    id: milestone.id,
    title: milestone.title ?? "",
    start,
    end,
    location: milestone.location,
    description: milestone.description,
    source: "local",
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Map a Google Calendar event object to our CalendarEvent.
 *
 * @param {{ id: string, summary?: string, start: { dateTime?: string, date?: string }, end: { dateTime?: string, date?: string }, location?: string, description?: string, updated?: string }} gcalEvent
 * @returns {CalendarEvent}
 */
export function gcalToEvent(gcalEvent) {
  return {
    id: gcalEvent.id,
    title: gcalEvent.summary ?? "",
    start: gcalEvent.start?.dateTime ?? gcalEvent.start?.date ?? "",
    end: gcalEvent.end?.dateTime ?? gcalEvent.end?.date ?? "",
    location: gcalEvent.location,
    description: gcalEvent.description,
    source: "remote",
    updatedAt: gcalEvent.updated ?? new Date().toISOString(),
  };
}

/**
 * Map our CalendarEvent to Google Calendar API payload.
 *
 * @param {CalendarEvent} event
 * @returns {{ summary: string, start: { dateTime: string }, end: { dateTime: string }, location?: string, description?: string }}
 */
export function eventToGcal(event) {
  const payload = {
    summary: event.title,
    start: { dateTime: event.start },
    end: { dateTime: event.end },
  };
  if (event.location) payload.location = event.location;
  if (event.description) payload.description = event.description;
  return payload;
}

/**
 * Diff local and remote events for two-way sync.
 *
 * @param {CalendarEvent[]} local
 * @param {CalendarEvent[]} remote
 * @returns {SyncResult}
 */
export function diffEvents(local, remote) {
  const localArr = Array.isArray(local) ? local : [];
  const remoteArr = Array.isArray(remote) ? remote : [];
  const localMap = new Map(localArr.map((e) => [e.id, e]));
  const remoteMap = new Map(remoteArr.map((e) => [e.id, e]));

  const toUpload = localArr.filter((e) => !remoteMap.has(e.id));
  const toDownload = remoteArr.filter((e) => !localMap.has(e.id));
  const conflicts = [];

  for (const [id, localEvent] of localMap) {
    const remoteEvent = remoteMap.get(id);
    if (remoteEvent && hasChanges(localEvent, remoteEvent)) {
      conflicts.push({ local: localEvent, remote: remoteEvent });
    }
  }

  return { toUpload, toDownload, conflicts };
}

/**
 * Check if two events differ in meaningful fields.
 *
 * @param {CalendarEvent} a
 * @param {CalendarEvent} b
 * @returns {boolean}
 */
function hasChanges(a, b) {
  return a.title !== b.title || a.start !== b.start || a.end !== b.end || a.location !== b.location;
}

/**
 * Resolve a conflict by picking the most recently updated event.
 *
 * @param {CalendarEvent} local
 * @param {CalendarEvent} remote
 * @returns {CalendarEvent}
 */
export function resolveByLatest(local, remote) {
  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();
  return remoteTime > localTime ? { ...remote, source: "remote" } : { ...local, source: "local" };
}

/**
 * Resolve a conflict by always preferring local.
 *
 * @param {CalendarEvent} local
 * @returns {CalendarEvent}
 */
export function resolvePreferLocal(local) {
  return { ...local };
}

/**
 * Build a sync summary from a diff result.
 *
 * @param {SyncResult} result
 * @returns {{ uploads: number, downloads: number, conflicts: number, total: number }}
 */
export function syncSummary(result) {
  if (!result) return { uploads: 0, downloads: 0, conflicts: 0, total: 0 };
  return {
    uploads: result.toUpload?.length ?? 0,
    downloads: result.toDownload?.length ?? 0,
    conflicts: result.conflicts?.length ?? 0,
    total: (result.toUpload?.length ?? 0) + (result.toDownload?.length ?? 0) + (result.conflicts?.length ?? 0),
  };
}
