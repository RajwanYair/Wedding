/**
 * Millisecond duration parser/formatter.  Inspired by `ms` but pure ESM
 * with English + Hebrew formatting and no implicit unit fallthrough.
 */

const UNIT_MS = /** @type {const} */ ({
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 31_557_600_000, // 365.25 days
});

const ALIASES = /** @type {Record<string, keyof typeof UNIT_MS>} */ ({
  ms: "ms",
  msec: "ms",
  msecs: "ms",
  millisecond: "ms",
  milliseconds: "ms",
  s: "s",
  sec: "s",
  secs: "s",
  second: "s",
  seconds: "s",
  m: "m",
  min: "m",
  mins: "m",
  minute: "m",
  minutes: "m",
  h: "h",
  hr: "h",
  hrs: "h",
  hour: "h",
  hours: "h",
  d: "d",
  day: "d",
  days: "d",
  w: "w",
  wk: "w",
  wks: "w",
  week: "w",
  weeks: "w",
  y: "y",
  yr: "y",
  yrs: "y",
  year: "y",
  years: "y",
});

/**
 * Parse a duration string like `"1500ms"`, `"2h"`, `"1d 12h"`.  Returns
 * milliseconds, or `null` when input is invalid.
 *
 * @param {string} input
 * @returns {number | null}
 */
export function parseDuration(input) {
  if (typeof input !== "string") return null;
  const tokens = input.trim().toLowerCase().match(/[-+]?\d*\.?\d+\s*[a-z]+/g);
  if (!tokens) return null;
  let total = 0;
  for (const tok of tokens) {
    const m = tok.match(/^([-+]?\d*\.?\d+)\s*([a-z]+)$/);
    if (!m) return null;
    const n = Number(m[1]);
    const unit = ALIASES[m[2]];
    if (!Number.isFinite(n) || !unit) return null;
    total += n * UNIT_MS[unit];
  }
  return total;
}

/**
 * Format a duration in milliseconds as a compact string like `"1d 2h"`.
 *
 * @param {number} ms
 * @param {{ locale?: "en" | "he", compact?: boolean }} [opts]
 * @returns {string}
 */
export function formatDuration(ms, opts = {}) {
  if (!Number.isFinite(ms)) return "";
  const locale = opts.locale ?? "en";
  const compact = opts.compact ?? false;
  const sign = ms < 0 ? "-" : "";
  let rem = Math.abs(ms);
  const parts = [];
  /** @type {Array<[keyof typeof UNIT_MS, string, string]>} */
  const order = [
    ["y", locale === "he" ? "ש" : "y", locale === "he" ? "שנים" : "years"],
    ["w", locale === "he" ? "ש'" : "w", locale === "he" ? "שבועות" : "weeks"],
    ["d", locale === "he" ? "י" : "d", locale === "he" ? "ימים" : "days"],
    ["h", locale === "he" ? "ש''" : "h", locale === "he" ? "שעות" : "hours"],
    ["m", locale === "he" ? "ד" : "m", locale === "he" ? "דקות" : "minutes"],
    ["s", locale === "he" ? "ש" : "s", locale === "he" ? "שניות" : "seconds"],
  ];
  for (const [u, short, long] of order) {
    const v = Math.floor(rem / UNIT_MS[u]);
    if (v > 0) {
      parts.push(compact ? `${v}${short}` : `${v} ${long}`);
      rem -= v * UNIT_MS[u];
    }
    if (parts.length >= 2) break;
  }
  if (parts.length === 0) {
    return compact
      ? `${sign}${Math.round(ms)}${locale === "he" ? "מ\"ש" : "ms"}`
      : `${sign}${Math.round(ms)} ${locale === "he" ? "מילישניות" : "ms"}`;
  }
  return sign + parts.join(" ");
}
