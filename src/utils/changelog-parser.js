/**
 * src/utils/changelog-parser.js
 * Parses CHANGELOG.md entries into structured objects for the "What's New" UI.
 * Pure string processing — no DOM, no file I/O.
 *
 * @module changelog-parser
 */

// ── Regex patterns ─────────────────────────────────────────────────────────

/** Matches `## [X.Y.Z] — YYYY-MM-DD` and `## [Unreleased]` */
const VERSION_HEADING_RE = /^##\s+\[([^\]]+)\](?:\s+[—–-]+\s+(\d{4}-\d{2}-\d{2}))?/;

/** Matches `### Added`, `### Changed`, etc. */
const SECTION_HEADING_RE = /^###\s+(.+)/;

/** Matches a list item starting with `- ` or `* ` */
const LIST_ITEM_RE = /^[-*]\s+(.+)/;

/** Strips `**text**` bold markers */
const BOLD_RE = /\*\*([^*]+)\*\*/g;

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{ version: string, date: string|null, sections: Record<string, string[]>, raw: string }} VersionEntry
 */

// ── Core parser ────────────────────────────────────────────────────────────

/**
 * Parses a single version section of a CHANGELOG (text between two `## ` headings).
 * @param {string} text - Raw text for one version block (includes the `## [X.Y.Z]` heading line).
 * @returns {VersionEntry|null}
 */
export function parseVersionEntry(text) {
  if (!text || typeof text !== "string") return null;

  const lines = text.split(/\r?\n/);
  const firstLine = lines[0].trim();
  const headingMatch = VERSION_HEADING_RE.exec(firstLine);
  if (!headingMatch) return null;

  const version = headingMatch[1];
  const date = headingMatch[2] ?? null;
  const sections = {};
  let currentSection = null;

  for (const line of lines.slice(1)) {
    const sectionMatch = SECTION_HEADING_RE.exec(line.trim());
    const itemMatch = LIST_ITEM_RE.exec(line.trim());

    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      sections[currentSection] = [];
    } else if (itemMatch && currentSection) {
      sections[currentSection].push(itemMatch[1].trim());
    }
  }

  return { version, date, sections, raw: text.trim() };
}

/**
 * Parses an entire CHANGELOG.md string into an array of VersionEntry objects.
 * Sections are returned in document order (newest first if CHANGELOG is newest-first).
 * @param {string} changelogText
 * @returns {VersionEntry[]}
 */
export function parseChangelog(changelogText) {
  if (!changelogText || typeof changelogText !== "string") return [];

  // Split on lines that start a new version heading
  const blocks = changelogText.split(/(?=^## \[)/m);
  const entries = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const entry = parseVersionEntry(trimmed);
    if (entry) entries.push(entry);
  }

  return entries;
}

/**
 * Returns the latest (non-Unreleased) VersionEntry from an array.
 * @param {VersionEntry[]} entries
 * @returns {VersionEntry|null}
 */
export function getLatestEntry(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  return entries.find((e) => e.version !== "Unreleased") ?? null;
}

/**
 * Returns all entries with a version strictly newer than `sinceVersion`.
 * Excludes Unreleased entries.
 * @param {VersionEntry[]} entries
 * @param {string} sinceVersion - e.g. "9.5.0"
 * @returns {VersionEntry[]}
 */
export function getEntriesSince(entries, sinceVersion) {
  if (!Array.isArray(entries) || !sinceVersion) return [];
  return entries.filter(
    (e) => e.version !== "Unreleased" && isNewerVersion(e.version, sinceVersion)
  );
}

// ── Version comparison ─────────────────────────────────────────────────────

/**
 * Compares two semver strings.
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareVersions(a, b) {
  const parse = (v) => String(v).split(".").map(Number);
  const [ma, mi, pa] = parse(a);
  const [mb, mi2, pb] = parse(b);

  if (ma !== mb) return ma > mb ? 1 : -1;
  if (mi !== mi2) return mi > mi2 ? 1 : -1;
  if (pa !== pb) return pa > pb ? 1 : -1;
  return 0;
}

/**
 * Returns true if version `a` is strictly newer than `b`.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function isNewerVersion(a, b) {
  return compareVersions(a, b) > 0;
}

// ── Display helpers ────────────────────────────────────────────────────────

/**
 * Formats a VersionEntry into a simple display-ready object.
 * Strips bold markers from item text.
 * @param {VersionEntry} entry
 * @returns {{ version: string, date: string, items: Array<{ section: string, text: string }> }}
 */
export function formatEntryForDisplay(entry) {
  if (!entry) return { version: "", date: "", items: [] };

  const items = [];
  for (const [section, lines] of Object.entries(entry.sections)) {
    for (const line of lines) {
      items.push({ section, text: line.replace(BOLD_RE, "$1") });
    }
  }

  return {
    version: entry.version,
    date: entry.date ?? "",
    items,
  };
}

/**
 * Returns all "Added" section items from entries newer than `sinceVersion`.
 * Strips bold markers.
 * @param {VersionEntry[]} entries
 * @param {string} sinceVersion
 * @returns {string[]}
 */
export function getNewFeaturesSince(entries, sinceVersion) {
  const newer = getEntriesSince(entries, sinceVersion);
  const features = [];
  for (const entry of newer) {
    const added = entry.sections.Added ?? [];
    for (const item of added) {
      features.push(item.replace(BOLD_RE, "$1"));
    }
  }
  return features;
}
