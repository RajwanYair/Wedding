import { describe, it, expect } from "vitest";
import {
  parseVersionEntry,
  parseChangelog,
  getLatestEntry,
  getEntriesSince,
  compareVersions,
  isNewerVersion,
  formatEntryForDisplay,
  getNewFeaturesSince,
} from "../../src/utils/changelog-parser.js";

// ── Sample fixtures ───────────────────────────────────────────────────────

const ENTRY_TEXT = `## [9.6.0] — 2025-07-12

### Added

- **Accessibility utilities** — a11y.js exports isReducedMotion
- **Background Sync wrapper** — background-sync.js exports isBgSyncSupported

### Changed

- Updated default themes`;

const CHANGELOG_TEXT = `# Changelog

## [Unreleased]

## [9.6.0] — 2025-07-12

### Added

- **Feature A** — description A

### Changed

- Changed item 1

## [9.5.0] — 2025-07-11

### Added

- **Feature B** — description B

## [9.4.0] — 2025-07-10

### Added

- **Feature C** — description C
`;

// ── parseVersionEntry ─────────────────────────────────────────────────────

describe("parseVersionEntry()", () => {
  it("returns null for null input", () => expect(parseVersionEntry(null)).toBeNull());
  it("returns null for non-heading text", () => expect(parseVersionEntry("random text")).toBeNull());

  it("parses version and date", () => {
    const entry = parseVersionEntry(ENTRY_TEXT);
    expect(entry.version).toBe("9.6.0");
    expect(entry.date).toBe("2025-07-12");
  });

  it("parses sections", () => {
    const entry = parseVersionEntry(ENTRY_TEXT);
    expect(entry.sections.Added).toHaveLength(2);
    expect(entry.sections.Changed).toHaveLength(1);
  });

  it("preserves raw text", () => {
    const entry = parseVersionEntry(ENTRY_TEXT);
    expect(entry.raw).toContain("9.6.0");
  });

  it("handles Unreleased with no date", () => {
    const entry = parseVersionEntry("## [Unreleased]\n\n### Added\n\n- Item");
    expect(entry.version).toBe("Unreleased");
    expect(entry.date).toBeNull();
    expect(entry.sections.Added).toHaveLength(1);
  });

  it("handles entry with no sections", () => {
    const entry = parseVersionEntry("## [1.0.0] — 2020-01-01\n\nNo bullet items here.");
    expect(entry.sections).toEqual({});
  });
});

// ── parseChangelog ────────────────────────────────────────────────────────

describe("parseChangelog()", () => {
  it("returns empty for null", () => expect(parseChangelog(null)).toEqual([]));
  it("returns empty for empty string", () => expect(parseChangelog("")).toEqual([]));

  it("parses multiple versions", () => {
    const entries = parseChangelog(CHANGELOG_TEXT);
    const versions = entries.map((e) => e.version);
    expect(versions).toContain("9.6.0");
    expect(versions).toContain("9.5.0");
    expect(versions).toContain("9.4.0");
    expect(versions).toContain("Unreleased");
  });

  it("preserves document order", () => {
    const entries = parseChangelog(CHANGELOG_TEXT);
    const versioned = entries.filter((e) => e.version !== "Unreleased");
    expect(versioned[0].version).toBe("9.6.0");
    expect(versioned[1].version).toBe("9.5.0");
  });
});

// ── getLatestEntry ────────────────────────────────────────────────────────

describe("getLatestEntry()", () => {
  it("returns null for empty array", () => expect(getLatestEntry([])).toBeNull());
  it("returns null for null", () => expect(getLatestEntry(null)).toBeNull());

  it("skips Unreleased and returns first versioned entry", () => {
    const entries = parseChangelog(CHANGELOG_TEXT);
    const latest = getLatestEntry(entries);
    expect(latest.version).toBe("9.6.0");
  });
});

// ── getEntriesSince ───────────────────────────────────────────────────────

describe("getEntriesSince()", () => {
  it("returns empty for null entries", () => expect(getEntriesSince(null, "9.4.0")).toEqual([]));
  it("returns empty for null sinceVersion", () => expect(getEntriesSince([], null)).toEqual([]));

  it("returns entries newer than sinceVersion", () => {
    const entries = parseChangelog(CHANGELOG_TEXT);
    const result = getEntriesSince(entries, "9.5.0");
    const versions = result.map((e) => e.version);
    expect(versions).toContain("9.6.0");
    expect(versions).not.toContain("9.5.0");
    expect(versions).not.toContain("9.4.0");
    expect(versions).not.toContain("Unreleased");
  });

  it("returns empty when sinceVersion is already latest", () => {
    const entries = parseChangelog(CHANGELOG_TEXT);
    expect(getEntriesSince(entries, "9.6.0")).toHaveLength(0);
  });
});

// ── compareVersions ───────────────────────────────────────────────────────

describe("compareVersions()", () => {
  it("returns 0 for equal versions", () => expect(compareVersions("9.6.0", "9.6.0")).toBe(0));
  it("returns 1 when a > b (major)", () => expect(compareVersions("10.0.0", "9.9.9")).toBe(1));
  it("returns -1 when a < b (major)", () => expect(compareVersions("8.0.0", "9.0.0")).toBe(-1));
  it("compares minor version", () => expect(compareVersions("9.6.0", "9.5.0")).toBe(1));
  it("compares patch version", () => expect(compareVersions("9.6.1", "9.6.0")).toBe(1));
  it("handles two-segment version", () => expect(compareVersions("9.6", "9.5")).toBe(1));
});

// ── isNewerVersion ────────────────────────────────────────────────────────

describe("isNewerVersion()", () => {
  it("returns true for newer version", () => expect(isNewerVersion("9.7.0", "9.6.0")).toBe(true));
  it("returns false for same version", () => expect(isNewerVersion("9.6.0", "9.6.0")).toBe(false));
  it("returns false for older version", () => expect(isNewerVersion("9.5.0", "9.6.0")).toBe(false));
});

// ── formatEntryForDisplay ─────────────────────────────────────────────────

describe("formatEntryForDisplay()", () => {
  it("returns empty shape for null", () => {
    const result = formatEntryForDisplay(null);
    expect(result.version).toBe("");
    expect(result.items).toEqual([]);
  });

  it("returns version and date", () => {
    const entry = parseVersionEntry(ENTRY_TEXT);
    const display = formatEntryForDisplay(entry);
    expect(display.version).toBe("9.6.0");
    expect(display.date).toBe("2025-07-12");
  });

  it("strips bold markers from items", () => {
    const entry = parseVersionEntry(ENTRY_TEXT);
    const display = formatEntryForDisplay(entry);
    const texts = display.items.map((i) => i.text);
    expect(texts.some((t) => t.includes("**"))).toBe(false);
    expect(texts.some((t) => t.includes("Accessibility utilities"))).toBe(true);
  });

  it("includes section in each item", () => {
    const entry = parseVersionEntry(ENTRY_TEXT);
    const display = formatEntryForDisplay(entry);
    const addedItems = display.items.filter((i) => i.section === "Added");
    expect(addedItems).toHaveLength(2);
  });
});

// ── getNewFeaturesSince ───────────────────────────────────────────────────

describe("getNewFeaturesSince()", () => {
  it("returns empty for null entries", () => {
    expect(getNewFeaturesSince(null, "9.4.0")).toEqual([]);
  });

  it("returns Added items from newer versions", () => {
    const entries = parseChangelog(CHANGELOG_TEXT);
    const features = getNewFeaturesSince(entries, "9.5.0");
    expect(features.some((f) => f.includes("Feature A"))).toBe(true);
    expect(features.some((f) => f.includes("Feature B"))).toBe(false);
  });

  it("strips bold markers", () => {
    const entries = parseChangelog(CHANGELOG_TEXT);
    const features = getNewFeaturesSince(entries, "9.4.0");
    expect(features.some((f) => f.includes("**"))).toBe(false);
  });
});
