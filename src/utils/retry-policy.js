/**
 * src/utils/retry-policy.js — Configurable retry/backoff engine (Sprint 172)
 *
 * Provides a generic `withRetry` wrapper that transparently retries
 * async operations with exponential backoff + jitter.
 * Used by sync-manager, sheets service, and any fetch-based code.
 *
 * Features:
 *  - Configurable max attempts, base delay, max delay, jitter
 *  - Per-attempt hook (onRetry)
 *  - Condition predicate (retryIf) to skip retrying certain errors
 *  - Returns the last error when all attempts exhausted
 */

/**
 * @typedef {{
 *   maxAttempts?: number,
 *   baseDelayMs?: number,
 *   maxDelayMs?: number,
 *   jitter?: boolean,
 *   retryIf?: (err: unknown, attempt: number) => boolean,
 *   onRetry?: (err: unknown, attempt: number, delayMs: number) => void,
 * }} RetryOptions
 */

const DEFAULTS = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 10_000,
  jitter: true,
};

/**
 * Sleep for `ms` milliseconds (hoisted so tests can override).
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

/**
 * Calculate delay for attempt N using exponential backoff.
 * @param {number} attempt  1-based
 * @param {Required<Pick<RetryOptions, 'baseDelayMs' | 'maxDelayMs' | 'jitter'>>} opts
 * @returns {number} milliseconds
 */
export function calcDelay(attempt, opts) {
  const exp = opts.baseDelayMs * Math.pow(2, attempt - 1);
  const capped = Math.min(exp, opts.maxDelayMs);
  if (!opts.jitter) return capped;
  // ±25% jitter
  return Math.floor(capped * (0.75 + Math.random() * 0.5));
}

/**
 * Execute `fn` with automatic retry on failure.
 *
 * @template T
 * @param {() => Promise<T>} fn  The async operation to run
 * @param {RetryOptions} [opts]
 * @returns {Promise<T>}
 */
export async function withRetry(fn, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  let lastError;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const shouldRetry = cfg.retryIf ? cfg.retryIf(err, attempt) : true;
      const isLast = attempt >= cfg.maxAttempts;

      if (!shouldRetry || isLast) break;

      const delay = calcDelay(attempt, {
        baseDelayMs: cfg.baseDelayMs,
        maxDelayMs: cfg.maxDelayMs,
        jitter: cfg.jitter,
      });

      cfg.onRetry?.(err, attempt, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper bound to specific options.
 *
 * @param {RetryOptions} defaults
 * @returns {(fn: () => Promise<unknown>, overrides?: RetryOptions) => Promise<unknown>}
 */
export function createRetryPolicy(defaults = {}) {
  return (fn, overrides = {}) => withRetry(fn, { ...defaults, ...overrides });
}
