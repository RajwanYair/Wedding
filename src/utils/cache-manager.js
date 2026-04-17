/**
 * src/utils/cache-manager.js — TTL-based in-memory cache (Sprint 164)
 *
 * Lightweight generic cache with:
 *  - Per-entry TTL (default 5 minutes)
 *  - Manual invalidation by key or pattern
 *  - Cache-aside helper: getOrCompute
 *  - Observable (onEvict callbacks)
 *  - No external dependencies
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * @template T
 * @typedef {{ value: T, expiresAt: number }} CacheEntry
 */

/**
 * A TTL-based in-memory cache.
 *
 * @template T
 */
export class CacheManager {
  constructor() {
    /** @type {Map<string, CacheEntry<T>>} */
    this._cache = new Map();
    /** @type {((key: string, value: T) => void)[]} */
    this._evictListeners = [];
  }

  /**
   * Set a value with an optional TTL.
   * @param {string} key
   * @param {T} value
   * @param {number} [ttlMs]
   */
  set(key, value, ttlMs = DEFAULT_TTL_MS) {
    this._cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /**
   * Get a value. Returns undefined if missing or expired.
   * @param {string} key
   * @returns {T | undefined}
   */
  get(key) {
    const entry = this._cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this._evict(key, entry.value);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Check if a key exists and has not expired (without reading the value).
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Remove a single key.
   * @param {string} key
   */
  delete(key) {
    const entry = this._cache.get(key);
    if (entry) this._evict(key, entry.value);
  }

  /**
   * Remove all keys matching a prefix.
   * @param {string} prefix
   */
  invalidatePrefix(prefix) {
    for (const key of this._cache.keys()) {
      if (key.startsWith(prefix)) this.delete(key);
    }
  }

  /**
   * Remove all keys matching a regex pattern.
   * @param {RegExp} pattern
   */
  invalidatePattern(pattern) {
    for (const key of this._cache.keys()) {
      if (pattern.test(key)) this.delete(key);
    }
  }

  /** Remove all entries. */
  clear() {
    for (const [key, entry] of this._cache.entries()) {
      this._evict(key, entry.value);
    }
  }

  /**
   * Returns all non-expired keys.
   * @returns {string[]}
   */
  keys() {
    const now = Date.now();
    return [...this._cache.entries()]
      .filter(([, e]) => now <= e.expiresAt)
      .map(([k]) => k);
  }

  /**
   * Cache-aside: return cached value or compute and store it.
   * @param {string} key
   * @param {() => T | Promise<T>} computeFn
   * @param {number} [ttlMs]
   * @returns {Promise<T>}
   */
  async getOrCompute(key, computeFn, ttlMs = DEFAULT_TTL_MS) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await computeFn();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Register a listener called when an entry is evicted.
   * @param {(key: string, value: T) => void} fn
   * @returns {() => void} unsubscribe
   */
  onEvict(fn) {
    this._evictListeners.push(fn);
    return () => {
      this._evictListeners = this._evictListeners.filter((l) => l !== fn);
    };
  }

  /**
   * @param {string} key
   * @param {T} value
   */
  _evict(key, value) {
    this._cache.delete(key);
    for (const fn of this._evictListeners) fn(key, value);
  }

  /** Number of currently-live entries (non-expired). */
  get size() {
    return this.keys().length;
  }
}

/** Default singleton cache (general purpose). */
export const cache = new CacheManager();
