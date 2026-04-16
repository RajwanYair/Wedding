/**
 * src/utils/form-helpers.js — Shared form-value extraction (F1.1)
 *
 * Replaces the duplicated `getVal()` closures that appeared 10+ times in main.js.
 */

/**
 * Extract the trimmed value of a form element by ID.
 * For checkboxes returns "true" or "".
 * @param {string} id  DOM element ID
 * @returns {string}
 */
export function getVal(id) {
  const inp = document.getElementById(id);
  if (!inp) return "";
  if (/** @type {HTMLInputElement} */ (inp).type === "checkbox")
    return /** @type {HTMLInputElement} */ (inp).checked ? "true" : "";
  return /** @type {HTMLInputElement} */ (inp).value?.trim() ?? "";
}

/**
 * Extract multiple form values at once from a map of { resultKey: elementId }.
 * @param {Record<string, string>} fieldMap  e.g. { firstName: "guestFirstName", ... }
 * @returns {Record<string, string>}
 */
export function getFormValues(fieldMap) {
  /** @type {Record<string, string>} */
  const result = {};
  for (const [key, id] of Object.entries(fieldMap)) {
    result[key] = getVal(id);
  }
  return result;
}

/**
 * Open an "add new" modal: clear the hidden ID input, set the title i18n key, open.
 * @param {string} modalId     e.g. "guestModal"
 * @param {string} idInputId   e.g. "guestModalId"
 * @param {string} titleElId   e.g. "guestModalTitle"
 * @param {string} titleI18n   e.g. "modal_add_guest"
 * @param {(id: string) => void} openModalFn
 */
export function openAddModal(modalId, idInputId, titleElId, titleI18n, openModalFn) {
  const idEl = /** @type {HTMLInputElement|null} */ (
    document.getElementById(idInputId)
  );
  if (idEl) idEl.value = "";
  const title = document.getElementById(titleElId);
  if (title) title.setAttribute("data-i18n", titleI18n);
  openModalFn(modalId);
}
