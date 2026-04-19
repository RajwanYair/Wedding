/**
 * src/utils/purify.js — DOMPurify wrapper (S15d)
 *
 * Centralises all HTML sanitisation through DOMPurify 3.x, which has
 * active CVE tracking and is endorsed by OWASP.
 *
 * The custom `sanitize.js` remains for schema-based field validation
 * (non-HTML data). This module handles any path that renders HTML into
 * the DOM (e.g. invitation content, rich-text notes, WhatsApp previews).
 *
 * Usage:
 *   import { purify } from "../utils/purify.js";
 *   element.innerHTML = purify(userHtml);
 *   // or for plain-text contexts — use textContent, not this module
 */

import DOMPurify from "dompurify";

// ── Default config ─────────────────────────────────────────────────────────

/**
 * Allowed HTML tags for rich-text content (e.g. invitation text, notes).
 * No scripts, no embeds, no forms.
 */
const _RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    "b", "strong", "i", "em", "u", "s", "del",
    "p", "br", "hr",
    "h1", "h2", "h3", "h4",
    "ul", "ol", "li",
    "a", "span", "div",
    "blockquote", "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  ALLOWED_ATTR: ["href", "title", "target", "rel", "class", "dir", "lang"],
  ALLOW_DATA_ATTR: false,
  FORBID_CONTENTS: ["script", "style", "noscript"],
  ADD_ATTR: ["target"],
  FORCE_BODY: true,
};

// Force external links to open safely
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    if (node.getAttribute("target") === "_blank") {
      node.setAttribute("rel", "noopener noreferrer");
    }
  }
});

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Sanitize an HTML string using DOMPurify defaults + restricted tag list.
 * Safe for `innerHTML` assignment.
 * @param {string} dirty  Untrusted HTML input
 * @param {object} [config]  DOMPurify config override
 * @returns {string}  Clean HTML
 */
export function purify(dirty, config = {}) {
  if (typeof dirty !== "string") return "";
  return DOMPurify.sanitize(dirty, { ..._RICH_TEXT_CONFIG, ...config });
}

/**
 * Strip ALL HTML tags — return plain text only.
 * Equivalent to `.textContent` extraction.
 * @param {string} dirty
 * @returns {string}
 */
export function purifyText(dirty) {
  if (typeof dirty !== "string") return "";
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize a URL — returns "" if the URL scheme is javascript: or data:.
 * @param {string} url
 * @returns {string}
 */
export function purifyUrl(url) {
  if (typeof url !== "string") return "";
  const clean = DOMPurify.sanitize(`<a href="${url}">x</a>`, {
    ALLOWED_TAGS: ["a"],
    ALLOWED_ATTR: ["href"],
  });
  const match = /href="([^"]*)"/.exec(clean);
  return match ? match[1] : "";
}
