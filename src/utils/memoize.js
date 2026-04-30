/**
 * Function memoizer with pluggable key-resolver and optional max-size LRU
 * eviction.  Returns a fresh, shareable cache per call to `memoize`.
 *
 * @typedef {object} MemoOptions
 * @property {(...args: any[]) => string} [resolver] - cache key from args
 * @property {number} [max] - if set, oldest keys are evicted
 */

/**
 * Wrap `fn` so that repeated calls with the same key reuse the prior result.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {MemoOptions} [options]
 * @returns {F & {cache: Map<string, ReturnType<F>>, clear(): void}}
 */
export function memoize(fn, options = {}) {
  if (typeof fn !== "function") throw new Error("memoize: fn required");
  const resolver = options.resolver ?? defaultResolver;
  const max = options.max && options.max > 0 ? Math.floor(options.max) : 0;
  /** @type {Map<string, any>} */
  const cache = new Map();

  /** @type {any} */
  const wrapped = function memoized(/** @type {any[]} */ ...args) {
    const key = resolver(...args);
    if (cache.has(key)) {
      const v = cache.get(key);
      // refresh recency for LRU eviction
      cache.delete(key);
      cache.set(key, v);
      return v;
    }
    const result = fn(...args);
    cache.set(key, result);
    if (max > 0) {
      while (cache.size > max) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        cache.delete(oldest);
      }
    }
    return result;
  };
  wrapped.cache = cache;
  wrapped.clear = () => {
    cache.clear();
  };
  return wrapped;
}

/**
 * @param {...any} args
 * @returns {string}
 */
function defaultResolver(...args) {
  if (args.length === 0) return "_";
  if (args.length === 1) return primitiveOrJson(args[0]);
  return args.map(primitiveOrJson).join("|");
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function primitiveOrJson(v) {
  if (v === null) return "null";
  if (v === undefined) return "undef";
  const t = typeof v;
  if (t === "string") return `s:${v}`;
  if (t === "number" || t === "boolean") return `${t[0]}:${v}`;
  try {
    return `j:${JSON.stringify(v)}`;
  } catch {
    return `j:?`;
  }
}
