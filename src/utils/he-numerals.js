/**
 * Hebrew letter numerals (Gematria-style) used for chapters,
 * Mishna citations, anniversary numbering, etc.  Range 1–999.
 *
 * - Standard ordering: thousands · hundreds · tens · units.
 * - Special pairs taken care of: 15 → ט״ו (not י״ה) and 16 → ט״ז.
 * - Emits geresh (׳) for single letters and gershayim (״) before the
 *   final letter for multi-letter values, per modern convention.
 */

const UNITS = [
  "",
  "א",
  "ב",
  "ג",
  "ד",
  "ה",
  "ו",
  "ז",
  "ח",
  "ט",
];
const TENS = [
  "",
  "י",
  "כ",
  "ל",
  "מ",
  "נ",
  "ס",
  "ע",
  "פ",
  "צ",
];
const HUNDREDS = [
  "",
  "ק",
  "ר",
  "ש",
  "ת",
  "תק",
  "תר",
  "תש",
  "תת",
  "תתק",
];

const GERESH = "\u05F3"; // ׳
const GERSHAYIM = "\u05F4"; // ״

/**
 * Convert a positive integer (1–999, or up to 9999 with thousands prefix)
 * into Hebrew letter numerals.
 *
 * @param {number} n
 * @param {{ punctuation?: boolean }} [opts]
 * @returns {string}
 */
export function toHebrewNumeral(n, opts = {}) {
  if (!Number.isInteger(n) || n < 1 || n > 9999) {
    throw new RangeError("toHebrewNumeral: expected integer 1..9999");
  }
  const punctuation = opts.punctuation !== false;
  let prefix = "";
  let rest = n;
  if (rest >= 1000) {
    const thousands = Math.floor(rest / 1000);
    prefix = UNITS[thousands] + GERESH;
    rest = rest % 1000;
    if (rest === 0) return prefix;
  }
  let letters = "";
  const h = Math.floor(rest / 100);
  letters += HUNDREDS[h];
  const rem = rest % 100;
  if (rem === 15) {
    letters += "טו";
  } else if (rem === 16) {
    letters += "טז";
  } else {
    const t = Math.floor(rem / 10);
    const u = rem % 10;
    letters += TENS[t] + UNITS[u];
  }
  if (!punctuation) return prefix + letters;
  if (letters.length === 1) {
    return prefix + letters + GERESH;
  }
  return (
    prefix +
    letters.slice(0, -1) +
    GERSHAYIM +
    letters.slice(-1)
  );
}

/**
 * Parse a Hebrew letter numeral back to an integer; returns null on
 * invalid input.  Strips geresh / gershayim before parsing.
 *
 * @param {string} s
 * @returns {number | null}
 */
export function fromHebrewNumeral(s) {
  if (typeof s !== "string") return null;
  /** @type {Record<string, number>} */
  const VALUES = {
    א: 1,
    ב: 2,
    ג: 3,
    ד: 4,
    ה: 5,
    ו: 6,
    ז: 7,
    ח: 8,
    ט: 9,
    י: 10,
    כ: 20,
    ך: 20,
    ל: 30,
    מ: 40,
    ם: 40,
    נ: 50,
    ן: 50,
    ס: 60,
    ע: 70,
    פ: 80,
    ף: 80,
    צ: 90,
    ץ: 90,
    ק: 100,
    ר: 200,
    ש: 300,
    ת: 400,
  };
  const cleaned = s.replace(/[\u05F3\u05F4'"\s]/g, "");
  if (cleaned.length === 0) return null;
  let total = 0;
  for (const ch of cleaned) {
    const v = VALUES[ch];
    if (v === undefined) return null;
    total += v;
  }
  return total;
}
