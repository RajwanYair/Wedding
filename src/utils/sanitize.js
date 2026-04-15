/**
 * src/utils/sanitize.js — Schema-based input sanitizer (S0 + S4.2)
 *
 * Named-export version of the `sanitize()` function from js/utils.js.
 * No runtime dependencies. No window.* side effects.
 */

/** @typedef {{ type: 'string'|'number'|'boolean'|'phone'|'email'|'url', max?: number, min?: number, required?: boolean }} SanitizeField */

const _PHONE_RE = /^[0-9]{9,15}$/;
const _EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}$/;
const _SCRIPTS_RE = /<\s*script[\s>]/i;
const _URL_MAX = 2048;

/**
 * Clean a raw input string: trim + length-clamp.
 * @param {unknown} str
 * @param {number} [max=500]
 * @returns {string}
 */
export function sanitizeInput(str, max = 500) {
  if (str === null || str === undefined) return "";
  return String(str).trim().slice(0, max);
}

/**
 * Sanitize an object against a field schema.
 * Unknown keys are dropped. Values are coerced to their declared type.
 *
 * @param {Record<string, unknown>} input
 * @param {Record<string, SanitizeField>} schema
 * @returns {{ value: Record<string, unknown>, errors: string[] }}
 */
export function sanitize(input, schema) {
  const value = /** @type {Record<string, unknown>} */ ({});
  const errors = /** @type {string[]} */ ([]);

  for (const [field, def] of Object.entries(schema)) {
    const raw = Object.prototype.hasOwnProperty.call(input, field)
      ? input[field]
      : undefined;

    if (raw === undefined || raw === null || raw === "") {
      if (def.required) errors.push(`${field} is required`);
      value[field] =
        def.type === "number"
          ? (def.min ?? 0)
          : def.type === "boolean"
            ? false
            : "";
      continue;
    }

    switch (def.type) {
      case "string": {
        const s = String(raw)
          .trim()
          .slice(0, def.max || 500);
        if (_SCRIPTS_RE.test(s)) {
          errors.push(`${field} contains invalid content`);
          value[field] = "";
        } else {
          value[field] = s;
        }
        break;
      }
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          errors.push(`${field} must be a number`);
          value[field] = def.min ?? 0;
        } else {
          let v = def.min !== undefined ? Math.max(def.min, n) : n;
          v = def.max !== undefined ? Math.min(def.max, v) : v;
          value[field] = v;
        }
        break;
      }
      case "boolean":
        value[field] = Boolean(raw);
        break;
      case "phone": {
        const cleaned = String(raw)
          .replace(/[\s\-().]/g, "")
          .replace(/^0/, "972");
        if (!_PHONE_RE.test(cleaned)) {
          errors.push(`${field} is not a valid phone number`);
          value[field] = "";
        } else {
          value[field] = cleaned;
        }
        break;
      }
      case "email": {
        const em = String(raw).trim().toLowerCase().slice(0, 254);
        if (!_EMAIL_RE.test(em)) {
          errors.push(`${field} is not a valid email`);
          value[field] = "";
        } else {
          value[field] = em;
        }
        break;
      }
      case "url": {
        const u = String(raw).trim().slice(0, _URL_MAX);
        try {
          const parsed = new URL(u);
          if (parsed.protocol !== "https:") throw new Error("not https");
          value[field] = u;
        } catch {
          errors.push(`${field} must be a valid HTTPS URL`);
          value[field] = "";
        }
        break;
      }
      default:
        value[field] = String(raw).trim().slice(0, 500);
    }
  }

  return { value, errors };
}
