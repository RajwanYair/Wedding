/**
 * src/utils/date-range.js — Date range utilities (Sprint 181)
 *
 * Pure functions — no DOM, no side effects. Dates as ISO strings or Date objects.
 * All comparisons treat dates as UTC midnight.
 */

/**
 * Create a date range object.
 * @param {string|Date} start
 * @param {string|Date} end
 * @returns {{ start: Date, end: Date }}
 */
export function createDateRange(start, end) {
  return { start: new Date(start), end: new Date(end) };
}

/**
 * Return true when `date` falls within [range.start, range.end] (inclusive).
 * @param {string|Date} date
 * @param {{ start: Date, end: Date }} range
 * @returns {boolean}
 */
export function isInRange(date, range) {
  const d = new Date(date).getTime();
  return d >= range.start.getTime() && d <= range.end.getTime();
}

/**
 * Return true when two ranges overlap (at least one shared millisecond).
 * @param {{ start: Date, end: Date }} a
 * @param {{ start: Date, end: Date }} b
 * @returns {boolean}
 */
export function overlaps(a, b) {
  return a.start.getTime() <= b.end.getTime() && a.end.getTime() >= b.start.getTime();
}

/**
 * Number of full days until a future date from now.
 * Positive for future, negative for past, 0 for today.
 * @param {string|Date} date
 * @returns {number}
 */
export function daysUntil(date) {
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

/**
 * Number of full days between two dates (absolute).
 * @param {string|Date} d1
 * @param {string|Date} d2
 * @returns {number}
 */
export function daysBetween(d1, d2) {
  return Math.abs(Math.round((new Date(d1).getTime() - new Date(d2).getTime()) / 86_400_000));
}

/**
 * Format a date range as a human-readable string.
 * @param {{ start: Date, end: Date }} range
 * @param {string} [locale="he-IL"]
 * @returns {string}  e.g. "1 ינו׳ 2025 – 5 ינו׳ 2025"
 */
export function formatDateRange(range, locale = "he-IL") {
  const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  return `${fmt.format(range.start)} – ${fmt.format(range.end)}`;
}

/**
 * Expand a range into an array of Date objects, one per day.
 * @param {{ start: Date, end: Date }} range
 * @returns {Date[]}
 */
export function expandDays(range) {
  const days = [];
  const cur = new Date(range.start);
  cur.setHours(0, 0, 0, 0);
  const endMs = new Date(range.end).setHours(23, 59, 59, 999);
  while (cur.getTime() <= endMs) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
