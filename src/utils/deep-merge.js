/**
 * Recursively merge plain objects.  Arrays and non-plain objects are
 * **replaced** rather than merged.  Source values of `undefined` are
 * skipped (so partial overrides do not erase target keys).  Returns a
 * new object; inputs are not mutated.
 * @owner shared
 */

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
