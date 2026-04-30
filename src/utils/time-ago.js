/**
 * Relative-time formatter ("3 hours ago" / "in 2 days") with Hebrew + English
 * phrasing.  Pure function — accepts an injected `now` for testability.
 *
 * @typedef {"he" | "en"} TimeAgoLocale
 *
 * @typedef {object} TimeAgoOptions
 * @property {TimeAgoLocale} [locale]
 * @property {Date | number} [now]
 */

const STEPS = [
  { unit: "year", seconds: 365 * 24 * 3600 },
  { unit: "month", seconds: 30 * 24 * 3600 },
  { unit: "week", seconds: 7 * 24 * 3600 },
  { unit: "day", seconds: 24 * 3600 },
  { unit: "hour", seconds: 3600 },
  { unit: "minute", seconds: 60 },
  { unit: "second", seconds: 1 },
];

const PHRASES = {
  en: {
    just: "just now",
    past: (/** @type {number} */ n, /** @type {string} */ u) =>
      `${n} ${u}${n === 1 ? "" : "s"} ago`,
    future: (/** @type {number} */ n, /** @type {string} */ u) =>
      `in ${n} ${u}${n === 1 ? "" : "s"}`,
    units: {
      year: "year",
      month: "month",
      week: "week",
      day: "day",
      hour: "hour",
      minute: "minute",
      second: "second",
    },
  },
  he: {
    just: "ממש עכשיו",
    past: (/** @type {number} */ n, /** @type {string} */ u) =>
      `לפני ${n} ${u}`,
    future: (/** @type {number} */ n, /** @type {string} */ u) =>
      `בעוד ${n} ${u}`,
    units: {
      year: "שנים",
      month: "חודשים",
      week: "שבועות",
      day: "ימים",
      hour: "שעות",
      minute: "דקות",
      second: "שניות",
    },
  },
};

/**
 * Format a relative time string for the given target.
 *
 * @param {Date | number | string} target
 * @param {TimeAgoOptions} [options]
 * @returns {string}
 */
export function timeAgo(target, options = {}) {
  const locale = options.locale === "he" ? "he" : "en";
  const phrases = PHRASES[locale];
  const now = toEpoch(options.now ?? Date.now());
  const t = toEpoch(target);
  if (!Number.isFinite(t)) return "";
  const deltaSec = Math.round((t - now) / 1000);
  const abs = Math.abs(deltaSec);
  if (abs < 5) return phrases.just;
  for (const step of STEPS) {
    if (abs >= step.seconds) {
      const n = Math.floor(abs / step.seconds);
      const unit = phrases.units[/** @type {keyof typeof phrases.units} */ (step.unit)];
      return deltaSec < 0 ? phrases.past(n, unit) : phrases.future(n, unit);
    }
  }
  return phrases.just;
}

/**
 * @param {Date | number | string} v
 * @returns {number}
 */
function toEpoch(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Date.parse(v);
    return Number.isFinite(n) ? n : Number.NaN;
  }
  return Number.NaN;
}
