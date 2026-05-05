/**
 * Structural deep clone — handles plain objects, arrays, Maps, Sets, Dates,
 * RegExps, and typed arrays.  Uses a `WeakMap` to preserve cyclic and
 * shared references.  Pure: no `structuredClone` dependency to keep
 * behaviour deterministic across runtimes.
 * @owner shared
 * @module deep
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

// ──────────────────────────────────────────────────────────────────────────
// deep-equal
// ──────────────────────────────────────────────────────────────────────────

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

// ──────────────────────────────────────────────────────────────────────────
// deep-merge
// ──────────────────────────────────────────────────────────────────────────

/**
 * @param {Record<string, unknown>} target
 * @param {...Record<string, unknown>} sources
 * @returns {Record<string, unknown>}
 */
export function deepMerge(target, ...sources) {
  let out = clonePlain(target);
  for (const src of sources) {
    if (!isPlain(src)) continue;
    out = mergeInto(out, src);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 * @returns {Record<string, unknown>}
 */
function mergeInto(a, b) {
  /** @type {Record<string, unknown>} */
  const out = { ...a };
  for (const key of Object.keys(b)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue; // prototype-pollution guard
    }
    const bv = b[key];
    if (bv === undefined) continue;
    const av = a[key];
    if (isPlain(av) && isPlain(bv)) {
      out[key] = mergeInto(
        /** @type {Record<string, unknown>} */ (av),
        /** @type {Record<string, unknown>} */ (bv),
      );
    } else {
      out[key] = clonePlain(bv);
    }
  }
  return out;
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
function isPlain(v) {
  if (v === null || typeof v !== "object") return false;
  if (Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/**
 * @param {unknown} v
 * @returns {any}
 */
function clonePlain(v) {
  if (Array.isArray(v)) return v.map((x) => clonePlain(x));
  if (isPlain(v)) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const k of Object.keys(/** @type {object} */ (v))) {
      out[k] = clonePlain(/** @type {Record<string, unknown>} */ (v)[k]);
    }
    return out;
  }
  return v;
}
