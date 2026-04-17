/**
 * tests/unit/color-scheme-manager.test.mjs — Sprint 131
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  listThemes, getActiveTheme, setActiveTheme, clearTheme, isValidTheme,
} from "../../src/utils/color-scheme-manager.js";

/** Minimal localStorage stub */
function makeStorage() {
  /** @type {Record<string, string>} */
  const store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}

let storage;

beforeEach(() => {
  storage = makeStorage();
});

describe("listThemes", () => {
  it("returns an array of themes", () => {
    const themes = listThemes();
    expect(themes.length).toBeGreaterThan(0);
    expect(themes).toContain("purple");
    expect(themes).toContain("rosegold");
  });
});

describe("getActiveTheme", () => {
  it("returns default purple when nothing stored", () => {
    expect(getActiveTheme({ storage })).toBe("purple");
  });

  it("returns stored theme", () => {
    storage.setItem("wedding_v1_colorScheme", "gold");
    expect(getActiveTheme({ storage })).toBe("gold");
  });

  it("falls back to purple for unknown stored value", () => {
    storage.setItem("wedding_v1_colorScheme", "neon");
    expect(getActiveTheme({ storage })).toBe("purple");
  });
});

describe("setActiveTheme", () => {
  it("stores valid theme and returns true", () => {
    expect(setActiveTheme("emerald", { storage })).toBe(true);
    expect(storage.getItem("wedding_v1_colorScheme")).toBe("emerald");
  });

  it("returns false for invalid theme", () => {
    expect(setActiveTheme("hotpink", { storage })).toBe(false);
  });
});

describe("clearTheme", () => {
  it("removes the stored theme", () => {
    setActiveTheme("royal", { storage });
    clearTheme({ storage });
    expect(getActiveTheme({ storage })).toBe("purple");
  });
});

describe("isValidTheme", () => {
  it("returns true for valid themes", () => {
    for (const t of listThemes()) {
      expect(isValidTheme(t)).toBe(true);
    }
  });

  it("returns false for invalid theme", () => {
    expect(isValidTheme("rainbow")).toBe(false);
  });
});
