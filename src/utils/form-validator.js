/**
 * src/utils/form-validator.js — Accessible form validation helper (Sprint 9)
 *
 * Provides lightweight, ARIA-first form validation:
 *  - Sets aria-invalid="true/false" on invalid/valid inputs
 *  - Creates/updates aria-describedby linked error message elements
 *  - Clears errors on input focus or change
 *  - Returns a summary { valid: boolean, errors: [{ field, message }] }
 *
 * Usage:
 *   import { validateForm, clearFormErrors } from "../utils/form-validator.js";
 *
 *   // Define a schema
 *   const schema = {
 *     phone: { required: true, label: "Phone", minLength: 9 },
 *     firstName: { required: true, label: "First name", maxLength: 80 },
 *   };
 *
 *   const result = validateForm(formEl, schema);
 *   if (!result.valid) {
 *     // Focus the first error field
 *     result.errors[0]?.fieldEl?.focus();
 *   }
 */

// ── Types ─────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   required?: boolean,
 *   minLength?: number,
 *   maxLength?: number,
 *   pattern?: RegExp,
 *   label?: string,
 *   message?: string
 * }} FieldRule
 */

/**
 * @typedef {{ field: string, message: string, fieldEl: HTMLElement | null }} FieldError
 */

/**
 * @typedef {{ valid: boolean, errors: FieldError[] }} ValidationResult
 */

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Validate all named fields in a form against a schema.
 * Sets aria-invalid and aria-describedby on each field.
 * Attaches auto-clear listeners on input/change.
 *
 * @param {HTMLElement} formEl — Container element (form or any div)
 * @param {Record<string, FieldRule>} schema — Field rules keyed by input name
 * @returns {ValidationResult}
 */
export function validateForm(formEl, schema) {
  /** @type {FieldError[]} */
  const errors = [];

  for (const [name, rule] of Object.entries(schema)) {
    const input = /** @type {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null} */ (
      formEl.querySelector(`[name="${CSS.escape(name)}"]`)
    );
    if (!input) continue;

    const value = input.value.trim();
    let msg = "";

    if (rule.required && value === "") {
      msg = rule.message ?? `${rule.label ?? name} is required`;
    } else if (rule.minLength !== undefined && value.length < rule.minLength) {
      msg = rule.message ?? `${rule.label ?? name} must be at least ${rule.minLength} characters`;
    } else if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      msg = rule.message ?? `${rule.label ?? name} must be at most ${rule.maxLength} characters`;
    } else if (rule.pattern !== undefined && value !== "" && !rule.pattern.test(value)) {
      msg = rule.message ?? `${rule.label ?? name} format is invalid`;
    }

    if (msg) {
      _markError(input, name, msg);
      errors.push({ field: name, message: msg, fieldEl: input });
    } else {
      _clearError(input, name);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Clear all validation errors on a form (reset to clean state).
 * Removes aria-invalid, aria-describedby, and error elements.
 *
 * @param {HTMLElement} formEl
 */
export function clearFormErrors(formEl) {
  const fields = formEl.querySelectorAll("[aria-invalid]");
  fields.forEach((el) => {
    const htmlEl = /** @type {HTMLElement} */ (el);
    const name = htmlEl.getAttribute("name") ?? htmlEl.id ?? "";
    _clearError(htmlEl, name);
  });
  // Remove any lingering error elements not yet cleared
  formEl.querySelectorAll(".form-field-error").forEach((el) => el.remove());
}

/**
 * Programmatically set an error on a single named field.
 * Useful for server-side validation responses.
 *
 * @param {HTMLElement} formEl
 * @param {string} name — input name attribute
 * @param {string} message — error text
 */
export function setFieldError(formEl, name, message) {
  const input = /** @type {HTMLElement | null} */ (
    formEl.querySelector(`[name="${CSS.escape(name)}"]`)
  );
  if (input) _markError(input, name, message);
}

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * @param {HTMLElement} input
 * @param {string} name
 * @param {string} message
 */
function _markError(input, name, message) {
  input.setAttribute("aria-invalid", "true");

  const errId = `form-err-${CSS.escape(name)}`;
  let errEl = /** @type {HTMLElement | null} */ (document.getElementById(errId));

  if (!errEl) {
    errEl = document.createElement("span");
    errEl.id = errId;
    errEl.className = "form-field-error";
    errEl.setAttribute("role", "alert");
    // Insert after the input element
    input.insertAdjacentElement("afterend", errEl);
  }

  errEl.textContent = message;
  input.setAttribute("aria-describedby", errId);

  // Auto-clear on user interaction
  const clear = () => {
    _clearError(input, name);
    input.removeEventListener("input", clear);
    input.removeEventListener("change", clear);
    input.removeEventListener("focus", clear);
  };
  input.addEventListener("input", clear, { once: true });
  input.addEventListener("change", clear, { once: true });
  input.addEventListener("focus", clear, { once: true });
}

/**
 * @param {HTMLElement} input
 * @param {string} name
 */
function _clearError(input, name) {
  input.setAttribute("aria-invalid", "false");
  input.removeAttribute("aria-describedby");

  const errId = `form-err-${CSS.escape(name)}`;
  document.getElementById(errId)?.remove();
}
