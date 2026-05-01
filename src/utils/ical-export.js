/**
 * iCalendar (.ics) export — RFC 5545 minimal subset for a wedding event.
 *
 * Output is plain ASCII with CRLF line endings, suitable for Apple Calendar,
 * Google Calendar, and Outlook. No external deps.
 *
 * @typedef {object} IcalEvent
 * @property {string} uid          Globally unique id.
 * @property {string} title        SUMMARY field.
 * @property {string} start        ISO 8601 datetime (e.g. 2026-09-12T18:00:00Z).
 * @property {string} [end]        ISO 8601 datetime; defaults to start + 4h.
 * @property {string} [location]   Free-text venue.
 * @property {string} [description]
 * @property {string} [url]
 * @property {string} [organizer] Email of organizer.
 * @owner shared
 */

const CRLF = "\r\n";
const PROD_ID = "-//Wedding Manager//EN";

/**
 * Escape a TEXT-typed iCal field per RFC 5545 §3.3.11.
 *
 * @param {string} s
 * @returns {string}
 */
export function escapeText(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Format an ISO datetime into UTC `YYYYMMDDTHHMMSSZ` form.
 *
 * @param {string | Date} value
 * @returns {string}
 */
export function formatDateTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new RangeError(`invalid date: ${String(value)}`);
  }
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Fold a long line at 75 octets with CRLF + space continuation per RFC 5545.
 *
 * @param {string} line
 * @returns {string}
 */
export function foldLine(line) {
  if (line.length <= 75) return line;
  const out = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    out.push(` ${line.slice(i, i + 74)}`);
    i += 74;
  }
  return out.join(CRLF);
}

/**
 * Build an .ics document from one or more events.
 *
 * @param {ReadonlyArray<IcalEvent>} events
 * @returns {string}
 */
export function buildIcs(events) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PROD_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const stamp = formatDateTime(new Date());
  for (const ev of events) {
    if (!ev || !ev.uid || !ev.title || !ev.start) {
      throw new TypeError("event requires uid, title, and start");
    }
    const start = formatDateTime(ev.start);
    const end = ev.end
      ? formatDateTime(ev.end)
      : formatDateTime(new Date(new Date(ev.start).getTime() + 4 * 60 * 60 * 1000));
    const block = [
      "BEGIN:VEVENT",
      `UID:${escapeText(ev.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(ev.title)}`,
    ];
    if (ev.location) block.push(`LOCATION:${escapeText(ev.location)}`);
    if (ev.description) block.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.url) block.push(`URL:${escapeText(ev.url)}`);
    if (ev.organizer) block.push(`ORGANIZER:mailto:${ev.organizer}`);
    block.push("END:VEVENT");
    for (const l of block) lines.push(foldLine(l));
  }
  lines.push("END:VCALENDAR");
  return lines.join(CRLF) + CRLF;
}
