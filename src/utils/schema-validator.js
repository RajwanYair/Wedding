/**
 * src/utils/schema-validator.js — Composable field-level schema validation (Sprint 166)
 *
 * Provides a lightweight schema validation system using plain JS objects.
 * Complements the existing `sanitize` utility (which coerces values);
 * this module focuses on producing structured validation error messages
 * suitable for form UI feedback.
 *
 * Usage:
 *   const schema = {
 *     firstName: [required(), maxLength(50)],
 *     phone:     [required(), phone()],
 *     count:     [required(), min(1), max(100)],
 *   };
 *   const errors = validate({ firstName: "", count: 0 }, schema);
 *   // errors: { firstName: ["חובה", ...], count: [...] }
 */

/**
 * @typedef {{ message: string, rule: string }} ValidationError
 * @typedef {(value: unknown) => ValidationError | null} Validator
 * @typedef {Record<string, Validator[]>} Schema
 * @typedef {Record<string, string[]>} ValidationResult
 */

// ─── Built-in validators ─────────────────────────────────────────────────────

/**
 * Field must be non-blank.
 * @param {string} [message]
 * @returns {Validator}
 */
export function required(message = "Required") {
  return (value) => {
    const blank = value == null || String(value).trim() === "";
    return blank ? { rule: "required", message } : null;
  };
}

/**
 * Max string length (after trim).
 * @param {number} max
 * @param {string} [message]
 * @returns {Validator}
 */
export function maxLength(max, message = `Max ${max} characters`) {
  return (value) => {
    const str = String(value ?? "");
    return str.length > max ? { rule: "maxLength", message } : null;
  };
}

/**
 * Min string length.
 * @param {number} min
 * @param {string} [message]
 * @returns {Validator}
 */
export function minLength(min, message = `Min ${min} characters`) {
  return (value) => {
    const str = String(value ?? "");
    return str.length < min ? { rule: "minLength", message } : null;
  };
}

/**
 * Minimum numeric value.
 * @param {number} minimum
 * @param {string} [message]
 * @returns {Validator}
 */
export function min(minimum, message = `Min value is ${minimum}`) {
  return (value) => {
    const num = Number(value);
    return isNaN(num) || num < minimum ? { rule: "min", message } : null;
  };
}

/**
 * Maximum numeric value.
 * @param {number} maximum
 * @param {string} [message]
 * @returns {Validator}
 */
export function max(maximum, message = `Max value is ${maximum}`) {
  return (value) => {
    const num = Number(value);
    return isNaN(num) || num > maximum ? { rule: "max", message } : null;
  };
}

/**
 * Value must match a regular expression.
 * @param {RegExp} pattern
 * @param {string} [message]
 * @returns {Validator}
 */
export function pattern(regex, message = "Invalid format") {
  return (value) => {
    const str = String(value ?? "");
    return !regex.test(str) ? { rule: "pattern", message } : null;
  };
}

/**
 * Value must be a valid email address.
 * @param {string} [message]
 * @returns {Validator}
 */
export function email(message = "Invalid email address") {
  return (value) => {
    const str = String(value ?? "").trim();
    if (!str) return null; // Let required() handle blank
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    return !valid ? { rule: "email", message } : null;
  };
}

/**
 * Value must be an Israeli phone number (05X or +972...).
 * @param {string} [message]
 * @returns {Validator}
 */
export function phone(message = "Invalid phone number") {
  return (value) => {
    const str = String(value ?? "").replace(/[\s\-().]/g, "");
    if (!str) return null; // Let required() handle blank
    const valid = /^(05\d{8}|(\+972|972)5\d{8})$/.test(str);
    return !valid ? { rule: "phone", message } : null;
  };
}

/**
 * Value must be one of the allowed values.
 * @param {unknown[]} allowed
 * @param {string} [message]
 * @returns {Validator}
 */
export function oneOf(allowed, message = "Invalid value") {
  const set = new Set(allowed);
  return (value) => (!set.has(value) ? { rule: "oneOf", message } : null);
}

// ─── Core validate function ────────────────────────────────────────────────

/**
 * Run a schema against a data object. Returns field → error messages map.
 * Only fields listed in the schema are validated.
 * An empty result object means "valid".
 *
 * @param {Record<string, unknown>} data
 * @param {Schema} schema
 * @returns {ValidationResult}
 */
export function validate(data, schema) {
  /** @type {ValidationResult} */
  const errors = {};

  for (const [field, validators] of Object.entries(schema)) {
    const value = data[field];
    const fieldErrors = [];
    for (const validator of validators) {
      const error = validator(value);
      if (error) fieldErrors.push(error.message);
    }
    if (fieldErrors.length) errors[field] = fieldErrors;
  }

  return errors;
}

/**
 * Returns true when the validate result contains no errors.
 * @param {ValidationResult} result
 * @returns {boolean}
 */
export function isValid(result) {
  return Object.keys(result).length === 0;
}
