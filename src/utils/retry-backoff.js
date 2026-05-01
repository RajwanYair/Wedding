/**
 * Retry helper with exponential backoff + optional jitter.  Pure async; the
 * sleep and rng functions are injectable for deterministic tests.
 *
 * @typedef {object} RetryOptions
 * @property {number} [retries] - max retry attempts after initial try, default 3
 * @property {number} [baseMs] - initial backoff delay, default 100
 * @property {number} [factor] - multiplier per retry, default 2
 * @property {number} [maxMs] - cap on a single delay, default 30_000
 * @property {"none" | "full"} [jitter] - default "full"
 * @property {(err: unknown) => boolean} [shouldRetry]
 * @property {(ms: number) => Promise<void>} [sleep]
 * @property {() => number} [random] - 0..1
 * @owner shared
 */

/**
 * Execute `fn`, retrying on rejection up to `retries` times.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {RetryOptions} [options]
 * @returns {Promise<T>}
 */
export async function retry(fn, options = {}) {
  if (typeof fn !== "function") throw new Error("retry: fn required");
  const retries = Math.max(0, options.retries ?? 3);
  const baseMs = Math.max(0, options.baseMs ?? 100);
  const factor = options.factor ?? 2;
  const maxMs = Math.max(baseMs, options.maxMs ?? 30_000);
  const jitter = options.jitter ?? "full";
  const shouldRetry = options.shouldRetry ?? (() => true);
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;

  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err;
      const delay = computeDelay(attempt, baseMs, factor, maxMs, jitter, random);
      await sleep(delay);
      attempt += 1;
    }
  }
}

/**
 * Compute the delay for a given attempt.  Exposed for testing.
 *
 * @param {number} attempt - 0-indexed
 * @param {number} baseMs
 * @param {number} factor
 * @param {number} maxMs
 * @param {"none" | "full"} jitter
 * @param {() => number} random
 * @returns {number}
 */
export function computeDelay(attempt, baseMs, factor, maxMs, jitter, random) {
  const raw = baseMs * Math.pow(factor, attempt);
  const capped = Math.min(maxMs, raw);
  if (jitter === "none") return capped;
  return Math.floor(random() * capped);
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function defaultSleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
