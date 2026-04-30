/**
 * Fuzzy text match — Levenshtein distance plus a 0..1 similarity score
 * suitable for guest-name lookup.
 *
 * @typedef {object} FuzzyResult
 * @property {string} value
 * @property {number} distance
 * @property {number} score      0..1, where 1 is exact match.
 */

/**
 * Compute Levenshtein distance using two-row DP. O(n*m) time / O(min(n,m)) space.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return Infinity;
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Normalise: lowercase, trim, collapse whitespace.
 *
 * @param {string} input
 * @returns {string}
 */
function normalise(input) {
  return String(input).trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Similarity score 0..1.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function similarity(a, b) {
  const an = normalise(a);
  const bn = normalise(b);
  if (an.length === 0 && bn.length === 0) return 1;
  const longest = Math.max(an.length, bn.length);
  if (longest === 0) return 1;
  const dist = levenshtein(an, bn);
  return 1 - dist / longest;
}

/**
 * Find the best matches for `query` from `candidates`. Sorted by score desc.
 *
 * @param {string} query
 * @param {ReadonlyArray<string>} candidates
 * @param {{ threshold?: number, limit?: number }} [options]
 * @returns {FuzzyResult[]}
 */
export function search(query, candidates, options = {}) {
  const threshold = Number.isFinite(options.threshold) ? options.threshold : 0.5;
  const limit = Number.isFinite(options.limit) && options.limit > 0
    ? Math.floor(options.limit)
    : Infinity;
  const results = candidates
    .filter((c) => typeof c === "string")
    .map((value) => ({
      value,
      distance: levenshtein(normalise(query), normalise(value)),
      score: similarity(query, value),
    }))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value));
  return results.slice(0, limit);
}
