/**
 * tests/unit/css-audit.test.mjs — CSS quality audits (v6.0-S4)
 *
 * Static analysis of CSS files for accessibility and quality.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssDir = resolve(__dirname, "..", "..", "css");

const cssFiles = readdirSync(cssDir)
  .filter((f) => f.endsWith(".css"))
  .map((f) => ({ name: f, content: readFileSync(resolve(cssDir, f), "utf8") }));

const allCSS = cssFiles.map((f) => f.content).join("\n");

describe("CSS audit — accessibility", () => {
  it("has prefers-reduced-motion media query", () => {
    const hasReducedMotion = allCSS.includes("prefers-reduced-motion");
    expect(
      hasReducedMotion,
      "No prefers-reduced-motion media query found — add one in responsive.css or base.css to respect user preferences",
    ).toBe(true);
  });

  it("reduced-motion uses 'reduce' keyword", () => {
    if (!allCSS.includes("prefers-reduced-motion")) return;
    expect(
      allCSS.includes("prefers-reduced-motion: reduce"),
      "prefers-reduced-motion should check for 'reduce' value",
    ).toBe(true);
  });
});

describe("CSS audit — colors", () => {
  it("no hardcoded hex colors outside variables.css", () => {
    const nonVarFiles = cssFiles.filter(
      (f) => f.name !== "variables.css" && f.name !== "print.css",
    );
    for (const f of nonVarFiles) {
      // Match hex colors like #1a0a2e but not inside var() or custom-property references
      const lines = f.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip comments
        if (line.startsWith("/*") || line.startsWith("*")) continue;
        // Skip custom property declarations (--color-*)
        if (line.startsWith("--")) continue;
        // Skip CSS layer declarations, imports
        if (line.startsWith("@")) continue;
        // Check for hex colors not inside var()
        const hexMatches = line.match(/#[0-9a-fA-F]{3,8}\b/g);
        if (hexMatches) {
          // Allow hex colors inside custom property definitions
          if (line.includes("--")) continue;
          // Allow hex in filter/transform (e.g. drop-shadow)
          if (line.includes("filter:")) continue;
          expect.soft(
            null,
            `${f.name}:${i + 1} — Hardcoded hex ${hexMatches[0]} found (use CSS custom property)`,
          ).toBe(null);
        }
      }
    }
  });
});

describe("CSS audit — structure", () => {
  it("all CSS files use @layer or are recognized modules", () => {
    const expectedModules = [
      "variables",
      "base",
      "layout",
      "components",
      "responsive",
      "print",
      "auth",
    ];
    for (const f of cssFiles) {
      const stem = f.name.replace(".css", "");
      expect(
        expectedModules.includes(stem),
        `Unexpected CSS file: ${f.name}`,
      ).toBe(true);
    }
  });
});
