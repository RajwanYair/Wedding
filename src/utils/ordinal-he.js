/**
 * Hebrew ordinal helpers — masculine/feminine ordinals 1..10 and a
 * fallback for higher values, plus an English ordinal helper.
 */

const HE_M = [
  "",
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שביעי",
  "שמיני",
  "תשיעי",
  "עשירי",
];

const HE_F = [
  "",
  "ראשונה",
  "שנייה",
  "שלישית",
  "רביעית",
  "חמישית",
  "שישית",
  "שביעית",
  "שמינית",
  "תשיעית",
  "עשירית",
];

/**
 * Hebrew ordinal — masculine by default, feminine when `gender:"f"`.
 * Numbers > 10 fall back to `"ה-N"` form.
 *
 * @param {number} n
 * @param {{ gender?: "m" | "f" }} [opts]
 * @returns {string}
 */
export function ordinalHe(n, opts = {}) {
  if (!Number.isInteger(n) || n < 1) return "";
  const table = opts.gender === "f" ? HE_F : HE_M;
  if (n <= 10) return table[n];
  return `ה-${n}`;
}

/**
 * English ordinal — `1st`, `2nd`, `3rd`, `4th`, ...
 *
 * @param {number} n
 * @returns {string}
 */
export function ordinalEn(n) {
  if (!Number.isInteger(n)) return "";
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  let suffix = "th";
  if (mod100 < 11 || mod100 > 13) {
    switch (abs % 10) {
      case 1:
        suffix = "st";
        break;
      case 2:
        suffix = "nd";
        break;
      case 3:
        suffix = "rd";
        break;
      default:
        suffix = "th";
    }
  }
  return `${n}${suffix}`;
}
