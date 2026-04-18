/**
 * src/utils/md-to-html.js — Minimal Markdown → HTML converter
 *
 * Handles headings (##-#####), unordered lists, paragraphs, bold, and inline code.
 * Used by the Changelog section to render CHANGELOG.md without a runtime dependency.
 *
 * Pure function — no side effects, no DOM access.
 *
 * @example
 *   import { mdToHtml } from "../utils/md-to-html.js";
 *   container.innerHTML = mdToHtml(markdownString);
 */

/**
 * Converts a limited subset of Markdown to safe HTML.
 * Headings are shifted by one level so `# H1` becomes `<h2>`.
 * Inline bold (`**text**`) and code (`\`text\``) are supported.
 *
 * @param {string} md  Raw Markdown string
 * @returns {string}   HTML string — all dynamic values are HTML-escaped
 */
export function mdToHtml(md) {
  const lines = md.split("\n");
  /** @type {string[]} */
  const out = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Headings  #→h2  ##→h3  ###→h4  ####→h5
    const h = trimmed.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const level = h[1].length;
      const text = _escapeHtml(_inlineFormat(h[2]));
      out.push(`<h${level + 1}>${text}</h${level + 1}>`);
      continue;
    }

    // Unordered list items
    if (trimmed.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${_escapeHtml(_inlineFormat(trimmed.slice(2)))}</li>`);
      continue;
    }

    // Blank line
    if (!trimmed) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }

    // Paragraph
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    out.push(`<p>${_escapeHtml(_inlineFormat(trimmed))}</p>`);
  }

  if (inList) out.push("</ul>");
  return out.join("\n");
}

// ── Internals ────────────────────────────────────────────────────────────

/**
 * Replaces `**bold**` and `` `code` `` with intermediate markers that survive
 * HTML escaping, then swaps them back to proper tags.
 * @param {string} text
 * @returns {string}
 */
function _inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<<b>>$1<</b>>")
    .replace(/`(.+?)`/g, "<<code>>$1<</code>>");
}

/**
 * Escapes HTML special characters and then restores the pre-agreed inline markers.
 * @param {string} s
 * @returns {string}
 */
function _escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/&lt;&lt;b&gt;&gt;/g, "<strong>")
    .replace(/&lt;&lt;\/b&gt;&gt;/g, "</strong>")
    .replace(/&lt;&lt;code&gt;&gt;/g, "<code>")
    .replace(/&lt;&lt;\/code&gt;&gt;/g, "</code>");
}
