/**
 * Lightweight password strength scorer (zxcvbn-lite). No external deps.
 *
 * Pure function returning a 0..4 score, a stable label key, and an array
 * of i18n suggestion keys (caller maps to translations).
 *
 * @typedef {object} StrengthReport
 * @property {0|1|2|3|4} score
 * @property {"empty"|"very-weak"|"weak"|"fair"|"strong"|"very-strong"} label
 * @property {string[]} suggestions   i18n keys, e.g. "password.add_symbol".
 * @owner shared
 */

const COMMON = new Set([
  "password",
  "123456",
  "12345678",
  "qwerty",
  "letmein",
  "abc123",
  "iloveyou",
  "admin",
  "welcome",
  "monkey",
]);

/**
 * @param {string} input
 * @returns {StrengthReport}
 */
export function score(input) {
  if (typeof input !== "string" || input.length === 0) {
    return { score: 0, label: "empty", suggestions: ["password.empty"] };
  }
  const s = input;
  const suggestions = [];
  let pts = 0;

  if (s.length >= 8) pts += 1;
  else suggestions.push("password.min_length");
  if (s.length >= 12) pts += 1;
  if (s.length >= 16) pts += 1;

  const hasLower = /[a-z]/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  const hasDigit = /\d/.test(s);
  const hasSymbol = /[^a-zA-Z0-9]/.test(s);

  let classes = 0;
  if (hasLower) classes += 1;
  if (hasUpper) classes += 1;
  if (hasDigit) classes += 1;
  if (hasSymbol) classes += 1;
  pts += classes - 1; // 0..3

  if (!hasUpper) suggestions.push("password.add_upper");
  if (!hasDigit) suggestions.push("password.add_digit");
  if (!hasSymbol) suggestions.push("password.add_symbol");

  if (/(.)\1{2,}/.test(s)) {
    pts -= 1;
    suggestions.push("password.no_repeats");
  }

  if (COMMON.has(s.toLowerCase())) {
    pts = 0;
    suggestions.push("password.common");
  }

  const clamped = Math.max(0, Math.min(4, pts));
  /** @type {StrengthReport["label"]} */
  const label = (
    [
      "very-weak",
      "weak",
      "fair",
      "strong",
      "very-strong",
    ]
  )[clamped];
  return { score: /** @type {0|1|2|3|4} */ (clamped), label, suggestions };
}
