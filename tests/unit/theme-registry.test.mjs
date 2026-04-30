/**
 * tests/unit/theme-registry.test.mjs — S451: coverage for src/utils/theme-registry.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── localStorage mock ─────────────────────────────────────────────────────

const _store = new Map();
const _localStorage = {
  getItem: vi.fn((k) => _store.get(k) ?? null),
  setItem: vi.fn((k, v) => _store.set(k, v)),
  removeItem: vi.fn((k) => _store.delete(k)),
  clear: vi.fn(() => _store.clear()),
};
vi.stubGlobal("localStorage", _localStorage);

// ── Mock dependencies ──────────────────────────────────────────────────────

const _applyThemeVarsMock = vi.fn();
vi.mock("../../src/services/theme.js", () => ({
  applyThemeVars: (...a) => _applyThemeVarsMock(...a),
  THEME_VARS: {},
  serializeThemeVars: vi.fn(() => ({})),
  deserializeThemeVars: vi.fn((v) => v),
  exportThemeJson: vi.fn(),
  stringifyThemeJson: vi.fn(() => "{}"),
  importThemeJson: vi.fn(),
}));

import {
  COMMUNITY_THEMES,
  installTheme,
  listInstalledThemes,
} from "../../src/utils/theme-registry.js";

const STORAGE_KEY = "wedding_v1_installed_themes";

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
});

describe("theme-registry — COMMUNITY_THEMES", () => {
  it("exports a frozen array", () => {
    expect(Array.isArray(COMMUNITY_THEMES)).toBe(true);
    expect(() => { /** @type {any} */ (COMMUNITY_THEMES).push({}); }).toThrow();
  });

  it("has exactly 4 community themes", () => {
    expect(COMMUNITY_THEMES).toHaveLength(4);
  });

  it("each theme has id, name, swatches, and vars", () => {
    for (const theme of COMMUNITY_THEMES) {
      expect(typeof theme.id).toBe("string");
      expect(typeof theme.name).toBe("string");
      expect(Array.isArray(theme.swatches)).toBe(true);
      expect(theme.swatches.length).toBeGreaterThan(0);
      expect(typeof theme.vars).toBe("object");
      expect(Object.keys(theme.vars).length).toBeGreaterThan(0);
    }
  });

  it("includes midnight-blue, forest-green, crimson-love, ocean-breeze", () => {
    const ids = COMMUNITY_THEMES.map((t) => t.id);
    expect(ids).toContain("midnight-blue");
    expect(ids).toContain("forest-green");
    expect(ids).toContain("crimson-love");
    expect(ids).toContain("ocean-breeze");
  });
});

describe("theme-registry — installTheme()", () => {
  it("calls applyThemeVars with the theme vars", () => {
    installTheme("midnight-blue");
    expect(_applyThemeVarsMock).toHaveBeenCalledWith(
      expect.objectContaining({ "--color-primary": "#4a9eff" }),
    );
  });

  it("persists the installed theme id to localStorage", () => {
    installTheme("forest-green");
    expect(_localStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining("forest-green"),
    );
  });

  it("does not call applyThemeVars for unknown id", () => {
    installTheme("non-existent-theme");
    expect(_applyThemeVarsMock).not.toHaveBeenCalled();
  });

  it("accumulates multiple installed themes", () => {
    installTheme("midnight-blue");
    installTheme("crimson-love");
    const list = listInstalledThemes();
    expect(list).toContain("midnight-blue");
    expect(list).toContain("crimson-love");
  });

  it("does not duplicate an already-installed theme", () => {
    installTheme("ocean-breeze");
    installTheme("ocean-breeze");
    const list = listInstalledThemes();
    expect(list.filter((id) => id === "ocean-breeze")).toHaveLength(1);
  });
});

describe("theme-registry — listInstalledThemes()", () => {
  it("returns empty array when nothing installed", () => {
    expect(listInstalledThemes()).toEqual([]);
  });

  it("returns installed theme ids", () => {
    installTheme("forest-green");
    expect(listInstalledThemes()).toContain("forest-green");
  });

  it("handles corrupt localStorage gracefully", () => {
    _store.set(STORAGE_KEY, "{{bad json}}");
    expect(listInstalledThemes()).toEqual([]);
  });
});
