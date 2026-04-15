/**
 * src/utils/date.js — Date/time utilities (S0 named-export module)
 *
 * All dates use the Asia/Jerusalem timezone.
 */

const TZ = "Asia/Jerusalem";

/**
 * Format an ISO date string (or Date) in Hebrew locale.
 * @param {string|Date} iso
 * @returns {string}  e.g. "יום שישי, 12 בספטמבר 2025"
 */
export function formatDateHebrew(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TZ,
  });
}

/**
 * Count full days remaining until a target date.
 * @param {string|Date} targetIso  Future date
 * @returns {number}  Positive if in the future, 0 on the day, negative if passed
 */
export function daysUntil(targetIso) {
  const now = new Date();
  const target = new Date(targetIso);
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

/**
 * Current ISO timestamp in Asia/Jerusalem timezone.
 * @returns {string}
 */
export function nowISOJerusalem() {
  return new Date().toLocaleString("sv-SE", { timeZone: TZ }).replace(" ", "T");
}
