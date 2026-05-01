/**
 * AbortController helpers — timeout signals and signal composition.
 *
 * `AbortSignal.timeout` and `AbortSignal.any` are widely supported but
 * not in every environment our tests target.  These helpers are
 * environment-agnostic.
 * @owner shared
 */

/**
 * Returns an `AbortSignal` that aborts after `ms` milliseconds with a
 * `DOMException`-style `TimeoutError` reason.
 *
 * @param {number} ms
 * @returns {AbortSignal}
 */
export function timeoutSignal(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError("timeoutSignal: ms must be a non-negative finite number");
  }
  const ctrl = new AbortController();
  const reason = new Error(`Timed out after ${ms}ms`);
  reason.name = "TimeoutError";
  setTimeout(() => ctrl.abort(reason), ms);
  return ctrl.signal;
}

/**
 * Combine multiple signals into one.  The composite aborts as soon as
 * any input aborts (with that input's reason), or stays open if no
 * inputs are provided.
 *
 * @param {Iterable<AbortSignal | null | undefined>} signals
 * @returns {AbortSignal}
 */
export function anySignal(signals) {
  const ctrl = new AbortController();
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) {
      ctrl.abort(s.reason);
      return ctrl.signal;
    }
    s.addEventListener(
      "abort",
      () => ctrl.abort(s.reason),
      { once: true },
    );
  }
  return ctrl.signal;
}

/**
 * Race a promise against a timeout.  Resolves / rejects with the
 * promise's outcome if it settles first; otherwise rejects with a
 * `TimeoutError`.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new RangeError("withTimeout: ms must be a non-negative finite number");
  }
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const err = new Error(`Timed out after ${ms}ms`);
      err.name = "TimeoutError";
      reject(err);
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
