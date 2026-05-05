import { describe, it, expect, beforeEach } from "vitest";
import {
  resetIdCounter,
  createThemeListing,
  installTheme,
  uninstallTheme,
  activateTheme,
  rateTheme,
  searchThemes,
  sortThemes,
  getMarketplaceStats,
} from "../../src/utils/theme-marketplace.js";

describe("S664 theme-marketplace", () => {
  beforeEach(() => resetIdCounter());

  describe("createThemeListing", () => {
    it("creates a listing with defaults", () => {
      const t = createThemeListing({ name: "Rose Gold", author: "Designer1" });
      expect(t.id).toBe("theme_1");
      expect(t.name).toBe("Rose Gold");
      expect(t.author).toBe("Designer1");
      expect(t.version).toBe("1.0.0");
      expect(t.rating).toBe(0);
      expect(t.downloads).toBe(0);
      expect(t.tags).toEqual([]);
    });

    it("trims name and author", () => {
      const t = createThemeListing({ name: "  Elegant  ", author: "  Bob  " });
      expect(t.name).toBe("Elegant");
      expect(t.author).toBe("Bob");
    });

    it("accepts custom tags and URLs", () => {
      const t = createThemeListing({
        name: "Dark",
        author: "X",
        tags: ["dark", "modern"],
        previewUrl: "https://example.com/preview.png",
        cssUrl: "https://example.com/theme.css",
      });
      expect(t.tags).toEqual(["dark", "modern"]);
      expect(t.previewUrl).toBe("https://example.com/preview.png");
    });
  });

  describe("installTheme", () => {
    it("installs a new theme", () => {
      const listing = createThemeListing({ name: "Gold", author: "A" });
      const { installed, entry } = installTheme(listing, []);
      expect(installed).toHaveLength(1);
      expect(entry.themeId).toBe(listing.id);
      expect(entry.active).toBe(false);
    });

    it("updates version if already installed", () => {
      const listing = createThemeListing({ name: "Gold", author: "A" });
      const existing = [{ themeId: listing.id, name: "Gold", version: "0.9.0", installedAt: "2024-01-01", active: true }];
      const { installed, entry } = installTheme({ ...listing, version: "2.0.0" }, existing);
      expect(installed).toHaveLength(1);
      expect(entry.version).toBe("2.0.0");
    });
  });

  describe("uninstallTheme", () => {
    it("removes the theme", () => {
      const list = [
        { themeId: "t1", name: "A", version: "1.0.0", installedAt: "2024-01-01", active: false },
        { themeId: "t2", name: "B", version: "1.0.0", installedAt: "2024-01-01", active: true },
      ];
      const result = uninstallTheme("t1", list);
      expect(result).toHaveLength(1);
      expect(result[0].themeId).toBe("t2");
    });

    it("returns same array if ID not found", () => {
      const list = [{ themeId: "t1", name: "A", version: "1.0.0", installedAt: "2024-01-01", active: false }];
      expect(uninstallTheme("t99", list)).toHaveLength(1);
    });
  });

  describe("activateTheme", () => {
    it("activates one and deactivates others", () => {
      const list = [
        { themeId: "t1", name: "A", version: "1.0.0", installedAt: "2024-01-01", active: true },
        { themeId: "t2", name: "B", version: "1.0.0", installedAt: "2024-01-01", active: false },
      ];
      const result = activateTheme("t2", list);
      expect(result[0].active).toBe(false);
      expect(result[1].active).toBe(true);
    });
  });

  describe("rateTheme", () => {
    it("sets first rating directly", () => {
      const t = createThemeListing({ name: "X", author: "Y" });
      const rated = rateTheme(t, 4, 0);
      expect(rated.rating).toBe(4);
    });

    it("computes running average", () => {
      const t = { ...createThemeListing({ name: "X", author: "Y" }), rating: 4 };
      const rated = rateTheme(t, 2, 1);
      expect(rated.rating).toBe(3);
    });

    it("clamps to 1-5 range", () => {
      const t = createThemeListing({ name: "X", author: "Y" });
      expect(rateTheme(t, 0, 0).rating).toBe(1);
      expect(rateTheme(t, 10, 0).rating).toBe(5);
    });
  });

  describe("searchThemes", () => {
    const themes = [
      { id: "1", name: "Rose Gold", author: "Alice", version: "1.0.0", description: "", tags: ["elegant", "gold"], rating: 4, downloads: 100, previewUrl: "", cssUrl: "", publishedAt: "2024-01-01" },
      { id: "2", name: "Dark Night", author: "Bob", version: "1.0.0", description: "", tags: ["dark", "modern"], rating: 5, downloads: 200, previewUrl: "", cssUrl: "", publishedAt: "2024-06-01" },
    ];

    it("searches by name", () => {
      expect(searchThemes(themes, "rose")).toHaveLength(1);
    });

    it("searches by tag", () => {
      expect(searchThemes(themes, "modern")).toHaveLength(1);
    });

    it("searches by author", () => {
      expect(searchThemes(themes, "alice")).toHaveLength(1);
    });

    it("returns all for empty query", () => {
      expect(searchThemes(themes, "")).toEqual(themes);
      expect(searchThemes(themes, "  ")).toEqual(themes);
    });
  });

  describe("sortThemes", () => {
    const themes = [
      { id: "1", name: "A", author: "X", version: "1.0.0", description: "", tags: [], rating: 3, downloads: 50, previewUrl: "", cssUrl: "", publishedAt: "2024-01-01" },
      { id: "2", name: "B", author: "Y", version: "1.0.0", description: "", tags: [], rating: 5, downloads: 200, previewUrl: "", cssUrl: "", publishedAt: "2024-06-01" },
    ];

    it("sorts by rating descending", () => {
      const sorted = sortThemes(themes, "rating");
      expect(sorted[0].id).toBe("2");
    });

    it("sorts by downloads descending", () => {
      const sorted = sortThemes(themes, "downloads");
      expect(sorted[0].id).toBe("2");
    });

    it("sorts by newest first", () => {
      const sorted = sortThemes(themes, "newest");
      expect(sorted[0].id).toBe("2");
    });
  });

  describe("getMarketplaceStats", () => {
    it("returns correct stats", () => {
      const themes = [
        { id: "1", name: "A", author: "X", version: "1.0.0", description: "", tags: [], rating: 4, downloads: 10, previewUrl: "", cssUrl: "", publishedAt: "" },
        { id: "2", name: "B", author: "Y", version: "1.0.0", description: "", tags: [], rating: 2, downloads: 5, previewUrl: "", cssUrl: "", publishedAt: "" },
      ];
      const installed = [
        { themeId: "1", name: "A", version: "1.0.0", installedAt: "", active: true },
      ];
      const stats = getMarketplaceStats(themes, installed);
      expect(stats.totalThemes).toBe(2);
      expect(stats.installed).toBe(1);
      expect(stats.activeTheme).toBe("A");
      expect(stats.avgRating).toBe(3);
    });

    it("returns null activeTheme when none active", () => {
      const stats = getMarketplaceStats([], []);
      expect(stats.activeTheme).toBeNull();
      expect(stats.avgRating).toBe(0);
    });
  });
});
