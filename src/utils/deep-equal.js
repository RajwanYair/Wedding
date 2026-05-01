/**
 * Structural equality for plain JS values.  Handles primitives, arrays,
 * plain objects, Maps, Sets, Dates, RegExps, and typed arrays.  Cycles are
 * detected with a WeakMap pair-set.
 * @owner shared
 */

/**
 * Deeply compare two values.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function deepEqual(a, b) {
  return compare(a, b, new WeakMap());
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {WeakMap<object, object>} seen
 */
function compare(a, b, seen) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  const cached = seen.get(/** @type {object} */ (a));
  if (cached === b) return true;
  seen.set(/** @type {object} */ (a), /** @type {object} */ (b));

  if (a instanceof Date) return b instanceof Date && a.getTime() === b.getTime();
  if (a instanceof RegExp) {
    return b instanceof RegExp && a.source === b.source && a.flags === b.flags;
  }
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !compare(v, b.get(k), seen)) return false;
    }
    return true;
  }
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }
  if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
    /** @type {any} */
    const aa = a;
    /** @type {any} */
    const bb = b;
    if (aa.length !== bb.length) return false;
    for (let i = 0; i < aa.length; i += 1) {
      if (aa[i] !== bb[i]) return false;
    }
    return true;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!compare(a[i], b[i], seen)) return false;
    }
    return true;
  }
  /** @type {Record<string, unknown>} */
  const oa = /** @type {any} */ (a);
  /** @type {Record<string, unknown>} */
  const ob = /** @type {any} */ (b);
  const ka = Object.keys(oa);
  const kb = Object.keys(ob);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(ob, k)) return false;
    if (!compare(oa[k], ob[k], seen)) return false;
  }
  return true;
}
