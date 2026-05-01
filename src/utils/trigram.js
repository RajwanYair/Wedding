/**
 * Tiny trigram (n-gram) index for fuzzy substring search across a small
 * collection of strings.  Used for guest / vendor quick-lookups where a
 * full-text engine is overkill.
 * @owner shared
 */

/**
 * Generate the set of `n`-grams (default 3) for a string, lower-cased
 * and padded so prefix and suffix are visible.
 *
 * @param {string} input
 * @param {number} [n]
 * @returns {Set<string>}
 */
export function ngrams(input, n = 3) {
  if (typeof input !== "string" || input.length === 0) return new Set();
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError("ngrams: n must be a positive integer");
  }
  const padded = `${" ".repeat(n - 1)}${input.toLowerCase()}${" ".repeat(n - 1)}`;
  /** @type {Set<string>} */
  const out = new Set();
  for (let i = 0; i <= padded.length - n; i += 1) {
    out.add(padded.slice(i, i + n));
  }
  return out;
}

/**
 * Build a trigram index of `items[].text`.
 *
 * @template T
 * @param {readonly T[]} items
 * @param {(item: T) => string} getText
 * @param {{ n?: number }} [opts]
 * @returns {{
 *   search: (query: string, opts?: { limit?: number, minScore?: number }) =>
 *     Array<{ item: T, score: number }>,
 * }}
 */
export function buildTrigramIndex(items, getText, opts = {}) {
  const n = opts.n ?? 3;
  const grams = items.map((it) => ngrams(getText(it), n));
  return {
    search(query, qopts = {}) {
      const q = ngrams(query, n);
      if (q.size === 0) return [];
      const limit = qopts.limit ?? 10;
      const min = qopts.minScore ?? 0;
      /** @type {Array<{ item: T, score: number }>} */
      const scored = [];
      for (let i = 0; i < items.length; i += 1) {
        const docGrams = grams[i];
        if (docGrams.size === 0) continue;
        let inter = 0;
        for (const g of q) if (docGrams.has(g)) inter += 1;
        const union = q.size + docGrams.size - inter;
        const score = union === 0 ? 0 : inter / union;
        if (score >= min) scored.push({ item: items[i], score });
      }
      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, limit);
    },
  };
}
