/**
 * src/utils/calendar-link.js — Google Calendar URL + RFC 5545 ICS helpers
 *
 * ROADMAP §5 Phase C — RSVP confirmation "Add to Calendar" button.
 * Pure, side-effect-free, dependency-free.
 *
 * @typedef {{
 *   title: string,
 *   description?: string,
 *   location?: string,
 *   start: Date | string | number,
 *   end?: Date | string | number,
 *   url?: string
 * }} CalendarEvent
 */

const HOUR_MS = 3_600_000;

/**
 * @param {Date | string | number} d
 * @returns {Date}
 */
function _toDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) throw new TypeError("calendar-link: invalid date");
  return date;
}

/**
 * Format a Date as compact UTC: YYYYMMDDTHHMMSSZ (used by Google Calendar + ICS).
 * @param {Date} d
 * @returns {string}
 */
function _formatUtcCompact(d) {
  return d
    .toISOString()
    .replace(/[-:.]/g, "")
    .replace(/\d{3}Z$/, "Z");
}

/**
 * Escape a value for ICS text fields per RFC 5545 §3.3.11.
 * @param {string} s
 * @returns {string}
 */
function _icsEscape(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Build a Google Calendar "create event" deep link.
 *
 * @param {CalendarEvent} ev
 * @returns {string}
 */
export function buildGoogleCalendarLink(ev) {
  if (!ev?.title) throw new TypeError("calendar-link: title required");
  const start = _toDate(ev.start);
  const end = _toDate(ev.end ?? new Date(start.getTime() + 3 * HOUR_MS));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${_formatUtcCompact(start)}/${_formatUtcCompact(end)}`,
  });
  if (ev.description) params.set("details", ev.description);
  if (ev.location) params.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build an RFC 5545 VCALENDAR/VEVENT body.
 *
 * @param {CalendarEvent} ev
 * @returns {string}
 */
export function buildIcsContent(ev) {
  if (!ev?.title) throw new TypeError("calendar-link: title required");
  const start = _toDate(ev.start);
  const end = _toDate(ev.end ?? new Date(start.getTime() + 3 * HOUR_MS));
  const uid = `wedding-${start.getTime()}-${Math.random().toString(36).slice(2, 10)}@wedding-manager`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding Manager//RSVP//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${_formatUtcCompact(new Date())}`,
    `DTSTART:${_formatUtcCompact(start)}`,
    `DTEND:${_formatUtcCompact(end)}`,
    `SUMMARY:${_icsEscape(ev.title)}`,
  ];
  if (ev.description) lines.push(`DESCRIPTION:${_icsEscape(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${_icsEscape(ev.location)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Build an inline `data:` URL for the ICS file.
 * Useful for `<a href download>` when no Blob is available.
 *
 * @param {CalendarEvent} ev
 * @returns {string}
 */
export function buildIcsDataUrl(ev) {
  const ics = buildIcsContent(ev);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
