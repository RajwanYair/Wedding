/**
 * Token-bucket rate limiter.  Refills at a steady rate and lets callers
 * `take(n)` tokens or peek at the current count.  Pure (clock injectable).
 * @owner shared
 */

/**
 * @typedef {{ take: (n?: number) => boolean, available: () => number, reset: () => void }} TokenBucket
 */

/**
 * @param {{ capacity: number, refillPerSec: number, now?: () => number }} opts
 * @returns {TokenBucket}
 */
export function createTokenBucket({ capacity, refillPerSec, now = Date.now }) {
  if (!(capacity > 0) || !(refillPerSec > 0)) {
    throw new Error("token-bucket: capacity and refillPerSec must be > 0");
  }
  let tokens = capacity;
  let last = now();

  function tick() {
    const t = now();
    const elapsed = Math.max(0, (t - last) / 1000);
    tokens = Math.min(capacity, tokens + elapsed * refillPerSec);
    last = t;
  }

  return {
    take(n = 1) {
      tick();
      if (tokens + 1e-9 < n) return false;
      tokens -= n;
      return true;
    },
    available() {
      tick();
      return tokens;
    },
    reset() {
      tokens = capacity;
      last = now();
    },
  };
}
