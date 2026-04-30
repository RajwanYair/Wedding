/**
 * Least-Recently-Used cache backed by `Map` insertion order.  Optional TTL
 * per entry expires items lazily on `get`.  Pure, no I/O, no timers.
 *
 * @typedef {object} LruOptions
 * @property {number} max - max entries, must be ≥ 1
 * @property {number} [ttlMs] - if set, entries older than ttl are evicted on get
 * @property {() => number} [now] - clock fn for TTL (default Date.now)
 */

/**
 * Create an LRU cache.
 *
 * @template K, V
 * @param {LruOptions} options
 */
export function createLru(options) {
  if (!options || typeof options !== "object") {
    throw new Error("lru: options required");
  }
  const max = Math.floor(options.max);
  if (!Number.isFinite(max) || max < 1) {
    throw new Error("lru: max must be ≥ 1");
  }
  const ttlMs = options.ttlMs && options.ttlMs > 0 ? options.ttlMs : 0;
  const now = options.now ?? Date.now;
  /** @type {Map<K, {value: V, expires: number}>} */
  const store = new Map();

  return {
    /**
     * @param {K} key
     * @returns {V | undefined}
     */
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (ttlMs > 0 && entry.expires <= now()) {
        store.delete(key);
        return undefined;
      }
      // refresh recency
      store.delete(key);
      store.set(key, entry);
      return entry.value;
    },
    /**
     * @param {K} key
     * @param {V} value
     */
    set(key, value) {
      if (store.has(key)) store.delete(key);
      store.set(key, {
        value,
        expires: ttlMs > 0 ? now() + ttlMs : Number.POSITIVE_INFINITY,
      });
      while (store.size > max) {
        const oldest = store.keys().next().value;
        if (oldest === undefined) break;
        store.delete(oldest);
      }
    },
    /**
     * @param {K} key
     * @returns {boolean}
     */
    has(key) {
      const entry = store.get(key);
      if (!entry) return false;
      if (ttlMs > 0 && entry.expires <= now()) {
        store.delete(key);
        return false;
      }
      return true;
    },
    /**
     * @param {K} key
     * @returns {boolean}
     */
    delete(key) {
      return store.delete(key);
    },
    clear() {
      store.clear();
    },
    /** @returns {number} */
    size() {
      return store.size;
    },
    /** @returns {K[]} */
    keys() {
      return Array.from(store.keys());
    },
  };
}
