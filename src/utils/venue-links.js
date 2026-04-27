/**
 * src/utils/venue-links.js — S116 venue map + navigation + calendar helpers.
 *
 * Pure URL builders for embedding the venue map (OpenStreetMap, no API key),
 * launching Waze / Google Maps / Apple Maps directions, and adding the event
 * to Google Calendar / Apple Calendar (.ics).
 *
 * All inputs are validated; outputs are deterministic and safe to embed.
 */

/** Approx. ±0.005° box (~500 m) around the marker for the OSM iframe. */
const OSM_BBOX_DELTA = 0.005;

function clampLat(lat) {
  if (typeof lat !== "number" || Number.isNaN(lat)) throw new Error("invalid lat");
  return Math.max(-90, Math.min(90, lat));
}
function wrapLon(lon) {
  if (typeof lon !== "number" || Number.isNaN(lon)) throw new Error("invalid lon");
  let v = ((lon + 180) % 360 + 360) % 360 - 180;
  if (v === -180) v = 180;
  // Trim float drift (e.g. 34.7818 -> 34.78180000000001) for stable URLs.
  return Math.round(v * 1e10) / 1e10;
}

/**
 * Build an OpenStreetMap embed URL (no API key required) with a marker.
 * @param {number} lat
 * @param {number} lon
 * @param {{ delta?: number }} [opts]
 */
export function buildOsmEmbedUrl(lat, lon, opts = {}) {
  const la = clampLat(lat);
  const lo = wrapLon(lon);
  const d = opts.delta ?? OSM_BBOX_DELTA;
  const bbox = `${lo - d},${la - d},${lo + d},${la + d}`;
  const params = new URLSearchParams({
    bbox,
    layer: "mapnik",
    marker: `${la},${lo}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params.toString()}`;
}

/**
 * Build a Waze deep-link URL that opens directions to the venue.
 * @param {number} lat
 * @param {number} lon
 * @param {{ navigate?: boolean }} [opts]
 */
export function buildWazeUrl(lat, lon, opts = {}) {
  const la = clampLat(lat);
  const lo = wrapLon(lon);
  const params = new URLSearchParams({
    ll: `${la},${lo}`,
    navigate: opts.navigate === false ? "no" : "yes",
  });
  return `https://waze.com/ul?${params.toString()}`;
}

/** Google Maps directions URL using the public, key-free /maps endpoint. */
export function buildGoogleMapsUrl(lat, lon) {
  const la = clampLat(lat);
  const lo = wrapLon(lon);
  return `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}`;
}

/* ── Google Calendar ─────────────────────────────────────────────────── */

function toGCalDate(d) {
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Build a Google Calendar "Add Event" URL (no OAuth — opens the user's
 * browser-side compose flow).
 *
 * @param {{ title: string, start: Date, end: Date, location?: string, details?: string }} ev
 */
export function buildGoogleCalendarUrl(ev) {
  if (!ev?.title) throw new Error("title required");
  if (!(ev.start instanceof Date) || !(ev.end instanceof Date)) {
    throw new Error("start/end must be Date");
  }
  if (ev.end <= ev.start) throw new Error("end must follow start");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${toGCalDate(ev.start)}/${toGCalDate(ev.end)}`,
  });
  if (ev.location) params.set("location", ev.location);
  if (ev.details) params.set("details", ev.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build a minimal RFC 5545 .ics body for Apple/Outlook calendars. Returns
 * a string that callers can wrap in a `data:text/calendar` URL or download.
 *
 * @param {{ title: string, start: Date, end: Date, location?: string, details?: string, uid?: string }} ev
 */
export function buildIcsContent(ev) {
  if (!ev?.title) throw new Error("title required");
  const fmt = toGCalDate;
  const uid = ev.uid ?? `${fmt(ev.start)}-${ev.title.replace(/\s+/g, "_")}@wedding`;
  const esc = (s) =>
    String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WeddingManager//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${fmt(new Date(0))}`,
    `DTSTART:${fmt(ev.start)}`,
    `DTEND:${fmt(ev.end)}`,
    `SUMMARY:${esc(ev.title)}`,
    ev.location ? `LOCATION:${esc(ev.location)}` : null,
    ev.details ? `DESCRIPTION:${esc(ev.details)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
