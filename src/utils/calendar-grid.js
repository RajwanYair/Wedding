/**
 * Month-view calendar grid generator. Pure helper that returns a 6-row ×
 * 7-column array of `{ date, inMonth, isoDate }` cells, leading and
 * trailing days from the adjacent months padded so each row is full.
 *
 * Week starts on `firstDayOfWeek` (0=Sunday, 1=Monday). Defaults to Sunday
 * to match the Hebrew calendar UI.
 *
 * @typedef {object} CalendarCell
 * @property {Date} date
 * @property {boolean} inMonth
 * @property {string} isoDate     YYYY-MM-DD (UTC date components)
 */

/**
 * @param {Date} d
 * @returns {string}
 */
function isoDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build a calendar grid for the given month.
 *
 * @param {number} year
 * @param {number} month        1..12
 * @param {{ firstDayOfWeek?: 0|1|2|3|4|5|6 }} [options]
 * @returns {CalendarCell[][]}
 */
export function monthGrid(year, month, options = {}) {
  if (!Number.isInteger(year)) {
    throw new TypeError("year must be an integer");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("month must be 1..12");
  }
  const firstDayOfWeek = options.firstDayOfWeek ?? 0;
  if (firstDayOfWeek < 0 || firstDayOfWeek > 6) {
    throw new RangeError("firstDayOfWeek must be 0..6");
  }
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const dayOfWeek = firstOfMonth.getUTCDay();
  const lead = (dayOfWeek - firstDayOfWeek + 7) % 7;
  const start = new Date(firstOfMonth);
  start.setUTCDate(start.getUTCDate() - lead);
  const grid = [];
  for (let row = 0; row < 6; row += 1) {
    const week = [];
    for (let col = 0; col < 7; col += 1) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + row * 7 + col);
      week.push({
        date: d,
        inMonth: d.getUTCMonth() === month - 1 && d.getUTCFullYear() === year,
        isoDate: isoDate(d),
      });
    }
    grid.push(week);
  }
  return grid;
}

/**
 * Returns the number of days in `month`/`year`, accounting for leap years.
 *
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
export function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * True when `year` is a leap year (Gregorian).
 *
 * @param {number} year
 * @returns {boolean}
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
