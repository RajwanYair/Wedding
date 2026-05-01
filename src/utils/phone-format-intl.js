/**
 * International phone formatter — present `cleanPhone()` output (digits
 * only, country code first) in human-readable form per known country
 * patterns. Falls back to a generic grouped-by-3 layout.
 *
 * @typedef {object} PhoneCountry
 * @property {string} code        Dial code without "+", e.g. "972".
 * @property {string} iso         ISO-3166 alpha-2.
 * @property {string} name
 * @property {(rest: string) => string} format
 * @owner shared
 */

/**
 * Group `digits` from the right in chunks of `groupSize`.
 *
 * @param {string} digits
 * @param {number} groupSize
 * @returns {string[]}
 */
function groupRight(digits, groupSize) {
  const out = [];
  let i = digits.length;
  while (i > 0) {
    const start = Math.max(0, i - groupSize);
    out.unshift(digits.slice(start, i));
    i = start;
  }
  return out;
}

/** @type {ReadonlyArray<PhoneCountry>} */
export const COUNTRIES = [
  {
    code: "972",
    iso: "IL",
    name: "Israel",
    format: (r) => {
      // Mobile starts with "5" (after stripping leading 0). 9 digits typical.
      if (r.length === 9) return `${r.slice(0, 2)}-${r.slice(2, 5)}-${r.slice(5)}`;
      if (r.length === 8) return `${r.slice(0, 1)}-${r.slice(1, 4)}-${r.slice(4)}`;
      return groupRight(r, 3).join(" ");
    },
  },
  {
    code: "1",
    iso: "US",
    name: "USA/Canada",
    format: (r) => {
      if (r.length === 10) return `(${r.slice(0, 3)}) ${r.slice(3, 6)}-${r.slice(6)}`;
      return groupRight(r, 3).join(" ");
    },
  },
  {
    code: "44",
    iso: "GB",
    name: "United Kingdom",
    format: (r) => {
      if (r.length === 10) return `${r.slice(0, 4)} ${r.slice(4, 7)} ${r.slice(7)}`;
      return groupRight(r, 3).join(" ");
    },
  },
  {
    code: "33",
    iso: "FR",
    name: "France",
    format: (r) => {
      if (r.length === 9) return r.match(/.{1,2}/g)?.join(" ") ?? r;
      return groupRight(r, 2).join(" ");
    },
  },
  {
    code: "49",
    iso: "DE",
    name: "Germany",
    format: (r) => groupRight(r, 3).join(" "),
  },
];

/**
 * Match the longest dial-code prefix.
 *
 * @param {string} digits
 * @returns {{ country: PhoneCountry, rest: string } | null}
 */
function matchCountry(digits) {
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  for (const country of sorted) {
    if (digits.startsWith(country.code)) {
      return { country, rest: digits.slice(country.code.length) };
    }
  }
  return null;
}

/**
 * Format `e164Digits` (digits-only, e.g. "972541234567") as
 * "+CC <national>". Returns "" for empty input.
 *
 * @param {string} e164Digits
 * @returns {string}
 */
export function formatIntl(e164Digits) {
  if (typeof e164Digits !== "string") return "";
  const digits = e164Digits.replace(/\D+/g, "");
  if (digits.length === 0) return "";
  const matched = matchCountry(digits);
  if (matched) {
    const { country, rest } = matched;
    if (rest.length === 0) return `+${country.code}`;
    return `+${country.code} ${country.format(rest)}`;
  }
  return `+${groupRight(digits, 3).join(" ")}`;
}

/**
 * Resolve country metadata from E.164 digits. Returns null when no known
 * country matches.
 *
 * @param {string} e164Digits
 * @returns {{ iso: string, name: string, code: string } | null}
 */
export function detectCountry(e164Digits) {
  if (typeof e164Digits !== "string") return null;
  const digits = e164Digits.replace(/\D+/g, "");
  const matched = matchCountry(digits);
  if (!matched) return null;
  const { country } = matched;
  return { iso: country.iso, name: country.name, code: country.code };
}
