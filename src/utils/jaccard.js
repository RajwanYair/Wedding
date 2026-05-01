/**
 * Set / multiset / token similarity helpers based on Jaccard index.
 * Used by guest-name de-duplication and fuzzy search ranking.
 * @owner shared
 */

/**
 * Jaccard index of two iterables treated as sets: |A ∩ B| / |A ∪ B|.
 * Returns 1 for two empty inputs.
 * @param {Iterable<unknown>} a
 * @param {Iterable<unknown>} b
 * @returns {number}
 */
export function jaccard(a, b) {
  const sa = a instanceof Set ? a : new Set(a);
  const sb = b instanceof Set ? b : new Set(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 1 : inter / union;
}

/**
 * Jaccard distance: 1 - jaccard(a, b).
 * @param {Iterable<unknown>} a
 * @param {Iterable<unknown>} b
 */
export function jaccardDistance(a, b) {
  return 1 - jaccard(a, b);
}

/**
 * Token-based Jaccard over whitespace-separated lowercase tokens.
 * Useful for matching free-text guest names.
 * @param {string} a
 * @param {string} b
 */
export function tokenJaccard(a, b) {
  const ta = tokenize(a);
  const tb = tokenize(b);
  return jaccard(ta, tb);
}

/**
 * Multiset Jaccard: respects duplicates.
 * @param {Iterable<unknown>} a
 * @param {Iterable<unknown>} b
 */
export function multisetJaccard(a, b) {
  const ma = bag(a);
  const mb = bag(b);
  if (ma.size === 0 && mb.size === 0) return 1;
  let inter = 0;
  let union = 0;
  const keys = new Set([...ma.keys(), ...mb.keys()]);
  for (const k of keys) {
    const ca = ma.get(k) ?? 0;
    const cb = mb.get(k) ?? 0;
    inter += Math.min(ca, cb);
    union += Math.max(ca, cb);
  }
  return union === 0 ? 1 : inter / union;
}

/**
 * @param {string} s
 * @returns {Set<string>}
 */
function tokenize(s) {
  if (typeof s !== "string") return new Set();
  return new Set(
    s
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean),
  );
}

/**
 * @param {Iterable<unknown>} it
 * @returns {Map<unknown, number>}
 */
function bag(it) {
  const m = new Map();
  for (const x of it) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
}
