/**
 * Token-bucket rate limiter — pure, time-injected for testability.
 * `now()` defaults to `Date.now`.  Supports per-key buckets.
 *
 * @typedef {object} RateOptions
 * @property {number} capacity - max tokens
 * @property {number} refillPerSec - tokens added per second
 * @property {() => number} [now] - clock fn (ms epoch)
 */

/**
 * Create a single-bucket rate limiter.
 *
 * @param {RateOptions} options
 */
export function createRateLimiter(options) {
  if (!options || typeof options !== "object") {
    throw new Error("rate-limit: options required");
  }
  const capacity = Math.max(1, Math.floor(options.capacity));
  const refillPerMs = options.refillPerSec / 1000;
  const now = options.now ?? Date.now;
  if (!Number.isFinite(refillPerMs) || refillPerMs < 0) {
    throw new Error("rate-limit: refillPerSec must be ≥ 0");
  }
  let tokens = capacity;
  let last = now();
  return {
    /**
     * @param {number} [cost]
     * @returns {boolean}
     */
    tryAcquire(cost = 1) {
      const t = now();
      tokens = Math.min(capacity, tokens + (t - last) * refillPerMs);
      last = t;
      if (tokens >= cost) {
        tokens -= cost;
        return true;
      }
      return false;
    },
    /** @returns {number} */
    available() {
      const t = now();
      return Math.min(capacity, tokens + (t - last) * refillPerMs);
    },
    reset() {
      tokens = capacity;
      last = now();
    },
  };
}

/**
 * Multi-bucket limiter keyed by string (e.g. user/IP).
 *
 * @param {RateOptions} options
 */
export function createKeyedRateLimiter(options) {
  /** @type {Map<string, ReturnType<typeof createRateLimiter>>} */
  const buckets = new Map();
  return {
    /**
     * @param {string} key
     * @param {number} [cost]
     */
    tryAcquire(key, cost = 1) {
      let b = buckets.get(key);
      if (!b) {
        b = createRateLimiter(options);
        buckets.set(key, b);
      }
      return b.tryAcquire(cost);
    },
    forget(/** @type {string} */ key) {
      buckets.delete(key);
    },
    size() {
      return buckets.size;
    },
  };
}
