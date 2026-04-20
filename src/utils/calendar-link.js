/**
 * src/utils/calendar-link.js — Sprint 25 (Phase 4.4 Integrations)
 *
 * Build \"Add to Calendar\" links for Google Calendar and Apple/iCal (RFC 5545 ICS).
 * Pure functions — no DOM side-effects, no external deps, no window.* references.
 *
 * Usage:
 *   import { buildGoogleCalendarLink, buildIcsDataUrl } from \"../utils/calendar-link.js\";
 *
 *   const googleUrl = buildGoogleCalendarLink({ title: \"Our Wedding\", startDate: \"2025-09-20\",
 *     location: \"The Grand Hall\", description: \"RSVP: …\" });
 *   const icsUrl = buildIcsDataUrl({ title: \"Our Wedding\", startDate: \"2025-09-20\" });
 */

/**
 * @typedef {{
 *   title: string,
 *   startDate: string,       // ISO date \"YYYY-MM-DD\" or full ISO-8601 datetime
 *   endDate?: string,        // defaults to same day as startDate
 *   startTime?: string,      // \"HH:MM\" 24-hour; if omitted, treated as all-day
 *   endTime?: string,        // \"HH:MM\" 24-hour; defaults to startTime + 2h    
 *   location?: string,
 *   description?: string,
 * }} CalendarEvent
 */

// ── Helpers ────────────────────────────────────────────────────────────────  

/**
 * Normalise a date/time pair into a Google Calendar \dates\ param token.       
 * All-day: YYYYMMDD/YYYYMMDD
 * Timed:   YYYYMMDDTHHmmss/YYYYMMDDTHHmmss
 *
 * @param {string} startDate   YYYY-MM-DD
 * @param {string} [endDate]   YYYY-MM-DD (defaults to startDate)
 * @param {string} [startTime] HH:MM
 * @param {string} [endTime]   HH:MM (defaults to startTime + 2h)
 * @returns {string}
 */
function _buildGoogleDateRange(startDate, endDate, startTime, endTime) {        
  const sd = startDate.replace(/-/g, '');
  const ed = (endDate ?? startDate).replace(/-/g, '');

  if (!startTime) {
    // All-day: Google expects end = next day for single-day events
    const nextDay = new Date(`${startDate  }T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const nd = nextDay.toISOString().slice(0, 10).replace(/-/g, '');
    return `${sd  }/${  nd}`;
  }

  const [sh, sm] = startTime.split(':').map(Number);
  const et = endTime ?? (`${String((sh + 2) % 24).padStart(2, '0')  }:${  String(sm).padStart(2, '0')}`);
  const st = `${sh.toString().padStart(2, '0') + String(sm).padStart(2, '0')  }00`;
  const [eh, em] = et.split(':').map(Number);
  const etStr = `${eh.toString().padStart(2, '0') + String(em).padStart(2, '0')  }00`;

  return `${sd  }T${  st  }/${  ed  }T${  etStr}`;
}

/**
 * Format a date + optional time as an RFC 5545 DTSTART/DTEND value.
 * @param {string} date   YYYY-MM-DD
 * @param {string} [time] HH:MM
 * @returns {string}  e.g. \"20250920\" or \"20250920T180000\"
 */
function _icsDateTime(date, time) {
  const d = date.replace(/-/g, '');
  if (!time) return d;
  const [h, m] = time.split(':').map(Number);
  return `${d  }T${  String(h).padStart(2, '0')  }${String(m).padStart(2, '0')  }00`;   
}

/**
 * Escape text for ICS DESCRIPTION / SUMMARY fields.
 * RFC 5545 §3.3.11: commas, semicolons, backslashes must be escaped.
 * @param {string} text
 * @returns {string}
 */
function _escapeIcs(text) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Generate a simple UID for the ICS event (deterministic from title + startDate).
 * @param {string} title
 * @param {string} startDate
 * @returns {string}
 */
function _icsUid(title, startDate) {
  const hash = Array.from(title + startDate).reduce(
    (acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0,
  );
  return `${hash  }-wedding@wedding-manager`;
}

// ── Public API ─────────────────────────────────────────────────────────────  

/**
 * Build a Google Calendar \"Add event\" URL.
 * Opens the pre-filled new-event form in the user's Google Calendar.
 *
 * @param {CalendarEvent} event
 * @returns {string}  Full Google Calendar URL
 */
export function buildGoogleCalendarLink(event) {
  const base = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({ action: 'TEMPLATE' });

  params.set('text', event.title);
  params.set('dates', _buildGoogleDateRange(
    event.startDate, event.endDate, event.startTime, event.endTime,
  ));
  if (event.location)    params.set('location', event.location);
  if (event.description) params.set('details',  event.description);

  return `${base  }?${  params.toString()}`;
}

/**
 * Build the raw RFC 5545 ICS calendar file content as a string.
 * Compatible with Apple Calendar, Outlook, Thunderbird, and any compliant client.
 *
 * @param {CalendarEvent} event
 * @returns {string}  RFC 5545 VCALENDAR text
 */
export function buildIcsContent(event) {
  const uid   = _icsUid(event.title, event.startDate);
  const dtStart = _icsDateTime(event.startDate, event.startTime);
  const endDate = event.endDate ?? event.startDate;
  let dtEnd;
  if (!event.startTime) {
    // All-day: DTEND = next day per RFC 5545 §3.6.1
    const next = new Date(`${endDate  }T00:00:00`);
    next.setDate(next.getDate() + 1);
    dtEnd = next.toISOString().slice(0, 10).replace(/-/g, '');
  } else {
    dtEnd = _icsDateTime(endDate, event.endTime ?? (
      (() => {
        const [h, m] = (event.startTime).split(':').map(Number);
        return `${String((h + 2) % 24).padStart(2, '0')  }:${  String(m).padStart(2, '0')}`;
      })()
    ));
  }

  const dtProp = event.startTime ? 'DTSTART' : 'DTSTART;VALUE=DATE';
  const dtEndProp = event.startTime ? 'DTEND' : 'DTEND;VALUE=DATE';
  const now = `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)  }Z`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wedding Manager//wedding-manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${  uid}`,
    `DTSTAMP:${  now}`,
    `${dtProp  }:${  dtStart}`,
    `${dtEndProp  }:${  dtEnd}`,
    `SUMMARY:${  _escapeIcs(event.title)}`,
  ];
  if (event.location)    lines.push(`LOCATION:${  _escapeIcs(event.location)}`);  
  if (event.description) lines.push(`DESCRIPTION:${  _escapeIcs(event.description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `${lines.join("\r\n")  }\r\n`;
}

/**
 * Build a \data:\ URI for the ICS file that can be used as an anchor href.     
 * Clicking the link triggers a download of a \.ics\ file in most browsers.     
 *
 * @param {CalendarEvent} event
 * @returns {string}  data: URI
 */
export function buildIcsDataUrl(event) {
  const content = buildIcsContent(event);
  // encodeURIComponent is safe for data: URIs; no external server involved     
  return `data:text/calendar;charset=utf-8,${  encodeURIComponent(content)}`;     
}
