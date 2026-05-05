/**
 * tests/unit/s695-theme-marketplace.test.mjs
 * S695 — Theme marketplace browser: search, sort, install, activate, uninstall, rate, stats.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  createThemeListing,
  installTheme,
  activateTheme,
  uninstallTheme,
  rateTheme,
  searchThemes,
  sortThemes,
  getMarketplaceStats,
  resetIdCounter,
} from "../../src/utils/theme-marketplace.js";

beforeEach(() => resetIdCounter());

const mkListing = (overrides = {}) =>
  createThemeListing({
    name: "Rose Gold",
    author: "Alice",
    tags: ["wedding", "rosegold"],
    rating: 4.2,
    ...overrides,
  });

describe("S695 theme marketplace — createThemeListing", () => {
  it("creates a listing with sequential id", () => {
    const l1 = mkListing({ name: "A" });
    const l2 = mkListing({ name: "B" });
    expect(l1.id).toBe("theme_1");
    expect(l2.id).toBe("theme_2");
  });

  it("defaults missing fields", () => {
    const l = createThemeListing({ name: "X", author: "Y" });
    expect(l.version).toBe("1.0.0");
    expect(l.rating).toBe(0);
    expect(l.downloads).toBe(0);
    expect(l.tags).toEqual([]);
  });
});

describe("S695 theme marketplace — install / uninstall / activate", () => {
  it("installs a theme into an empty list", () => {
    const theme = mkListing();
    const { installed, entry } = installTheme(theme, []);
    expect(installed).toHaveLength(1);
    expect(entry.themeId).toBe(theme.id);
    expect(entry.active).toBe(false);
  });

  it("does not duplicate if theme already installed (upgrades version)", () => {
    const theme = mkListing();
    const { installed: first } = installTheme(theme, []);
    const updated = createThemeListing({ name: "Rose Gold", author: "Alice" });
    // reuse same id by patching
    const updatedSameId = { ...updated, id: theme.id, version: "2.0.0" };
    const { installed: second } = installTheme(updatedSameId, first);
    expect(second).toHaveLength(1);
    expect(second[0].version).toBe("2.0.0");
  });

  it("uninstalls a theme", () => {
    const theme = mkListing();
    const { installed } = installTheme(theme, []);
    const after = uninstallTheme(theme.id, installed);
    expect(after).toHaveLength(0);
  });

  it("activates one theme and deactivates others", () => {
    const t1 = mkListing({ name: "T1" });
    const t2 = mkListing({ name: "T2" });
    let installed = installTheme(t1, []).installed;
    installed = installTheme(t2, installed).installed;
    const activated = activateTheme(t2.id, installed);
    expect(activated.find((i) => i.themeId === t1.id)?.active).toBe(false);
    expect(activated.find((i) => i.themeId === t2.id)?.active).toBe(true);
  });
});

describe("S695 theme marketplace — rating", () => {
  it("sets rating for first vote", () => {
    const theme = mkListing({ name: "X" });
    const rated = rateTheme(theme, 5, 0);
    expect(rated.rating).toBe(5);
  });

  it("computes running average", () => {
    const theme = mkListing({ name: "X" });
    const r1 = rateTheme(theme, 4, 0);        // first vote → 4
    const r2 = rateTheme(r1, 2, 1);           // (4 + 2) / 2 = 3
    expect(r2.rating).toBe(3);
  });

  it("clamps stars to 1–5", () => {
    const theme = mkListing({ name: "X" });
    expect(rateTheme(theme, 0, 0).rating).toBe(1);
    expect(rateTheme(theme, 99, 0).rating).toBe(5);
  });
});

describe("S695 theme marketplace — search", () => {
  let themes;
  beforeEach(() => {
    themes = [
      mkListing({ name: "Rose Gold", author: "Alice", tags: ["wedding"] }),
      mkListing({ name: "Ocean Blue", author: "Bob", tags: ["modern"] }),
      mkListing({ name: "Emerald Night", author: "Alice", tags: ["elegant"] }),
    ];
  });

  it("returns all themes for empty query", () => {
    expect(searchThemes(themes, "")).toHaveLength(3);
    expect(searchThemes(themes, "  ")).toHaveLength(3);
  });

  it("searches by name (case-insensitive)", () => {
    expect(searchThemes(themes, "rose")).toHaveLength(1);
    expect(searchThemes(themes, "OCEAN")).toHaveLength(1);
  });

  it("searches by author", () => {
    expect(searchThemes(themes, "alice")).toHaveLength(2);
  });

  it("searches by tag", () => {
    expect(searchThemes(themes, "elegant")).toHaveLength(1);
  });
});

describe("S695 theme marketplace — sort", () => {
  let themes;
  beforeEach(() => {
    themes = [
      { ...mkListing({ name: "A" }), rating: 3.5, downloads: 100, publishedAt: "2024-01-01T00:00:00.000Z" },
      { ...mkListing({ name: "B" }), rating: 4.8, downloads: 50,  publishedAt: "2025-06-01T00:00:00.000Z" },
      { ...mkListing({ name: "C" }), rating: 2.1, downloads: 500, publishedAt: "2023-12-01T00:00:00.000Z" },
    ];
  });

  it("sorts by downloads descending", () => {
    const sorted = sortThemes(themes, "downloads");
    expect(sorted[0].name).toBe("C");
    expect(sorted[2].name).toBe("B");
  });

  it("sorts by rating descending", () => {
    const sorted = sortThemes(themes, "rating");
    expect(sorted[0].name).toBe("B");
  });

  it("sorts by newest first", () => {
    const sorted = sortThemes(themes, "newest");
    expect(sorted[0].name).toBe("B");
  });
});

describe("S695 theme marketplace — stats", () => {
  it("returns correct counts", () => {
    const themes = [mkListing({ name: "A" }), mkListing({ name: "B" })];
    themes[0].rating = 4;
    themes[1].rating = 2;
    const installed = [{ themeId: themes[0].id, name: "A", version: "1.0.0", installedAt: "", active: true }];
    const stats = getMarketplaceStats(themes, installed);
    expect(stats.totalThemes).toBe(2);
    expect(stats.installed).toBe(1);
    expect(stats.activeTheme).toBe("A");
    expect(stats.avgRating).toBe(3);
  });

  it("returns null activeTheme when nothing active", () => {
    const themes = [mkListing({ name: "A" })];
    themes[0].rating = 4;
    const installed = [{ themeId: themes[0].id, name: "A", version: "1.0.0", installedAt: "", active: false }];
    expect(getMarketplaceStats(themes, installed).activeTheme).toBeNull();
  });
});
