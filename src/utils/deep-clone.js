/**
 * Structural deep clone — handles plain objects, arrays, Maps, Sets, Dates,
 * RegExps, and typed arrays.  Uses a `WeakMap` to preserve cyclic and
 * shared references.  Pure: no `structuredClone` dependency to keep
 * behaviour deterministic across runtimes.
 * @owner shared
 */

/**
 * Deep-clone any supported value.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepClone(value) {
  return /** @type {T} */ (clone(value, new WeakMap()));
}

/**
 * @param {unknown} v
 * @param {WeakMap<object, object>} seen
 */
function clone(v, seen) {
  if (v === null || typeof v !== "object") return v;
  const cached = seen.get(/** @type {object} */ (v));
  if (cached) return cached;
  if (v instanceof Date) {
    const out = new Date(v.getTime());
    seen.set(v, out);
    return out;
  }
  if (v instanceof RegExp) {
    const out = new RegExp(v.source, v.flags);
    out.lastIndex = v.lastIndex;
    seen.set(v, out);
    return out;
  }
  if (v instanceof Map) {
    /** @type {Map<unknown, unknown>} */
    const out = new Map();
    seen.set(v, out);
    for (const [k, val] of v) out.set(clone(k, seen), clone(val, seen));
    return out;
  }
  if (v instanceof Set) {
    /** @type {Set<unknown>} */
    const out = new Set();
    seen.set(v, out);
    for (const val of v) out.add(clone(val, seen));
    return out;
  }
  if (ArrayBuffer.isView(v)) {
    /** @type {any} */
    const ctor = /** @type {any} */ (v).constructor;
    const out = new ctor(/** @type {any} */ (v));
    seen.set(/** @type {any} */ (v), out);
    return out;
  }
  if (Array.isArray(v)) {
    /** @type {unknown[]} */
    const out = [];
    seen.set(v, out);
    for (let i = 0; i < v.length; i += 1) out[i] = clone(v[i], seen);
    return out;
  }
  /** @type {Record<string, unknown>} */
  const out = Object.create(Object.getPrototypeOf(v));
  seen.set(/** @type {object} */ (v), out);
  for (const k of Object.keys(/** @type {any} */ (v))) {
    out[k] = clone(/** @type {any} */ (v)[k], seen);
  }
  return out;
}
