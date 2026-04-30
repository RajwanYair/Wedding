/**
 * URL slug generator with Hebrew → ASCII transliteration.
 *
 * Pure function. Transliterates Hebrew letters via a simple lookup table,
 * strips Latin diacritics, lowercases, collapses non-`[a-z0-9]` runs to a
 * single dash, and trims leading/trailing dashes.
 */

const HEBREW = {
  א: "a",
  ב: "b",
  ג: "g",
  ד: "d",
  ה: "h",
  ו: "v",
  ז: "z",
  ח: "ch",
  ט: "t",
  י: "y",
  כ: "k",
  ך: "k",
  ל: "l",
  מ: "m",
  ם: "m",
  נ: "n",
  ן: "n",
  ס: "s",
  ע: "a",
  פ: "p",
  ף: "p",
  צ: "ts",
  ץ: "ts",
  ק: "k",
  ר: "r",
  ש: "sh",
  ת: "t",
};

/**
 * Transliterate Hebrew characters in a string to ASCII.
 *
 * @param {string} input
 * @returns {string}
 */
export function transliterateHebrew(input) {
  let out = "";
  for (const ch of String(input)) {
    out += HEBREW[ch] ?? ch;
  }
  return out;
}

/**
 * Slugify an arbitrary string.
 *
 * @param {unknown} input
 * @param {{ separator?: string }} [options]
 * @returns {string}
 */
export function slugify(input, options = {}) {
  if (input === null || input === undefined) return "";
  const sep = typeof options.separator === "string" ? options.separator : "-";
  const ascii = transliterateHebrew(String(input))
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const escSep = sep.replaceAll(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const collapsed = ascii.replaceAll(/[^a-z0-9]+/g, sep);
  const trimRe = new RegExp(`^${escSep}+|${escSep}+$`, "g");
  return collapsed.replace(trimRe, "");
}
