/**
 * Timezone display helpers using the Intl API. Wedding events are in
 * Asia/Jerusalem; guests may live elsewhere. These helpers render an ISO
 * timestamp in any IANA timezone with stable formatting.
 */

/**
 * Format an ISO timestamp as `YYYY-MM-DD HH:mm` in `timeZone`.
 *
 * @param {string} iso
 * @param {string} timeZone
 * @returns {string}
 */
export function formatInZone(iso, timeZone) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) throw new RangeError("invalid ISO timestamp");
  if (typeof timeZone !== "string" || timeZone.length === 0) {
    throw new TypeError("timeZone must be a non-empty string");
  }
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(t)).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

/**
 * Compute the offset (in minutes) of `iso` in `timeZone` relative to UTC.
 * Handles DST.
 *
 * @param {string} iso
 * @param {string} timeZone
 * @returns {number}
 */
export function offsetMinutes(iso, timeZone) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) throw new RangeError("invalid ISO timestamp");
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(t)).map((p) => [p.type, p.value]));
  // Reconstruct as if it were UTC, then diff with the original instant.
  const localUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((localUtc - t) / 60_000);
}

/**
 * Format `+HH:mm` / `-HH:mm` from a minutes offset.
 *
 * @param {number} mins
 * @returns {string}
 */
export function formatOffset(mins) {
  if (!Number.isFinite(mins)) return "";
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60).toString().padStart(2, "0");
  const m = (abs % 60).toString().padStart(2, "0");
  return `${sign}${h}:${m}`;
}

/**
 * Compute time difference in hours between two zones at instant `iso`.
 * Positive when `tzB` is east of `tzA`.
 *
 * @param {string} iso
 * @param {string} tzA
 * @param {string} tzB
 * @returns {number}
 */
export function diffHours(iso, tzA, tzB) {
  const a = offsetMinutes(iso, tzA);
  const b = offsetMinutes(iso, tzB);
  return (b - a) / 60;
}
