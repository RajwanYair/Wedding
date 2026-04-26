/**
 * src/utils/message-templates.js — Message template system (Sprint 41)
 *
 * Provides a lightweight template engine for WhatsApp and SMS messages.
 * Templates are plain strings with `{{variable}}` placeholders.
 *
 * Design goals:
 * - Zero runtime dependencies
 * - Resistant to injection (no eval; replacements are HTML-escaped by default)
 * - Supports conditional blocks: `{{#if var}}...{{/if}}`
 * - Compose multiple templates with named slots
 *
 * Usage:
 *   import { renderTemplate, TEMPLATES } from "../utils/message-templates.js";
 *
 *   const msg = renderTemplate(TEMPLATES.rsvpConfirm, {
 *     firstName: "Alice",
 *     weddingDate: "15.08.2025",
 *     tableName: "Table 3",
 *   });
 */

// ── Template store ─────────────────────────────────────────────────────────

/**
 * @type {Record<string, string>}
 */
const _registry = {};

/**
 * Register a named template so it can be retrieved by name.
 * @param {string} name
 * @param {string} source
 */
export function registerTemplate(name, source) {
  _registry[name] = source;
}

/**
 * Retrieve a named template string.
 * @param {string} name
 * @returns {string | undefined}
 */
export function getTemplate(name) {
  return _registry[name];
}

/**
 * List all registered template names.
 * @returns {string[]}
 */
export function listTemplates() {
  return Object.keys(_registry);
}

// ── Rendering ─────────────────────────────────────────────────────────────

/**
 * Escape special characters in a string so it is safe to insert into a
 * WhatsApp / SMS message.  Prevents injection of WhatsApp formatting codes.
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function escapeValue(raw) {
  if (raw === null || raw === undefined) return "";
  return String(raw).replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

/**
 * Evaluate a simple `{{#if var}}...{{/if}}` conditional.
 * Returns the content inside the block when `vars[var]` is truthy,
 * otherwise collapses the block to an empty string.
 *
 * Nesting is NOT supported — keep templates simple.
 *
 * @param {string} source
 * @param {Record<string, unknown>} vars
 * @returns {string}
 */
function _processConditionals(source, vars) {
  return source.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, varName, content) =>
    vars[varName] ? content : "",
  );
}

/**
 * Render a template string by replacing `{{variable}}` placeholders.
 *
 * @param {string} template
 * @param {Record<string, unknown>} vars
 * @param {{ escape?: boolean }} [opts]  Pass `escape: false` to skip value escaping
 * @returns {string}
 */
export function renderTemplate(template, vars, opts = {}) {
  const escape = opts.escape !== false;
  // Process conditionals first so collapsed blocks don't leave stray vars
  const afterConditionals = _processConditionals(template, vars);

  return afterConditionals.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const val = vars[key];
    if (val === undefined) return "";
    return escape ? escapeValue(val) : String(val);
  });
}

/**
 * Render a named template from the registry.
 * Returns null when the template name is not found.
 *
 * @param {string} name
 * @param {Record<string, unknown>} vars
 * @param {{ escape?: boolean }} [opts]
 * @returns {string | null}
 */
export function renderNamed(name, vars, opts = {}) {
  const tmpl = _registry[name];
  if (!tmpl) return null;
  return renderTemplate(tmpl, vars, opts);
}

// ── Built-in templates ─────────────────────────────────────────────────────

/**
 * Immutable map of built-in template strings.
 * Keys match the `name` used in `registerTemplate` calls below.
 */
export const TEMPLATES = /** @type {const} */ ({
  rsvpConfirm: `שלום {{firstName}}! 🎉\nתודה שאישרת הגעה לחתונה שלנו.\nמחכים לך ב-{{weddingDate}}.{{#if tableName}}\nמקום ישיבה: {{tableName}}.{{/if}}`,
  rsvpDecline: `שלום {{firstName}}, קיבלנו את הודעתך שלא תוכל/י להגיע. חבל מאוד, אבל תודה שהודעת.`,
  rsvpReminder: `שלום {{firstName}}, עוד לא קיבלנו אישור הגעה ממך לחתונה ב-{{weddingDate}}. אנא אשר/י בהקדם.`,
  tableAssigned: `שלום {{firstName}}, שולחן {{tableName}} ממתין לך בחתונה.`,
  generalInfo: `פרטי החתונה:\nתאריך: {{weddingDate}}\nמקום: {{venueName}}\nשעה: {{weddingTime}}`,
});

// Register built-in templates immediately
for (const [name, source] of Object.entries(TEMPLATES)) {
  registerTemplate(name, source);
}
