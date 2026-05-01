/**
 * Markdown table-of-contents builder.
 *
 * Pure functions — parse ATX-style `#` headings out of a markdown source
 * and emit a nested `<ul>` markdown TOC. Slugs are GitHub-style via the
 * shared `slugify` helper so anchors match rendered HTML.
 *
 * @typedef {object} TocHeading
 * @property {1|2|3|4|5|6} depth
 * @property {string} text
 * @property {string} slug
 * @owner shared
 */

import { slugify } from "./slug.js";

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/**
 * Parse markdown headings, ignoring fenced code blocks (```/~~~).
 *
 * @param {string} markdown
 * @returns {TocHeading[]}
 */
export function parseHeadings(markdown) {
  if (typeof markdown !== "string") return [];
  const lines = markdown.split(/\r?\n/);
  const out = [];
  const seen = new Map();
  let inFence = false;
  let fence = "";
  for (const line of lines) {
    const fenceMatch = /^(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fence = fenceMatch[1][0];
      } else if (line.startsWith(fence.repeat(3))) {
        inFence = false;
      }
      continue;
    }
    if (inFence) continue;
    const m = HEADING_RE.exec(line);
    if (!m) continue;
    const depth = /** @type {TocHeading["depth"]} */ (m[1].length);
    const text = m[2].trim();
    let slug = slugify(text);
    if (slug.length === 0) slug = "section";
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    if (count > 0) slug = `${slug}-${count}`;
    out.push({ depth, text, slug });
  }
  return out;
}

/**
 * Render a nested markdown unordered list. Skips depths shallower than
 * `minDepth` so callers can omit the title (h1).
 *
 * @param {ReadonlyArray<TocHeading>} headings
 * @param {{ minDepth?: 1|2|3|4|5|6, indent?: string }} [options]
 * @returns {string}
 */
export function renderToc(headings, options = {}) {
  const minDepth = options.minDepth ?? 2;
  const indent = options.indent ?? "  ";
  const filtered = headings.filter((h) => h.depth >= minDepth);
  if (filtered.length === 0) return "";
  const baseDepth = Math.min(...filtered.map((h) => h.depth));
  return filtered
    .map((h) => {
      const pad = indent.repeat(h.depth - baseDepth);
      return `${pad}- [${h.text}](#${h.slug})`;
    })
    .join("\n");
}
