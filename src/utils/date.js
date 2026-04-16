/**
 * src/utils/date.js — Date/time utilities (S0 named-export module)
 *
 * All dates use the Asia/Jerusalem timezone.
 */

import { formatDate } from "../core/i18n.js";

const TZ = "Asia/Jerusalem";

/**
 * Format an ISO date string (or Date) in the current app locale.
 * Falls back to Hebrew locale if i18n module not ready.
 * @param {string|Date} iso
 * @returns {string}  e.g. "יום שישי, 12 בספטמבר 2025"
 */
export function formatDateHebrew(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return formatDate(d, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
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
