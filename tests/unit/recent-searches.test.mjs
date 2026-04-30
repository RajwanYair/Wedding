/**
 * tests/unit/recent-searches.test.mjs — S461: recent-searches coverage
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const _store = new Map();
vi.stubGlobal("localStorage", {
  getItem: (k) => _store.get(k) ?? null,
  setItem: (k, v) => _store.set(k, v),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear(),
});

const {
  addRecentSearch,
  listRecentSearches,
  removeRecentSearch,
  clearRecentSearches,
} = await import("../../src/utils/recent-searches.js");

beforeEach(() => _store.clear());

describe("recent-searches — addRecentSearch", () => {
  it("adds a query to the front", () => {
    addRecentSearch("alice");
    addRecentSearch("bob");
    expect(listRecentSearches()).toEqual(["bob", "alice"]);
  });

  it("de-duplicates case-insensitively, keeping new casing", () => {
    addRecentSearch("Alice");
    addRecentSearch("alice");
    expect(listRecentSearches()).toEqual(["alice"]);
  });

  it("ignores empty/whitespace queries", () => {
    addRecentSearch("");
    addRecentSearch("   ");
    expect(listRecentSearches()).toEqual([]);
  });

  it("caps the list at the requested size", () => {
    for (let i = 0; i < 15; i++) addRecentSearch(`q${i}`, 5);
    expect(listRecentSearches()).toHaveLength(5);
    expect(listRecentSearches()[0]).toBe("q14");
  });

  it("uses default cap of 10", () => {
    for (let i = 0; i < 20; i++) addRecentSearch(`q${i}`);
    expect(listRecentSearches()).toHaveLength(10);
  });
});

describe("recent-searches — removeRecentSearch / clearRecentSearches", () => {
  it("removes a specific query (case-insensitive)", () => {
    addRecentSearch("alice");
    addRecentSearch("bob");
    removeRecentSearch("ALICE");
    expect(listRecentSearches()).toEqual(["bob"]);
  });

  it("no-op for empty input", () => {
    addRecentSearch("alice");
    expect(removeRecentSearch("")).toEqual(["alice"]);
  });

  it("clears the list entirely", () => {
    addRecentSearch("alice");
    addRecentSearch("bob");
    clearRecentSearches();
    expect(listRecentSearches()).toEqual([]);
  });
});

describe("recent-searches — corrupted storage", () => {
  it("returns [] when stored value is not an array", () => {
    _store.set("wedding_v1_recent_searches", '"not-an-array"');
    expect(listRecentSearches()).toEqual([]);
  });

  it("returns [] when stored value is invalid JSON", () => {
    _store.set("wedding_v1_recent_searches", "{not json");
    expect(listRecentSearches()).toEqual([]);
  });
});
