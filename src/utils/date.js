/**
 * src/utils/date.js — Date/time utilities (S0 named-export module)
 *
 * All dates use the Asia/Jerusalem timezone.
 */

import { formatDate, currentLang } from "../core/i18n.js";

const TZ = "Asia/Jerusalem";

/** Map lang code → BCP-47 locale string */
function _locale() {
  const map = /** @type {Record<string, string>} */ ({ he: "he-IL", en: "en-IL", ar: "ar-IL", ru: "ru-IL" });
  return map[currentLang()] ?? "he-IL";
}

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

/**
 * Format a date relative to now using Intl.RelativeTimeFormat (S22a).
 * Returns a locale-aware string such as "לפני 3 ימים", "in 2 weeks", etc.
 * @param {string|Date} iso
 * @returns {string}
 */
export function formatRelative(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const locale = _locale();
  const diffMs = d.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr  = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);
  const diffWk  = Math.round(diffDay / 7);
  const diffMo  = Math.round(diffDay / 30);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffSec) < 60)   return rtf.format(diffSec, "second");
  if (Math.abs(diffMin) < 60)   return rtf.format(diffMin, "minute");
  if (Math.abs(diffHr)  < 24)   return rtf.format(diffHr,  "hour");
  if (Math.abs(diffDay) < 14)   return rtf.format(diffDay, "day");
  if (Math.abs(diffWk)  < 8)    return rtf.format(diffWk,  "week");
  return rtf.format(diffMo, "month");
}
