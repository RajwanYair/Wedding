/**
 * src/utils/wedding-countdown.js — Wedding countdown utility (Sprint 36)
 *
 * Computes a live countdown (days / hours / minutes / seconds) from now to
 * the wedding date, always using the Asia/Jerusalem timezone.
 * Pure functions — no side effects, no DOM access, no external deps.
 *
 * Roadmap ref: Phase 3.1 — Dashboard enhancements
 */

const TZ = "Asia/Jerusalem";

/**
 * @typedef {{
 *   days:    number,
 *   hours:   number,
 *   minutes: number,
 *   seconds: number,
 *   total:   number,
 *   isToday: boolean,
 *   isPast:  boolean,
 * }} Countdown
 */

/**
 * Parse a wedding date string (or Date) into a Date object midnight Jerusalem time.
 * Accepts ISO date strings ("YYYY-MM-DD"), ISO datetime strings, or Date objects.
 *
 * @param {string | Date} weddingDate
 * @returns {Date}
 */
function _parseWeddingDate(weddingDate) {
  if (weddingDate instanceof Date) return weddingDate;
  // For "YYYY-MM-DD" strings we want midnight in Jerusalem, not UTC midnight.
  // Build a local-time string and use Intl to get the correct offset.
  const s = String(weddingDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    // Create a date at midnight Jerusalem by appending T00:00:00 and converting
    return new Date(`${s}T00:00:00`);
  }
  return new Date(s);
}

/**
 * Return the current date at midnight in Asia/Jerusalem for "is today" comparison.
 * @param {Date} now
 * @returns {string}  "YYYY-MM-DD" in Jerusalem timezone
 */
function _toJerusalemDateStr(now) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Compute the countdown from `now` to `weddingDate`.
 *
 * @param {string | Date} weddingDate  Target date/datetime
 * @param {Date} [now]                 Defaults to new Date() — override in tests
 * @returns {Countdown}
 */
export function computeCountdown(weddingDate, now = new Date()) {
  const target = _parseWeddingDate(weddingDate);
  const diffMs = target.getTime() - now.getTime();
  const isPast  = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const totalSec  = Math.floor(absDiff / 1000);
  const seconds   = totalSec % 60;
  const totalMin  = Math.floor(totalSec / 60);
  const minutes   = totalMin % 60;
  const totalHrs  = Math.floor(totalMin / 60);
  const hours     = totalHrs % 24;
  const days      = Math.floor(totalHrs / 24);

  const weddingDateStr = _toJerusalemDateStr(target);
  const nowDateStr     = _toJerusalemDateStr(now);
  const isToday        = weddingDateStr === nowDateStr;

  return { days, hours, minutes, seconds, total: totalSec, isToday, isPast };
}

/**
 * Format a Countdown into a human-readable string.
 *
 * @param {Countdown} countdown
 * @param {"he" | "en"} [locale="en"]
 * @returns {string}
 */
export function formatCountdownHuman(countdown, locale = "en") {
  const { days, hours, minutes, isToday, isPast } = countdown;

  if (isToday) {
    return locale === "he" ? "היום החתונה! 🎉" : "Today is the wedding! 🎉";
  }

  if (isPast) {
    if (days === 0) {
      return locale === "he"
        ? `החתונה הייתה לפני ${hours} שעות`
        : `The wedding was ${hours} hours ago`;
    }
    return locale === "he"
      ? `החתונה הייתה לפני ${days} ימים`
      : `The wedding was ${days} days ago`;
  }

  if (days === 0 && hours === 0) {
    return locale === "he"
      ? `עוד ${minutes} דקות`
      : `${minutes} minutes to go`;
  }
  if (days === 0) {
    return locale === "he"
      ? `עוד ${hours} שעות ו-${minutes} דקות`
      : `${hours}h ${minutes}m to go`;
  }
  if (days === 1) {
    return locale === "he" ? "מחר!" : "Tomorrow!";
  }
  return locale === "he"
    ? `עוד ${days} ימים`
    : `${days} days to go`;
}
