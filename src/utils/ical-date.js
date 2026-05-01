/**
 * iCalendar (RFC 5545) date utilities — format/parse `DATE` and
 * `DATE-TIME` (UTC) values used in `.ics` files.
 * @owner shared
 */

/**
 * Format a `Date` as an iCal `DATE-TIME` in UTC: `YYYYMMDDTHHMMSSZ`.
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatIcalUtc(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  const hh = pad2(date.getUTCHours());
  const mm = pad2(date.getUTCMinutes());
  const ss = pad2(date.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * Format a `Date` as an iCal `DATE` (date only): `YYYYMMDD`.
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatIcalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getUTCFullYear().toString().padStart(4, "0");
  const m = pad2(date.getUTCMonth() + 1);
  const d = pad2(date.getUTCDate());
  return `${y}${m}${d}`;
}

/**
 * Parse iCal `DATE` or `DATE-TIME` (UTC) into a `Date`.  Returns `null`
 * for invalid input.  Local-time DATE-TIME (no `Z` suffix) is treated as
 * UTC for safety.
 *
 * @param {string} input
 * @returns {Date | null}
 */
export function parseIcal(input) {
  if (typeof input !== "string") return null;
  const m = input.trim().match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/,
  );
  if (!m) return null;
  const [, y, mo, d, hh = "00", mm = "00", ss = "00"] = m;
  const t = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    Number(ss),
  );
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

/**
 * Escape a string for use in an iCal text property (DESCRIPTION, SUMMARY).
 *
 * @param {string} text
 * @returns {string}
 */
export function escapeIcalText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * @param {number} n
 */
function pad2(n) {
  return n.toString().padStart(2, "0");
}
