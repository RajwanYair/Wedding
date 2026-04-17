/**
 * src/utils/text-highlight.js — Search result text-highlighting helpers (Sprint 201)
 *
 * Pure functions that wrap matched substrings in <mark> tags for search UIs.
 * All output is safe for innerHTML because only the query is marked and the
 * surrounding text is set via textContent-equivalent escaping.
 *
 * Zero dependencies.
 */

/**
 * Escape a string for safe inclusion in a RegExp literal.
 * @param {string} str
 * @returns {string}
 */
function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escape a string for safe injection into HTML text nodes.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Highlight all occurrences of `query` inside `text` by wrapping them in
 * `<mark>` tags.  The result is HTML-safe.
 *
 * @param {string} text   Plain text to search within.
 * @param {string} query  Search term (case-insensitive by default).
 * @param {{ caseSensitive?: boolean, tag?: string }} [opts]
 * @returns {string}  HTML string with matches wrapped.
 */
export function highlight(text, query, opts = {}) {
  if (!text || !query) return escapeHtml(text ?? "");
  const { caseSensitive = false, tag = "mark" } = opts;
  const flags = caseSensitive ? "g" : "gi";
  return escapeHtml(text).replace(
    new RegExp(`(${escapeRe(escapeHtml(query))})`, flags),
    `<${tag}>$1</${tag}>`
  );
}

/**
 * Highlight multiple query terms at once.
 *
 * @param {string} text
 * @param {string[]} terms
 * @param {{ caseSensitive?: boolean, tag?: string }} [opts]
 * @returns {string}
 */
export function highlightTerms(text, terms, opts = {}) {
  if (!text || !terms.length) return escapeHtml(text ?? "");
  const { caseSensitive = false, tag = "mark" } = opts;
  const flags = caseSensitive ? "g" : "gi";
  const pattern = terms.map((t) => escapeRe(escapeHtml(t))).join("|");
  const re = new RegExp(`(${pattern})`, flags);
  return escapeHtml(text).replace(re, `<${tag}>$1</${tag}>`);
}

/**
 * Strip all mark tags from a highlighted HTML string, returning plain HTML.
 * @param {string} html
 * @param {string} [tag]
 * @returns {string}
 */
export function removeHighlight(html, tag = "mark") {
  const openRe = new RegExp(`<${tag}[^>]*>`, "gi");
  const closeRe = new RegExp(`<\\/${tag}>`, "gi");
  return html.replace(openRe, "").replace(closeRe, "");
}

/**
 * Extract a short excerpt around the first match of `query` in `text`.
 *
 * @param {string} text
 * @param {string} query
 * @param {{ radius?: number, ellipsis?: string }} [opts]
 * @returns {string}  Plain-text excerpt (no HTML), or first `radius*2` chars if no match.
 */
export function excerpt(text, query, opts = {}) {
  const { radius = 60, ellipsis = "…" } = opts;
  if (!text) return "";
  if (!query) return text.slice(0, radius * 2);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, radius * 2) + (text.length > radius * 2 ? ellipsis : "");
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  const snip = text.slice(start, end);
  return (start > 0 ? ellipsis : "") + snip + (end < text.length ? ellipsis : "");
}

/**
 * Check whether `text` contains `query` (case-insensitive by default).
 * @param {string} text
 * @param {string} query
 * @param {{ caseSensitive?: boolean }} [opts]
 * @returns {boolean}
 */
export function containsQuery(text, query, opts = {}) {
  if (!text || !query) return false;
  const { caseSensitive = false } = opts;
  return caseSensitive
    ? text.includes(query)
    : text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Score relevance of `text` against `query`.
 * Returns a number 0–1 (higher = more relevant).
 * Rules: exact match → 1.0, starts-with → 0.9, contains → 0.6, no-match → 0.
 * @param {string} text
 * @param {string} query
 * @returns {number}
 */
export function relevanceScore(text, query) {
  if (!text || !query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 1;
  if (t.startsWith(q)) return 0.9;
  if (t.includes(q)) return 0.6;
  return 0;
}
