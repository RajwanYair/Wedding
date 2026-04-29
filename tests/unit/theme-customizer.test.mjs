/**
 * tests/unit/theme-customizer.test.mjs — Sprint 138 theme customizer UI wiring
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  THEME_VARS,
  sanitizeThemeVars,
  applyThemeVars,
  serializeThemeVars,
  deserializeThemeVars,
} from "../../src/services/theme.js";
import {
  exportThemeJson,
  stringifyThemeJson,
  importThemeJson,
} from "../../src/services/theme.js";

describe("ThemeCustomizer (Sprint 138)", () => {
  describe("sanitizeThemeVars", () => {
    it("returns empty object for null input", () => {
      expect(sanitizeThemeVars(null)).toEqual({});
    });

    it("drops unknown keys", () => {
      const result = sanitizeThemeVars({ "--unknown-var": "red" });
      expect(result).toEqual({});
    });

    it("accepts valid color hex values", () => {
      const result = sanitizeThemeVars({ "--color-primary": "#ff0000" });
      expect(result["--color-primary"]).toBe("#ff0000");
    });

    it("rejects invalid color values", () => {
      const result = sanitizeThemeVars({ "--color-primary": "not-a-color" });
      expect(result["--color-primary"]).toBeUndefined();
    });

    it("clamps length values within range", () => {
      const result = sanitizeThemeVars({ "--radius-md": "999" });
      expect(result["--radius-md"]).toBe("32px");
    });

    it("clamps number values within range", () => {
      const result = sanitizeThemeVars({ "--glass-opacity": "5" });
      expect(result["--glass-opacity"]).toBe("1");
    });
  });

  describe("applyThemeVars", () => {
    let mockEl;

    beforeEach(() => {
      mockEl = {
        style: {
          _props: {},
          setProperty(k, v) { this._props[k] = v; },
          removeProperty(k) { delete this._props[k]; },
          getPropertyValue(k) { return this._props[k] ?? ""; },
        },
      };
    });

    it("sets CSS custom properties on target element", () => {
      applyThemeVars({ "--color-primary": "#abc123" }, mockEl);
      expect(mockEl.style._props["--color-primary"]).toBe("#abc123");
    });

    it("returns a revert function that restores previous values", () => {
      mockEl.style.setProperty("--color-primary", "#000000");
      const revert = applyThemeVars({ "--color-primary": "#ffffff" }, mockEl);
      expect(mockEl.style._props["--color-primary"]).toBe("#ffffff");
      revert();
      expect(mockEl.style._props["--color-primary"]).toBe("#000000");
    });
  });

  describe("serializeThemeVars / deserializeThemeVars", () => {
    it("round-trips valid vars through JSON", () => {
      const input = { "--color-primary": "#aabbcc", "--radius-md": "10" };
      const json = serializeThemeVars(input);
      const result = deserializeThemeVars(json);
      expect(result["--color-primary"]).toBe("#aabbcc");
      expect(result["--radius-md"]).toBe("10px");
    });

    it("returns empty object for invalid JSON", () => {
      expect(deserializeThemeVars("not-json")).toEqual({});
    });
  });

  describe("exportThemeJson", () => {
    it("creates a valid envelope with schema version", () => {
      const envelope = exportThemeJson({ "--color-primary": "#123456" }, { name: "Test" });
      expect(envelope.schemaVersion).toBe(1);
      expect(envelope.name).toBe("Test");
      expect(envelope.vars["--color-primary"]).toBe("#123456");
    });
  });

  describe("importThemeJson", () => {
    it("parses valid theme JSON string", () => {
      const envelope = exportThemeJson({ "--color-primary": "#abcdef" });
      const json = stringifyThemeJson(envelope);
      const result = importThemeJson(json);
      expect(result.ok).toBe(true);
      expect(result.envelope.vars["--color-primary"]).toBe("#abcdef");
    });

    it("rejects invalid JSON", () => {
      const result = importThemeJson("{broken");
      expect(result.ok).toBe(false);
      expect(result.error).toBe("invalid_json");
    });

    it("rejects unsupported schema version", () => {
      const result = importThemeJson(JSON.stringify({ schemaVersion: 99, vars: {} }));
      expect(result.ok).toBe(false);
      expect(result.error).toBe("unsupported_schema");
    });
  });

  describe("THEME_VARS catalog", () => {
    it("contains at least 5 editable variables", () => {
      expect(THEME_VARS.length).toBeGreaterThanOrEqual(5);
    });

    it("each var has key, label, type, and default", () => {
      for (const v of THEME_VARS) {
        expect(v.key).toMatch(/^--/);
        expect(v.label).toBeTruthy();
        expect(["color", "length", "number"]).toContain(v.type);
        expect(v.default).toBeTruthy();
      }
    });
  });
});
