/**
 * src/utils/ttl-cache.js — TTL-based in-memory cache with invalidation (Sprint 65)
 *
 * Lightweight cache for computed values (stats, filtered lists, sheet reads)
 * that expire after a time-to-live.  No external deps.
 *
 * Usage:
 *   const cache = createCache({ ttlMs: 30_000 });
 *   cache.set("guestStats", computeStats());
 *   const hit = cache.get("guestStats");   // null after TTL expires
 *   cache.invalidate("guestStats");
 *   cache.clear();
 *
 * TaggedCache groups keys by tag for bulk invalidation:
 *   const tc = createTaggedCache({ ttlMs: 60_000 });
 *   tc.set("g1", data, ["guests"]);
 *   tc.invalidateTag("guests");  // evicts all keys tagged "guests"
 */

/**
 * @template T
 * @typedef {{ value: T, expiresAt: number, tags: string[] }} CacheEntry
 */

/**
 * @template T
 * @typedef {object} Cache
 * @property {(key: string, value: T, ttlMs?: number) => void}  set
 * @property {(key: string) => T | null}                        get
 * @property {(key: string) => boolean}                         has
 * @property {(key: string) => void}                            invalidate
 * @property {() => void}                                       clear
 * @property {() => number}                                     size
 * @property {() => string[]}                                   keys
 * @property {() => CacheStats}                                 stats
 */

/**
 * @typedef {{ hits: number, misses: number, evictions: number }} CacheStats
 */

/**
 * Create a simple TTL cache.
 * @template T
 * @param {{ ttlMs?: number }} [options]
 * @returns {Cache<T>}
 */
export function createCache(options = {}) {
  const defaultTtl = options.ttlMs ?? 60_000;
  /** @type {Map<string, CacheEntry<T>>} */
  const _store = new Map();
  const _stats = { hits: 0, misses: 0, evictions: 0 };

  function _isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  return {
    set(key, value, ttlMs = defaultTtl) {
      _store.set(key, { value, expiresAt: Date.now() + ttlMs, tags: [] });
    },

    get(key) {
      const entry = _store.get(key);
      if (!entry) { _stats.misses++; return null; }
      if (_isExpired(entry)) {
        _store.delete(key);
        _stats.evictions++;
        _stats.misses++;
        return null;
      }
      _stats.hits++;
      return entry.value;
    },

    has(key) {
      const entry = _store.get(key);
      if (!entry) return false;
      if (_isExpired(entry)) { _store.delete(key); _stats.evictions++; return false; }
      return true;
    },

    invalidate(key) {
      _store.delete(key);
    },

    clear() {
      _store.clear();
    },

    size() {
      // Count only non-expired
      let count = 0;
      for (const [key, entry] of _store) {
        if (_isExpired(entry)) { _store.delete(key); _stats.evictions++; }
        else count++;
      }
      return count;
    },

    keys() {
      const result = [];
      for (const [key, entry] of _store) {
        if (_isExpired(entry)) { _store.delete(key); _stats.evictions++; }
        else result.push(key);
      }
      return result;
    },

    stats() {
      return { ..._stats };
    },
  };
}

/**
 * @template T
 * @typedef {object} TaggedCache
 * @property {(key: string, value: T, tags?: string[], ttlMs?: number) => void} set
 * @property {(key: string) => T | null}  get
 * @property {(key: string) => boolean}   has
 * @property {(key: string) => void}      invalidate
 * @property {(tag: string) => number}    invalidateTag
 * @property {() => void}                 clear
 * @property {() => number}               size
 */

/**
 * Create a cache that supports tag-based bulk invalidation.
 * @template T
 * @param {{ ttlMs?: number }} [options]
 * @returns {TaggedCache<T>}
 */
export function createTaggedCache(options = {}) {
  const defaultTtl = options.ttlMs ?? 60_000;
  /** @type {Map<string, CacheEntry<T>>} */
  const _store = new Map();

  function _isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  return {
    set(key, value, tags = [], ttlMs = defaultTtl) {
      _store.set(key, { value, expiresAt: Date.now() + ttlMs, tags });
    },

    get(key) {
      const entry = _store.get(key);
      if (!entry) return null;
      if (_isExpired(entry)) { _store.delete(key); return null; }
      return entry.value;
    },

    has(key) {
      const entry = _store.get(key);
      if (!entry) return false;
      if (_isExpired(entry)) { _store.delete(key); return false; }
      return true;
    },

    invalidate(key) {
      _store.delete(key);
    },

    /**
     * Evict all entries that have the given tag.
     * @param {string} tag
     * @returns {number} Number of entries evicted.
     */
    invalidateTag(tag) {
      let count = 0;
      for (const [key, entry] of _store) {
        if (entry.tags.includes(tag)) { _store.delete(key); count++; }
      }
      return count;
    },

    clear() {
      _store.clear();
    },

    size() {
      let count = 0;
      for (const [key, entry] of _store) {
        if (_isExpired(entry)) _store.delete(key);
        else count++;
      }
      return count;
    },
  };
}

/**
 * Wrap an async function with a TTL cache (memoize with expiry).
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ ttlMs?: number, key?: string }} [options]
 * @returns {() => Promise<T>}
 */
export function withCache(fn, options = {}) {
  const cache = createCache({ ttlMs: options.ttlMs ?? 60_000 });
  const cacheKey = options.key ?? "__default__";
  return async function cached() {
    const hit = /** @type {T | null} */ (cache.get(cacheKey));
    if (hit !== null) return hit;
    const value = await fn();
    cache.set(cacheKey, value);
    return value;
  };
}
