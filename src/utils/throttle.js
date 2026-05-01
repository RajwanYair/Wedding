/**
 * Throttle a function so it runs at most once every `wait` milliseconds.
 * Trailing calls within the window are coalesced into one invocation
 * fired at the end of the window with the latest arguments.
 *
 * Returns the throttled wrapper, which exposes `cancel()` and
 * `flush()` for tests and teardown.
 * @owner shared
 */

/**
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @param {number} wait milliseconds
 * @param {{ leading?: boolean, trailing?: boolean }} [opts]
 * @returns {F & { cancel: () => void, flush: () => void }}
 */
export function throttle(fn, wait, opts = {}) {
  if (typeof fn !== "function") {
    throw new TypeError("throttle: expected function");
  }
  if (!Number.isFinite(wait) || wait < 0) {
    throw new RangeError("throttle: wait must be non-negative finite number");
  }
  const leading = opts.leading !== false;
  const trailing = opts.trailing !== false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  let lastCall = 0;
  /** @type {unknown[] | null} */
  let lastArgs = null;
  /** @type {unknown} */
  let lastThis = null;

  const invoke = () => {
    lastCall = Date.now();
    timer = null;
    if (lastArgs) fn.apply(lastThis, lastArgs);
    lastArgs = null;
    lastThis = null;
  };

  /** @type {any} */
  const wrapped = function (...args) {
    const now = Date.now();
    if (lastCall === 0 && !leading) lastCall = now;
    const remaining = wait - (now - lastCall);
    lastArgs = args;
    lastThis = this;
    if (remaining <= 0 || remaining > wait) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      invoke();
    } else if (!timer && trailing) {
      timer = setTimeout(invoke, remaining);
    }
  };

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
    lastThis = null;
    lastCall = 0;
  };
  wrapped.flush = () => {
    if (timer) {
      clearTimeout(timer);
      invoke();
    }
  };
  return wrapped;
}
