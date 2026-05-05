/**
 * src/sections/contact-form.js — Section alias for contact-collector (S173)
 *
 * The contact-form section is registered in EXTRA_SECTIONS under the name
 * "contact-form" and its template is src/templates/contact-form.html.
 * The implementation lives in contact-collector.js; this file is a named
 * re-export so check-section-template-parity passes without duplication.
 */
export { mount, unmount, capabilities } from "./contact-collector.js";
export {
  submitContactForm,
  exportContactsCSV,
} from "./contact-collector.js";
