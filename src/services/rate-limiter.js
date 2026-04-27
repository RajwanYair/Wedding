/**
 * src/services/rate-limiter.js — Token-bucket rate limiter (Sprint 85)
 *
 * Pure in-memory implementation; suitable for client-side throttling of
 * API calls, form submissions, and WhatsApp sends.
 * Zero dependencies — uses Date.now() for timing.
 */

/**
 * @typedef {{ limit: number, windowMs: number }} RateLimiterOptions
 * @typedef {{ allowed: boolean, remaining: number, resetAt: number }} ConsumeResult
 */

/**
 * Create a rate limiter using a sliding window token bucket.
 *
 * @param {RateLimiterOptions} opts
 * @returns {{ consume(key?: string): ConsumeResult, reset(key?: string): void, status(key?: string): ConsumeResult, clear(): void }}
 */
export function createRateLimiter({ limit, windowMs }) {
  if (limit < 1) throw new RangeError("limit must be >= 1");
  if (windowMs < 1) throw new RangeError("windowMs must be >= 1");

  /** @type {Map<string, { tokens: number, windowStart: number }>} */
  const buckets = new Map();
  const DEFAULT_KEY = "__default__";

  /**
   * @param {string} key
   */
  /** @returns {{ tokens: number, windowStart: number }} */
  function ensureBucket(key) {
    if (!buckets.has(key)) {
      buckets.set(key, { tokens: limit, windowStart: Date.now() });
    }
    return /** @type {{ tokens: number, windowStart: number }} */ (buckets.get(key));
  }

  /**
   * @param {string} key
   */
  function tickBucket(key) {
    const b = ensureBucket(key);
    const now = Date.now();
    const elapsed = now - b.windowStart;
    if (elapsed >= windowMs) {
      // Full window elapsed — refill
      const windowsPassed = Math.floor(elapsed / windowMs);
      b.tokens = Math.min(limit, b.tokens + windowsPassed * limit);
      b.windowStart = now - (elapsed % windowMs);
    }
    return b;
  }

  return {
    /**
     * Try to consume one token. Returns { allowed, remaining, resetAt }.
     * @param {string} [key]
     */
    consume(key = DEFAULT_KEY) {
      const b = tickBucket(key);
      const resetAt = b.windowStart + windowMs;
      if (b.tokens > 0) {
        b.tokens--;
        return { allowed: true, remaining: b.tokens, resetAt };
      }
      return { allowed: false, remaining: 0, resetAt };
    },

    /**
     * Manually reset a bucket back to full.
     * @param {string} [key]
     */
    reset(key = DEFAULT_KEY) {
      buckets.set(key, { tokens: limit, windowStart: Date.now() });
    },

    /**
     * Current status without consuming a token.
     * @param {string} [key]
     * @returns {ConsumeResult}
     */
    status(key = DEFAULT_KEY) {
      const b = tickBucket(key);
      const resetAt = b.windowStart + windowMs;
      return { allowed: b.tokens > 0, remaining: b.tokens, resetAt };
    },

    /** Remove all buckets. */
    clear() {
      buckets.clear();
    },
  };
}
