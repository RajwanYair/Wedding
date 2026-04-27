/**
 * tests/unit/changelog-parser.test.mjs — Sprint 51 / B6
 * Unit tests for src/utils/changelog-parser.js
 */

import { describe, it, expect } from "vitest";
import {
  parseChangelog,
  getLatestEntry,
  getEntriesSince,
  flattenItems,
} from "../../src/utils/changelog-parser.js";

const SAMPLE = `
## [12.4.0] — 2026-05-01
> A new release with great features.

### Added (12.4.0)
- RSVP analytics funnel
- Budget burn-down chart

### Changed (12.4.0)
- Improved vendor payment display

## [12.3.0] — 2026-04-01
> Stability improvements.

### Fixed (12.3.0)
- Phone validation edge case

### Added (12.3.0)
- Timeline run-of-show

## [12.2.0] — 2026-03-01

### Added (12.2.0)
- Initial changelog parser
`.trim();

describe("parseChangelog", () => {
  it("parses all version entries", () => {
    const entries = parseChangelog(SAMPLE);
    expect(entries).toHaveLength(3);
  });

  it("parses version and date correctly", () => {
    const entries = parseChangelog(SAMPLE);
    expect(entries[0].version).toBe("12.4.0");
    expect(entries[0].date).toBe("2026-05-01");
    expect(entries[1].version).toBe("12.3.0");
  });

  it("parses sections with correct headings", () => {
    const entries = parseChangelog(SAMPLE);
    const sections = entries[0].sections;
    expect(sections.map((s) => s.heading)).toContain("Added");
    expect(sections.map((s) => s.heading)).toContain("Changed");
  });

  it("strips trailing version suffix from section heading", () => {
    const entries = parseChangelog(SAMPLE);
    // "Added (12.4.0)" should become "Added"
    expect(entries[0].sections.find((s) => s.heading === "Added")).toBeDefined();
  });

  it("parses items correctly", () => {
    const entries = parseChangelog(SAMPLE);
    const added = entries[0].sections.find((s) => s.heading === "Added");
    expect(added.items).toContain("RSVP analytics funnel");
    expect(added.items).toContain("Budget burn-down chart");
  });

  it("captures blockquote as desc", () => {
    const entries = parseChangelog(SAMPLE);
    expect(entries[0].desc).toContain("A new release");
  });

  it("handles entry with no description", () => {
    const entries = parseChangelog(SAMPLE);
    expect(entries[2].desc).toBe("");
  });

  it("returns empty array for empty input", () => {
    expect(parseChangelog("")).toHaveLength(0);
  });

  it("returns empty array for non-changelog text", () => {
    expect(parseChangelog("# Just a README\n\nSome text.")).toHaveLength(0);
  });

  it("strips bold markdown from items", () => {
    const text = "## [1.0.0] — 2026-01-01\n### Added\n- **New** feature";
    const entries = parseChangelog(text);
    expect(entries[0].sections[0].items[0]).toBe("New feature");
  });
});

describe("getLatestEntry", () => {
  it("returns the first (most recent) entry", () => {
    const entry = getLatestEntry(SAMPLE);
    expect(entry).not.toBeNull();
    expect(entry.version).toBe("12.4.0");
  });

  it("returns null for empty input", () => {
    expect(getLatestEntry("")).toBeNull();
  });
});

describe("getEntriesSince", () => {
  it("returns entries newer than the given version", () => {
    const entries = getEntriesSince(SAMPLE, "12.3.0");
    expect(entries).toHaveLength(1);
    expect(entries[0].version).toBe("12.4.0");
  });

  it("returns all entries when version not found", () => {
    const entries = getEntriesSince(SAMPLE, "99.0.0");
    expect(entries).toHaveLength(3);
  });

  it("returns empty when already at latest", () => {
    const entries = getEntriesSince(SAMPLE, "12.4.0");
    expect(entries).toHaveLength(0);
  });
});

describe("flattenItems", () => {
  it("flattens all items with section prefix", () => {
    const entry = getLatestEntry(SAMPLE);
    const items = flattenItems(entry);
    expect(items.some((i) => i.startsWith("[Added]"))).toBe(true);
    expect(items.some((i) => i.startsWith("[Changed]"))).toBe(true);
  });

  it("respects maxItems limit", () => {
    const entry = getLatestEntry(SAMPLE);
    const items = flattenItems(entry, 2);
    expect(items).toHaveLength(2);
  });

  it("returns all items when maxItems is large", () => {
    const entry = getLatestEntry(SAMPLE);
    // 2 Added + 1 Changed = 3 items
    const items = flattenItems(entry, 100);
    expect(items).toHaveLength(3);
  });

  it("returns empty array for entry with no sections", () => {
    const items = flattenItems({ version: "1.0.0", date: "", desc: "", sections: [] });
    expect(items).toHaveLength(0);
  });
});
