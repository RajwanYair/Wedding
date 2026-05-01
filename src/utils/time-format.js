/**
 * Wedding-time formatting helpers — countdown labels and bilingual durations.
 *
 * Pure functions; no DOM, no external i18n dependency. Returns the *English*
 * label by default (callers can map via i18n or supply Hebrew labels).
 * @owner shared
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/**
 * Floor difference (target − now) in whole days.
 *
 * @param {string | number | Date} target
 * @param {string | number | Date} [now=new Date()]
 * @returns {number} integer days; negative when target is in the past.
 */
export function daysBetween(target, now = new Date()) {
  const t = target instanceof Date ? target.getTime() : new Date(target).getTime();
  const n = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(t) || !Number.isFinite(n)) {
    throw new RangeError("invalid date");
  }
  return Math.floor((t - n) / DAY_MS);
}

/**
 * Decompose a millisecond delta into days/hours/minutes/seconds.
 *
 * @param {number} ms
 * @returns {{ days: number, hours: number, minutes: number, seconds: number, negative: boolean }}
 */
export function decomposeDuration(ms) {
  if (!Number.isFinite(ms)) {
    throw new RangeError("ms must be finite");
  }
  const negative = ms < 0;
  let abs = Math.abs(ms);
  const days = Math.floor(abs / DAY_MS);
  abs -= days * DAY_MS;
  const hours = Math.floor(abs / HOUR_MS);
  abs -= hours * HOUR_MS;
  const minutes = Math.floor(abs / MINUTE_MS);
  abs -= minutes * MINUTE_MS;
  const seconds = Math.floor(abs / 1000);
  return { days, hours, minutes, seconds, negative };
}

/**
 * Render a short countdown label like "12d 04h", "3h 22m", or "in 45s".
 *
 * @param {number} ms
 * @returns {string}
 */
export function formatCountdown(ms) {
  const { days, hours, minutes, seconds, negative } = decomposeDuration(ms);
  let label;
  if (days > 0) label = `${days}d ${String(hours).padStart(2, "0")}h`;
  else if (hours > 0) label = `${hours}h ${String(minutes).padStart(2, "0")}m`;
  else if (minutes > 0) label = `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  else label = `${seconds}s`;
  return negative ? `-${label}` : label;
}

/**
 * Bucket a delta-from-now into a wedding-context phase for UI badges.
 *
 * @param {number} msUntil
 * @returns {"past" | "tonight" | "imminent" | "soon" | "weeks-away" | "future"}
 */
export function weddingPhase(msUntil) {
  if (!Number.isFinite(msUntil)) return "future";
  if (msUntil < 0) return "past";
  if (msUntil < DAY_MS) return "tonight";
  if (msUntil < 7 * DAY_MS) return "imminent";
  if (msUntil < 30 * DAY_MS) return "soon";
  if (msUntil < 90 * DAY_MS) return "weeks-away";
  return "future";
}
