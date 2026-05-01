/**
 * Numeric range generators.  All are pure and accept a `step` argument.
 */

/**
 * Range as an array.  `range(5)` → `[0,1,2,3,4]`; `range(2,5)` →
 * `[2,3,4]`; `range(0,10,2)` → `[0,2,4,6,8]`.  Negative steps walk down.
 *
 * @param {number} startOrEnd
 * @param {number} [end]
 * @param {number} [step]
 * @returns {number[]}
 */
export function range(startOrEnd, end, step) {
  const [start, stop, s] = normalize(startOrEnd, end, step);
  if (!Number.isFinite(s) || s === 0) return [];
  /** @type {number[]} */
  const out = [];
  if (s > 0) {
    for (let i = start; i < stop; i += s) out.push(i);
  } else {
    for (let i = start; i > stop; i += s) out.push(i);
  }
  return out;
}

/**
 * Inclusive integer range — `inclusive(1,3)` → `[1,2,3]`.
 *
 * @param {number} start
 * @param {number} end
 * @param {number} [step]
 * @returns {number[]}
 */
export function inclusive(start, end, step = 1) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || step === 0) return [];
  /** @type {number[]} */
  const out = [];
  if (step > 0) {
    for (let i = start; i <= end; i += step) out.push(i);
  } else {
    for (let i = start; i >= end; i += step) out.push(i);
  }
  return out;
}

/**
 * Lazy generator version of `range` for memory-bounded iteration.
 *
 * @param {number} startOrEnd
 * @param {number} [end]
 * @param {number} [step]
 */
export function* iterRange(startOrEnd, end, step) {
  const [start, stop, s] = normalize(startOrEnd, end, step);
  if (!Number.isFinite(s) || s === 0) return;
  if (s > 0) {
    for (let i = start; i < stop; i += s) yield i;
  } else {
    for (let i = start; i > stop; i += s) yield i;
  }
}

/**
 * @param {number} startOrEnd
 * @param {number | undefined} end
 * @param {number | undefined} step
 * @returns {[number, number, number]}
 */
function normalize(startOrEnd, end, step) {
  if (end === undefined) return [0, startOrEnd, 1];
  if (step === undefined) return [startOrEnd, end, startOrEnd <= end ? 1 : -1];
  return [startOrEnd, end, step];
}
