/**
 * Convert integers (0–9_999_999) to English words and back.  Used for
 * cheque-style amounts in vendor payment exports.
 */

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

/**
 * @param {number} n
 * @returns {string}
 */
export function numberToWordsEn(n) {
  if (!Number.isInteger(n) || n < 0 || n > 9_999_999) {
    throw new RangeError("numberToWordsEn: expected integer 0..9_999_999");
  }
  if (n === 0) return ONES[0];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;
  /** @type {string[]} */
  const parts = [];
  if (millions > 0) parts.push(`${below1000(millions)} million`);
  if (thousands > 0) parts.push(`${below1000(thousands)} thousand`);
  if (rest > 0) parts.push(below1000(rest));
  return parts.join(" ");
}

/**
 * Parse English number words back to integer; returns null on bad input.
 * Accepts forms produced by `numberToWordsEn` plus common variants
 * ("and", commas, hyphenated tens like "twenty-one").
 *
 * @param {string} s
 * @returns {number | null}
 */
export function wordsToNumberEn(s) {
  if (typeof s !== "string") return null;
  const tokens = s
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter((t) => t && t !== "and");
  if (tokens.length === 0) return null;

  /** @type {Record<string, number>} */
  const SMALL = {};
  for (let i = 0; i < ONES.length; i += 1) SMALL[ONES[i]] = i;
  for (let i = 2; i < TENS.length; i += 1) SMALL[TENS[i]] = i * 10;
  /** @type {Record<string, number>} */
  const SCALES = { hundred: 100, thousand: 1000, million: 1_000_000 };

  let total = 0;
  let current = 0;
  for (const tok of tokens) {
    if (tok in SMALL) {
      current += SMALL[tok];
    } else if (tok === "hundred") {
      if (current === 0) current = 1;
      current *= SCALES.hundred;
    } else if (tok === "thousand" || tok === "million") {
      if (current === 0) current = 1;
      total += current * SCALES[tok];
      current = 0;
    } else {
      return null;
    }
  }
  return total + current;
}

/**
 * @param {number} n
 * @returns {string}
 */
function below1000(n) {
  if (n >= 100) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return r === 0 ? `${ONES[h]} hundred` : `${ONES[h]} hundred ${below100(r)}`;
  }
  return below100(n);
}

/**
 * @param {number} n
 * @returns {string}
 */
function below100(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? TENS[t] : `${TENS[t]}-${ONES[u]}`;
}
