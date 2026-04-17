/**
 * src/utils/retry-with-backoff.js — Exponential backoff retry helper (Sprint 63)
 *
 * Stand-alone utility to retry an async operation with configurable exponential
 * jitter backoff.  Extracted from the inline logic in offline-queue.js so it
 * can be reused by any service that needs durable retry semantics.
 *
 * Usage:
 *   const result = await retryWithBackoff(
 *     () => fetch("/api/submit", { method: "POST", body: data }),
 *     { maxRetries: 4, baseDelayMs: 500, maxDelayMs: 30_000 }
 *   );
 *
 * The default `shouldRetry` function retries on any error.
 * Pass a custom `shouldRetry` to skip retrying on 4xx responses, etc.
 */

/**
 * @typedef {object} RetryOptions
 * @property {number}  [maxRetries=3]           Maximum number of retry attempts (after first try).
 * @property {number}  [baseDelayMs=500]         Base delay for exponential backoff.
 * @property {number}  [maxDelayMs=30_000]        Cap on computed backoff delay.
 * @property {boolean} [jitter=true]             Add ±25% random jitter to delay.
 * @property {(err: unknown, attempt: number) => boolean} [shouldRetry]
 *   Called before each retry.  Return false to stop retrying immediately.
 */

/**
 * Compute the delay for a given retry attempt using exponential backoff.
 *
 * @param {number} attempt     1-based attempt number (1 = first retry after initial fail)
 * @param {number} baseMs      Base delay in milliseconds
 * @param {number} maxMs       Maximum delay cap
 * @param {boolean} [jitter]   Whether to apply ±25% random jitter
 * @returns {number}           Delay in milliseconds
 */
export function exponentialDelay(attempt, baseMs, maxMs, jitter = true) {
  const raw = Math.min(baseMs * 2 ** (attempt - 1), maxMs);
  if (!jitter) return raw;
  const factor = 1 + (Math.random() - 0.5) * 0.5; // ±25%
  return Math.round(raw * factor);
}

/**
 * @template T
 * Retry an async function with exponential backoff on failure.
 *
 * @param {() => Promise<T>} fn           The async operation to retry.
 * @param {RetryOptions}     [options]    Retry configuration.
 * @returns {Promise<T>}
 * @throws  The last error if all attempts are exhausted.
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 30_000,
    jitter = true,
    shouldRetry = () => true,
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      if (!shouldRetry(err, attempt + 1)) break;
      const delay = exponentialDelay(attempt + 1, baseDelayMs, maxDelayMs, jitter);
      await _sleep(delay);
    }
  }
  throw lastError;
}

/**
 * Build a retry options object — useful to keep config in one place.
 * @param {Partial<RetryOptions>} overrides
 * @returns {RetryOptions}
 */
export function buildRetryOptions(overrides = {}) {
  return {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 30_000,
    jitter: true,
    shouldRetry: () => true,
    ...overrides,
  };
}

/**
 * Promise-based sleep.  Abstracted for test injection.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
