/**
 * Levenshtein edit distance + similarity helpers.  Uses a single-row
 * dynamic-programming buffer for O(min(a,b)) memory.
 */

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshtein(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return Number.NaN;
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Make `a` the shorter string for memory efficiency.
  if (a.length > b.length) {
    const t = a;
    a = b;
    b = t;
  }
  /** @type {number[]} */
  const prev = new Array(a.length + 1);
  for (let i = 0; i <= a.length; i += 1) prev[i] = i;
  for (let j = 1; j <= b.length; j += 1) {
    let prevDiag = prev[0];
    prev[0] = j;
    for (let i = 1; i <= a.length; i += 1) {
      const tmp = prev[i];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[i] = Math.min(
        prev[i] + 1, // deletion
        prev[i - 1] + 1, // insertion
        prevDiag + cost, // substitution
      );
      prevDiag = tmp;
    }
  }
  return prev[a.length];
}

/**
 * Normalised similarity in [0, 1] — `1 - distance / maxLen`.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function similarity(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return 0;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  const d = levenshtein(a, b);
  return 1 - d / max;
}

/**
 * Closest match from a list, by smallest distance.  Returns `null` if no
 * candidate clears the optional threshold (default 0 = any).
 *
 * @param {string} input
 * @param {ReadonlyArray<string>} candidates
 * @param {{ threshold?: number }} [opts]
 * @returns {{ match: string, distance: number, score: number } | null}
 */
export function closestMatch(input, candidates, opts = {}) {
  if (typeof input !== "string" || !Array.isArray(candidates)) return null;
  const threshold = opts.threshold ?? 0;
  let best = null;
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const d = levenshtein(input, c);
    const score = similarity(input, c);
    if (score < threshold) continue;
    if (!best || d < best.distance) {
      best = { match: c, distance: d, score };
    }
  }
  return best;
}
