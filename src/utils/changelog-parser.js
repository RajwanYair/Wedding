/**
 * src/utils/changelog-parser.js — Changelog markdown parser (Sprint 47 / C1)
 *
 * Parses Keep-a-Changelog / standard CHANGELOG.md text into structured data.
 * Pure functions — no DOM, no network.
 *
 * Expected format (see project CHANGELOG.md):
 *   ## [12.3.0] — 2026-05-08
 *   ### Added (12.3.0)
 *   - item ...
 *   ### Changed (12.3.0)
 *   - item ...
 * @owner sections
 */

/**
 * @typedef {{
 *   heading: string,
 *   items: string[],
 * }} ChangeSection
 *
 * @typedef {{
 *   version:  string,
 *   date:     string,
 *   desc:     string,
 *   sections: ChangeSection[],
 * }} ChangeEntry
 */

const _VERSION_RE = /^##\s+\[?([^\]—\s]+)\]?\s*(?:—|-|–)?\s*(.*)$/;
const _SECTION_RE = /^###\s+(.+)$/;
const _ITEM_RE = /^[-*]\s+(.+)$/;
const _BLOCKQUOTE_RE = /^>\s*(.+)$/;

/**
 * Parse a full CHANGELOG.md string into an array of version entries.
 *
 * @param {string} text
 * @returns {ChangeEntry[]}
 */
export function parseChangelog(text) {
  /** @type {ChangeEntry[]} */
  const entries = [];
  /** @type {ChangeEntry | null} */
  let current = null;
  /** @type {ChangeSection | null} */
  let section = null;
  const descLines = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();

    const vMatch = line.match(_VERSION_RE);
    if (vMatch) {
      if (current) {
        if (section) {
          current.sections.push(section);
          section = null;
        }
        current.desc = descLines.splice(0).join(" ").trim();
        entries.push(current);
      }
      descLines.length = 0;
      const version = vMatch[1] ?? "";
      const date = (vMatch[2] ?? "").trim();
      current = { version, date, desc: "", sections: [] };
      continue;
    }

    if (!current) continue;

    const sMatch = line.match(_SECTION_RE);
    if (sMatch) {
      if (section) current.sections.push(section);
      // Strip trailing version suffix like " (12.3.0)"
      const heading = (sMatch[1] ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim();
      section = { heading, items: [] };
      continue;
    }

    const bMatch = line.match(_BLOCKQUOTE_RE);
    if (bMatch && section === null) {
      descLines.push(bMatch[1] ?? "");
      continue;
    }

    const itemMatch = line.match(_ITEM_RE);
    if (itemMatch && section) {
      // Strip inline bold markers (`**...**`)
      const raw = (itemMatch[1] ?? "").replace(/\*\*([^*]+)\*\*/g, "$1").trim();
      section.items.push(raw);
      continue;
    }

    // Continuation of blockquote description
    if (/^\s+\S/.test(line) && section === null && current) {
      descLines.push(line.trim());
    }
  }

  if (current) {
    if (section) current.sections.push(section);
    current.desc = descLines.join(" ").trim();
    entries.push(current);
  }

  return entries;
}

/**
 * Return the most recent (first) changelog entry.
 *
 * @param {string} text
 * @returns {ChangeEntry | null}
 */
export function getLatestEntry(text) {
  return parseChangelog(text)[0] ?? null;
}

/**
 * Return entries strictly newer than the given version string.
 * Comparison is positional (order in file), not semver.
 *
 * @param {string} text
 * @param {string} sinceVersion  e.g. "12.2.0"
 * @returns {ChangeEntry[]}
 */
export function getEntriesSince(text, sinceVersion) {
  const all = parseChangelog(text);
  const idx = all.findIndex((e) => e.version === sinceVersion);
  return idx === -1 ? all : all.slice(0, idx);
}

/**
 * Flatten the first `maxItems` bullet points from a change entry.
 *
 * @param {ChangeEntry} entry
 * @param {number} [maxItems]
 * @returns {string[]}
 */
export function flattenItems(entry, maxItems = 8) {
  /** @type {string[]} */
  const out = [];
  for (const sec of entry.sections) {
    for (const item of sec.items) {
      out.push(`[${sec.heading}] ${item}`);
      if (out.length >= maxItems) return out;
    }
  }
  return out;
}
