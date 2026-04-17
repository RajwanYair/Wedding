/**
 * src/utils/async-helpers.js — Async control-flow utilities (Sprint 183)
 *
 * Pure async helpers — no DOM, no side effects.
 */

/**
 * Race a promise against a timeout. Rejects with "timeout" on expiry.
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms  Timeout in milliseconds
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Like Promise.allSettled but returns objects with { value } or { error }
 * for convenient destructuring.
 * @template T
 * @param {Promise<T>[]} promises
 * @returns {Promise<({ value: T } | { error: unknown })[]>}
 */
export async function allSettledWith(promises) {
  const raw = await Promise.allSettled(promises);
  return raw.map((r) =>
    r.status === "fulfilled" ? { value: r.value } : { error: r.reason },
  );
}

/**
 * Run async functions serially, collecting results.
 * @template T
 * @param {(() => Promise<T>)[]} fns
 * @returns {Promise<T[]>}
 */
export async function serial(fns) {
  const results = [];
  for (const fn of fns) results.push(await fn());
  return results;
}

/**
 * Run async functions with limited concurrency.
 * @template T
 * @param {(() => Promise<T>)[]} fns
 * @param {number} [limit=4]
 * @returns {Promise<T[]>}
 */
export async function concurrent(fns, limit = 4) {
  const results = new Array(fns.length);
  let idx = 0;

  async function worker() {
    while (idx < fns.length) {
      const i = idx++;
      results[i] = await fns[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, fns.length) }, worker);
  await Promise.all(workers);
  return results;
}

/**
 * Delay execution for `ms` milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a promise-returning function up to `retries` times.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ retries?: number, delayMs?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function retryAsync(fn, { retries = 3, delayMs = 0 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries && delayMs > 0) await delay(delayMs);
    }
  }
  throw lastError;
}
