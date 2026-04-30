/**
 * Hebrew pluraliser — chooses the correct grammatical form for `n` of a
 * given noun.  Hebrew has zero/one/two/many distinctions; for nouns we
 * accept four explicit forms.
 *
 * @typedef {object} HeForms
 * @property {string} zero - form for n=0
 * @property {string} one - form for n=1
 * @property {string} two - form for n=2 (dual)
 * @property {string} many - form for n>=3
 */

/**
 * Pluralise according to Hebrew rules.
 *
 * @param {number} n
 * @param {HeForms} forms
 * @returns {string}
 */
export function pluralizeHe(n, forms) {
  if (!forms || typeof forms !== "object") {
    throw new Error("pluralizeHe: forms required");
  }
  if (typeof forms.zero !== "string" || typeof forms.one !== "string" || typeof forms.two !== "string" || typeof forms.many !== "string") {
    throw new Error("pluralizeHe: all forms required");
  }
  const num = Number(n);
  if (!Number.isFinite(num)) return forms.many;
  const abs = Math.abs(num);
  if (abs === 0) return forms.zero;
  if (abs === 1) return forms.one;
  if (abs === 2) return forms.two;
  return forms.many;
}

/**
 * Format `n` followed by the correct noun form, matching common Hebrew
 * idioms (e.g. "שני" prefix for the dual).  Pure string builder.
 *
 * @param {number} n
 * @param {HeForms} forms
 * @returns {string}
 */
export function formatHeCount(n, forms) {
  const noun = pluralizeHe(n, forms);
  const num = Number(n);
  if (!Number.isFinite(num)) return noun;
  const abs = Math.abs(num);
  if (abs === 0) return `אין ${noun}`;
  if (abs === 1) return `${noun} אחד`;
  if (abs === 2) return `שני ${noun}`;
  return `${num} ${noun}`;
}

/**
 * Convenience for English plural ("guest" / "guests").
 *
 * @param {number} n
 * @param {string} singular
 * @param {string} [plural] - defaults to `${singular}s`
 * @returns {string}
 */
export function pluralizeEn(n, singular, plural) {
  if (typeof singular !== "string") throw new Error("pluralizeEn: singular required");
  const num = Number(n);
  if (Number.isFinite(num) && Math.abs(num) === 1) return singular;
  return plural ?? `${singular}s`;
}
