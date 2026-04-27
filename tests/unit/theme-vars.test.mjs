/**
 * tests/unit/theme-vars.test.mjs — S119 live theme variable editor.
 */
import { describe, it, expect } from "vitest";
import {
  THEME_VARS,
  sanitizeThemeVars,
  applyThemeVars,
  serializeThemeVars,
  deserializeThemeVars,
} from "../../src/services/theme-vars.js";

function fakeEl() {
  /** @type {Map<string,string>} */
  const map = new Map();
  return {
    style: {
      setProperty: (k, v) => map.set(k, v),
      removeProperty: (k) => map.delete(k),
      getPropertyValue: (k) => map.get(k) ?? "",
    },
    _map: map,
  };
}

describe("S119 — theme-vars", () => {
  it("THEME_VARS catalog is frozen and non-empty", () => {
    expect(Object.isFrozen(THEME_VARS)).toBe(true);
    expect(THEME_VARS.length).toBeGreaterThan(5);
  });

  it("sanitizes color hex / drops invalid", () => {
    const out = sanitizeThemeVars({
      "--color-primary": "#abc123",
      "--color-bg": "not-a-color",
      "--unknown": "#fff",
    });
    expect(out["--color-primary"]).toBe("#abc123");
    expect(out).not.toHaveProperty("--color-bg");
    expect(out).not.toHaveProperty("--unknown");
  });

  it("clamps length values and appends unit", () => {
    expect(sanitizeThemeVars({ "--radius-md": "999" })["--radius-md"]).toBe("32px");
    expect(sanitizeThemeVars({ "--radius-md": "-5" })["--radius-md"]).toBe("0px");
    expect(sanitizeThemeVars({ "--blur-glass": "12.5" })["--blur-glass"]).toBe("12.5px");
  });

  it("clamps numeric values without unit", () => {
    expect(sanitizeThemeVars({ "--glass-opacity": "1.7" })["--glass-opacity"]).toBe("1");
    expect(sanitizeThemeVars({ "--glass-opacity": "-0.2" })["--glass-opacity"]).toBe("0");
  });

  it("applyThemeVars sets and reverts via revert()", () => {
    const el = fakeEl();
    el.style.setProperty("--color-primary", "#000000");
    const revert = applyThemeVars(
      { "--color-primary": "#ff00ff", "--radius-md": "20" },
      el,
    );
    expect(el._map.get("--color-primary")).toBe("#ff00ff");
    expect(el._map.get("--radius-md")).toBe("20px");
    revert();
    expect(el._map.get("--color-primary")).toBe("#000000");
    expect(el._map.has("--radius-md")).toBe(false);
  });

  it("serialize / deserialize round-trip", () => {
    const json = serializeThemeVars({ "--color-primary": "#abcdef" });
    expect(deserializeThemeVars(json)).toEqual({ "--color-primary": "#abcdef" });
  });

  it("deserializeThemeVars tolerates corrupt JSON", () => {
    expect(deserializeThemeVars("garbage")).toEqual({});
    expect(deserializeThemeVars(null)).toEqual({});
  });
});
