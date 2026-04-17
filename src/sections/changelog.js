/**
 * src/sections/changelog.js — Changelog section ESM module
 *
 * Fetches CHANGELOG.md and renders it as formatted HTML.
 */

/** @type {string|null} cached rendered HTML */
let _cached = null;

export function mount(/** @type {HTMLElement} */ _container) {
  renderChangelog();
}

export function unmount() {
  // no subscriptions to clean up
}

export async function renderChangelog() {
  const el = document.getElementById("changelogContent");
  if (!el) return;

  if (_cached) {
    el.innerHTML = _cached;
    return;
  }

  try {
    const resp = await fetch("./CHANGELOG.md", { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const md = await resp.text();
    const html = _mdToHtml(md);
    _cached = html;
    el.innerHTML = html;
  } catch {
    el.textContent = "Failed to load changelog.";
  }
}

/**
 * Minimal Markdown → HTML converter (handles headings, lists, bold, code).
 * No external dependencies.
 * @param {string} md
 * @returns {string}
 */
function _mdToHtml(md) {
  const lines = md.split("\n");
  /** @type {string[]} */
  const out = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trimEnd();

    // Headings
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

    // List items
    if (trimmed.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${_escapeHtml(_inlineFormat(trimmed.slice(2)))}</li>`);
      continue;
    }

    // Empty line
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

/**
 * Inline markdown: **bold**, `code`, [text](url) — returns raw text (HTML-escaped later).
 * We return text with markers that survive escapeHtml, then post-process.
 * @param {string} text
 * @returns {string}
 */
function _inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<<b>>$1<</b>>")
    .replace(/`(.+?)`/g, "<<code>>$1<</code>>");
}

/** @param {string} s */
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
