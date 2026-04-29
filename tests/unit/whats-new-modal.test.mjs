/**
 * tests/unit/whats-new-modal.test.mjs — Sprint 148 What's New modal
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const _store = new Map();
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorage: (k) => _store.get(k) ?? null,
  writeBrowserStorage: (k, v) => { _store.set(k, v); },
  readBrowserStorageJson: (k) => _store.get(k) ?? null,
  writeBrowserStorageJson: (k, v) => { _store.set(k, JSON.parse(JSON.stringify(v))); },
}));

beforeEach(() => { _store.clear(); });

const {
  compareSemver,
  shouldShowWhatsNew,
  collectNewerEntries,
  flattenItems,
} = await import("../../src/services/onboarding.js");

describe("WhatsNewModal (Sprint 148)", () => {
  describe("compareSemver", () => {
    it("returns 0 for equal versions", () => {
      expect(compareSemver("12.7.0", "12.7.0")).toBe(0);
    });
    it("returns 1 when a > b", () => {
      expect(compareSemver("12.8.0", "12.7.0")).toBe(1);
    });
    it("returns -1 when a < b", () => {
      expect(compareSemver("12.7.0", "12.8.0")).toBe(-1);
    });
    it("handles missing patch", () => {
      expect(compareSemver("12.8", "12.7.0")).toBe(1);
    });
  });

  describe("shouldShowWhatsNew", () => {
    it("returns true for admin with newer version", () => {
      expect(shouldShowWhatsNew({ currentVersion: "12.8.0", lastSeenVersion: "12.7.0", isAdmin: true })).toBe(true);
    });
    it("returns false for non-admin", () => {
      expect(shouldShowWhatsNew({ currentVersion: "12.8.0", lastSeenVersion: "12.7.0", isAdmin: false })).toBe(false);
    });
    it("returns false for same version", () => {
      expect(shouldShowWhatsNew({ currentVersion: "12.8.0", lastSeenVersion: "12.8.0", isAdmin: true })).toBe(false);
    });
    it("returns true when no lastSeen", () => {
      expect(shouldShowWhatsNew({ currentVersion: "12.8.0", lastSeenVersion: null, isAdmin: true })).toBe(true);
    });
  });

  describe("collectNewerEntries", () => {
    const entries = [
      { version: "12.8.0", date: "2026-04-28", items: ["a", "b"] },
      { version: "12.7.0", date: "2026-04-20", items: ["c"] },
      { version: "12.6.0", date: "2026-04-10", items: ["d"] },
    ];

    it("collects entries newer than given version", () => {
      const result = collectNewerEntries(entries, "12.7.0");
      expect(result).toHaveLength(1);
      expect(result[0].version).toBe("12.8.0");
    });

    it("collects all when sinceVersion is null", () => {
      expect(collectNewerEntries(entries, null)).toHaveLength(3);
    });
  });

  describe("flattenItems", () => {
    it("deduplicates items across entries", () => {
      const entries = [
        { version: "2.0.0", date: "d", items: ["a", "b"] },
        { version: "1.0.0", date: "d", items: ["b", "c"] },
      ];
      expect(flattenItems(entries)).toEqual(["a", "b", "c"]);
    });
    it("returns empty for empty input", () => {
      expect(flattenItems([])).toEqual([]);
    });
  });
});
