// @ts-check
/**
 * @vitest-environment happy-dom
 * tests/unit/high-contrast-theme.test.mjs — S587
 *
 * Verifies that:
 *  - applyTheme("high-contrast") adds body.theme-high-contrast
 *  - css/variables.css declares the theme block
 *  - settings.html ships a setTheme swatch with arg "high-contrast"
 *  - css/responsive.css contains forced-colors + prefers-contrast: more guards
 */
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

describe("S587 high-contrast theme", () => {
  beforeEach(() => {
    document.body.className = "";
    globalThis.localStorage?.clear?.();
  });

  it("applyTheme('high-contrast') sets body class", async () => {
    const { applyTheme } = await import("../../src/core/ui.js");
    applyTheme("high-contrast");
    expect(document.body.classList.contains("theme-high-contrast")).toBe(true);
  });

  it("variables.css declares theme-high-contrast block", () => {
    const css = readFileSync("css/variables.css", "utf8");
    expect(css).toMatch(/body\.theme-high-contrast\s*\{/);
  });

  it("settings.html ships the high-contrast swatch", () => {
    const html = readFileSync("src/templates/settings.html", "utf8");
    expect(html).toMatch(/data-action-arg="high-contrast"/);
  });

  it("responsive.css guards forced-colors + prefers-contrast: more", () => {
    const css = readFileSync("css/responsive.css", "utf8");
    expect(css).toMatch(/@media\s*\(\s*forced-colors:\s*active\s*\)/);
    expect(css).toMatch(/@media\s*\(\s*prefers-contrast:\s*more\s*\)/);
  });
});
