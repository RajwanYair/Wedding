/**
 * tests/unit/whats-new-engine.test.mjs — S126 What's New decision engine.
 */
import { describe, it, expect } from "vitest";
import {
  compareSemver,
  shouldShowWhatsNew,
  collectNewerEntries,
  flattenItems,
} from "../../src/services/whats-new-engine.js";

describe("S126 — whats-new-engine", () => {
  it("compareSemver basic ordering", () => {
    expect(compareSemver("12.5.9", "12.5.8")).toBe(1);
    expect(compareSemver("12.5.8", "12.5.9")).toBe(-1);
    expect(compareSemver("12.5.9", "12.5.9")).toBe(0);
    expect(compareSemver("13.0.0", "12.99.99")).toBe(1);
    expect(compareSemver("1.2", "1.2.0")).toBe(0);
  });

  it("shouldShowWhatsNew respects admin gate + version", () => {
    expect(
      shouldShowWhatsNew({ currentVersion: "12.5.9", lastSeenVersion: null, isAdmin: false }),
    ).toBe(false);
    expect(
      shouldShowWhatsNew({ currentVersion: "12.5.9", lastSeenVersion: null, isAdmin: true }),
    ).toBe(true);
    expect(
      shouldShowWhatsNew({ currentVersion: "12.5.9", lastSeenVersion: "12.5.9", isAdmin: true }),
    ).toBe(false);
    expect(
      shouldShowWhatsNew({ currentVersion: "12.5.9", lastSeenVersion: "12.5.8", isAdmin: true }),
    ).toBe(true);
    expect(
      shouldShowWhatsNew({ currentVersion: "12.5.8", lastSeenVersion: "12.5.9", isAdmin: true }),
    ).toBe(false);
  });

  it("collectNewerEntries filters + sorts desc", () => {
    const entries = [
      { version: "12.5.7", date: "x", items: ["a"] },
      { version: "12.5.9", date: "x", items: ["b"] },
      { version: "12.5.8", date: "x", items: ["c"] },
    ];
    const out = collectNewerEntries(entries, "12.5.7");
    expect(out.map((e) => e.version)).toEqual(["12.5.9", "12.5.8"]);
  });

  it("collectNewerEntries with no sinceVersion returns all sorted desc", () => {
    const out = collectNewerEntries(
      [
        { version: "1.0.0", date: "", items: [] },
        { version: "2.0.0", date: "", items: [] },
      ],
      null,
    );
    expect(out[0].version).toBe("2.0.0");
  });

  it("flattenItems dedupes and preserves first-seen order", () => {
    const out = flattenItems([
      { version: "2", date: "", items: ["alpha", "beta", " "] },
      { version: "1", date: "", items: ["beta", "gamma"] },
    ]);
    expect(out).toEqual(["alpha", "beta", "gamma"]);
  });

  it("handles nullish input gracefully", () => {
    expect(collectNewerEntries(undefined, "1.0.0")).toEqual([]);
    expect(flattenItems(undefined)).toEqual([]);
  });
});
