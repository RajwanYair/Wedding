// tests/unit/plugin-marketplace.test.mjs — S641 Plugin marketplace browser
import { describe, it, expect } from "vitest";
import {
  searchPlugins,
  filterByTag,
  sortPlugins,
  isCompatible,
  installPlugin,
  uninstallPlugin,
  togglePlugin,
  checkUpdates,
  addRating,
} from "../../src/utils/plugin-marketplace.js";

const catalogue = [
  { id: "p1", name: "Table Planner Pro", description: "Drag-drop seating", version: "2.0.0", author: "A", tags: ["tables", "seating"], downloads: 500, avgRating: 4.5, ratingCount: 20, minAppVersion: "31.0.0", verified: true },
  { id: "p2", name: "RSVP Tracker", description: "Track RSVPs live", version: "1.2.0", author: "B", tags: ["rsvp", "tracking"], downloads: 1200, avgRating: 4.8, ratingCount: 50, minAppVersion: "30.0.0", verified: true },
  { id: "p3", name: "Photo Booth", description: "Virtual photo booth", version: "0.9.0", author: "C", tags: ["photos", "fun"], downloads: 300, avgRating: 3.5, ratingCount: 10, minAppVersion: "32.0.0", verified: false },
];

describe("plugin-marketplace", () => {
  describe("searchPlugins", () => {
    it("searches by name", () => {
      expect(searchPlugins(catalogue, "Table")).toHaveLength(1);
    });
    it("searches by description", () => {
      expect(searchPlugins(catalogue, "seating")).toHaveLength(1);
    });
    it("searches by tag", () => {
      expect(searchPlugins(catalogue, "rsvp")).toHaveLength(1);
    });
    it("returns all for empty query", () => {
      expect(searchPlugins(catalogue, "")).toHaveLength(3);
    });
  });

  describe("filterByTag", () => {
    it("filters by tag", () => {
      expect(filterByTag(catalogue, "tables")).toHaveLength(1);
    });
    it("returns empty for missing tag", () => {
      expect(filterByTag(catalogue, "nonexistent")).toHaveLength(0);
    });
  });

  describe("sortPlugins", () => {
    it("sorts by downloads desc", () => {
      const sorted = sortPlugins(catalogue, "downloads");
      expect(sorted[0].id).toBe("p2");
    });
    it("sorts by rating desc", () => {
      const sorted = sortPlugins(catalogue, "rating");
      expect(sorted[0].id).toBe("p2");
    });
    it("sorts by name asc", () => {
      const sorted = sortPlugins(catalogue, "name");
      expect(sorted[0].id).toBe("p3");
    });
  });

  describe("isCompatible", () => {
    it("compatible when current >= min", () => {
      expect(isCompatible("31.0.0", "31.6.0")).toBe(true);
    });
    it("incompatible when current < min", () => {
      expect(isCompatible("32.0.0", "31.6.0")).toBe(false);
    });
    it("exact match is compatible", () => {
      expect(isCompatible("31.6.0", "31.6.0")).toBe(true);
    });
  });

  describe("installPlugin", () => {
    it("creates install record", () => {
      const rec = installPlugin("p1", "2.0.0");
      expect(rec.pluginId).toBe("p1");
      expect(rec.enabled).toBe(true);
    });
  });

  describe("uninstallPlugin", () => {
    it("removes plugin", () => {
      const installed = [{ pluginId: "p1", installedVersion: "2.0.0", installedAt: "", enabled: true }];
      expect(uninstallPlugin(installed, "p1")).toHaveLength(0);
    });
  });

  describe("togglePlugin", () => {
    it("toggles enabled", () => {
      const p = { pluginId: "p1", installedVersion: "2.0.0", installedAt: "", enabled: true };
      expect(togglePlugin(p).enabled).toBe(false);
    });
  });

  describe("checkUpdates", () => {
    it("detects updates", () => {
      const installed = [{ pluginId: "p1", installedVersion: "1.0.0", installedAt: "", enabled: true }];
      const updates = checkUpdates(installed, catalogue);
      expect(updates).toHaveLength(1);
      expect(updates[0].latestVersion).toBe("2.0.0");
    });
    it("no updates when versions match", () => {
      const installed = [{ pluginId: "p1", installedVersion: "2.0.0", installedAt: "", enabled: true }];
      expect(checkUpdates(installed, catalogue)).toHaveLength(0);
    });
  });

  describe("addRating", () => {
    it("computes new average", () => {
      const r = addRating(4.0, 10, 5);
      expect(r.avgRating).toBe(4.1);
      expect(r.ratingCount).toBe(11);
    });
    it("clamps rating 1-5", () => {
      const r = addRating(0, 0, 10);
      expect(r.avgRating).toBe(5);
    });
  });
});
