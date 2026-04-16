/**
 * tests/unit/wiring.test.mjs — Cross-reference consistency tests
 *
 * Ensures that sections are properly wired across all layers:
 *   1. src/core/template-loader.js  (_loaders map)
 *   2. src/core/nav.js              (_sections array)
 *   3. src/main.js                  (SECTIONS map + PUBLIC_SECTIONS)
 *   4. src/sections/index.js        (barrel exports)
 *   5. index.html                   (section containers + data-template + nav tabs)
 *   6. src/templates/*.html          (template files exist on disk)
 *   7. src/services/sheets-impl.js  (_SHEET_NAMES + _COL_ORDER)
 *   8. js/i18n/he.json + en.json   (i18n keys for nav)
 *
 * These tests read source files as text and verify cross-references.
 * If you add a new section, these tests tell you EXACTLY what else needs wiring.
 *
 * Run: npm test
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");

// ── Read source files once ────────────────────────────────────────────────────

const HTML = readFileSync(resolve(root, "index.html"), "utf8");
const TEMPLATE_LOADER = readFileSync(resolve(root, "src", "core", "template-loader.js"), "utf8");
const NAV_JS = readFileSync(resolve(root, "src", "core", "nav.js"), "utf8");
const MAIN_JS = readFileSync(resolve(root, "src", "main.js"), "utf8");
const UI_JS = readFileSync(resolve(root, "src", "core", "ui.js"), "utf8");
const BARREL = readFileSync(resolve(root, "src", "sections", "index.js"), "utf8");
const SHEETS_IMPL = readFileSync(resolve(root, "src", "services", "sheets-impl.js"), "utf8");
const CONSTANTS_JS = readFileSync(resolve(root, "src", "core", "constants.js"), "utf8");
const I18N_HE = JSON.parse(readFileSync(resolve(root, "js", "i18n", "he.json"), "utf8"));
const I18N_EN = JSON.parse(readFileSync(resolve(root, "js", "i18n", "en.json"), "utf8"));

// ── Extract canonical lists from source ───────────────────────────────────────

/** Extract all keys from the _loaders map in template-loader.js.
 * Supports both old object literal and new import.meta.glob patterns. */
function extractLoaderKeys() {
  // New pattern: import.meta.glob("../templates/*.html"...) builds a Map
  // Verify the glob import exists — if so, enumerate template files from disk
  if (TEMPLATE_LOADER.includes('import.meta.glob')) {
    return readdirSync(resolve(root, "src", "templates"))
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.replace(".html", ""));
  }
  // Fallback: old object-literal pattern
  const block = TEMPLATE_LOADER.match(/const _loaders\s*=\s*\{([\s\S]*?)\};/);
  if (!block) return [];
  return [...block[1].matchAll(/["']?([a-z][-a-z]*)["']?\s*:/g)].map((m) => m[1]);
}

/** Extract _sections list — may be inline array or imported from constants.js */
function extractNavSections() {
  // Check if nav.js imports from constants.js
  if (NAV_JS.includes('SECTION_LIST')) {
    return extractSectionList();
  }
  const block = NAV_JS.match(/const _sections\s*=\s*\[([\s\S]*?)\];/);
  if (!block) return [];
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Extract SECTION_LIST from constants.js */
function extractSectionList() {
  const block = CONSTANTS_JS.match(/SECTION_LIST\s*=.*?\(\[([\s\S]*?)\]\)/);
  if (!block) return [];
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Extract all section names from the SECTIONS map in main.js */
function extractSectionsMap() {
  const block = MAIN_JS.match(/const SECTIONS\s*=\s*\{([\s\S]*?)\};/);
  if (!block) return [];
  return [...block[1].matchAll(/["']?([a-z][-a-z]*)["']?\s*:/g)].map((m) => m[1]);
}

/** Extract PUBLIC_SECTIONS — may be in main.js or constants.js */
function extractPublicSections() {
  // Try constants.js first
  const constBlock = CONSTANTS_JS.match(/PUBLIC_SECTIONS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (constBlock) {
    return [...constBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  }
  // Fallback: main.js
  const block = MAIN_JS.match(/const PUBLIC_SECTIONS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!block) return [];
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Extract sec-XXX container IDs from index.html */
function extractHtmlContainers() {
  return [...HTML.matchAll(/id="sec-([a-z][-a-z]*)"/g)].map((m) => m[1]);
}

/** Extract data-template values from index.html */
function extractDataTemplates() {
  return [...HTML.matchAll(/data-template="([a-z][-a-z]*)"/g)].map((m) => m[1]);
}

/** Extract data-tab values from top nav in index.html */
function extractNavTabs() {
  return [...new Set([...HTML.matchAll(/data-tab="([a-z][-a-z]*)"/g)].map((m) => m[1]))];
}

/** Extract _SHEET_NAMES keys from sheets-impl.js */
function extractSheetNameKeys() {
  const block = SHEETS_IMPL.match(/const _SHEET_NAMES\s*=\s*\{([\s\S]*?)\};/);
  if (!block) return [];
  return [...block[1].matchAll(/([a-zA-Z]+)\s*:/g)].map((m) => m[1]);
}

/** Extract _COL_ORDER keys from sheets-impl.js */
function extractColOrderKeys() {
  const block = SHEETS_IMPL.match(/const _COL_ORDER\s*=\s*\{([\s\S]*?)\};/);
  if (!block) return [];
  return [...block[1].matchAll(/([a-zA-Z]+)\s*:\s*\[/g)].map((m) => m[1]);
}

/** Extract _MAP_KEYS from sheets-impl.js (key-value map sheets, no _COL_ORDER) */
function extractMapKeys() {
  const m = SHEETS_IMPL.match(/const _MAP_KEYS\s*=\s*new Set\(\[(.*?)\]\)/);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

// ── Canonical data ────────────────────────────────────────────────────────────

const loaderKeys = extractLoaderKeys();
const navSections = extractNavSections();
const sectionsMap = extractSectionsMap();
const publicSections = extractPublicSections();
const htmlContainers = extractHtmlContainers();
const dataTemplates = extractDataTemplates();
const navTabs = extractNavTabs();
const sheetNameKeys = extractSheetNameKeys();
const colOrderKeys = extractColOrderKeys();
const mapKeys = extractMapKeys();

// ── Known exceptions ──────────────────────────────────────────────────────────

/**
 * Sections in the SECTIONS map that are sub-sections rendered inside another
 * section's container (e.g. expenses renders inside budget's template).
 * They intentionally have NO sec-{name} div in index.html.
 */
const EMBEDDED_SECTIONS = new Set(["expenses"]);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Wiring: template-loader completeness", () => {
  it("_loaders map has at least 18 entries", () => {
    expect(loaderKeys.length).toBeGreaterThanOrEqual(18);
  });

  // Every data-template in HTML must have a loader
  const templates = extractDataTemplates();
  templates.forEach((name) => {
    it(`_loaders has entry for data-template="${name}"`, () => {
      expect(loaderKeys).toContain(name);
    });
  });

  // Every loader must have a template file on disk
  loaderKeys.forEach((name) => {
    it(`src/templates/${name}.html exists for loader "${name}"`, () => {
      expect(existsSync(resolve(root, "src", "templates", `${name}.html`))).toBe(true);
    });
  });
});

describe("Wiring: index.html section containers", () => {
  // Every nav section needs a container
  navSections.forEach((name) => {
    it(`index.html has <div id="sec-${name}"> for nav section`, () => {
      expect(htmlContainers).toContain(name);
    });
  });

  // Every SECTIONS map entry needs a container (except embedded sub-sections)
  sectionsMap.filter((n) => !EMBEDDED_SECTIONS.has(n)).forEach((name) => {
    it(`index.html has <div id="sec-${name}"> for SECTIONS entry`, () => {
      expect(htmlContainers).toContain(name);
    });
  });

  // Every container with data-template should have the template registered
  dataTemplates.forEach((name) => {
    it(`data-template="${name}" has a matching _loaders entry`, () => {
      expect(loaderKeys).toContain(name);
    });
  });
});

describe("Wiring: SECTIONS map (main.js)", () => {
  it("SECTIONS map has at least 18 entries", () => {
    expect(sectionsMap.length).toBeGreaterThanOrEqual(18);
  });

  // Every nav section must be in SECTIONS
  navSections.forEach((name) => {
    it(`SECTIONS map contains nav section "${name}"`, () => {
      expect(sectionsMap).toContain(name);
    });
  });

  // Every SECTIONS entry must have a module file
  sectionsMap.forEach((name) => {
    it(`src/sections/ has module for SECTIONS entry "${name}"`, () => {
      // contact-form → contact-collector.js, others → {name}.js
      const fileName = name === "contact-form" ? "contact-collector.js" : `${name}.js`;
      expect(existsSync(resolve(root, "src", "sections", fileName))).toBe(true);
    });
  });
});

describe("Wiring: barrel exports (src/sections/index.js)", () => {
  // Every section module imported in main.js should be in barrel
  const importedModules = [...MAIN_JS.matchAll(/import \* as (\w+Section) from "\.\/sections\//g)]
    .map((m) => m[1]);

  importedModules.forEach((modName) => {
    it(`barrel exports ${modName}`, () => {
      expect(BARREL).toContain(modName);
    });
  });
});

describe("Wiring: nav sections consistency", () => {
  it("_sections array has at least 14 entries", () => {
    expect(navSections.length).toBeGreaterThanOrEqual(14);
  });

  // Every nav section needs a nav tab button (top or bottom nav)
  navSections.forEach((name) => {
    it(`nav tab exists for section "${name}"`, () => {
      expect(navTabs).toContain(name);
    });
  });
});

describe("Wiring: PUBLIC_SECTIONS are valid", () => {
  publicSections.forEach((name) => {
    it(`PUBLIC_SECTIONS entry "${name}" exists in SECTIONS map`, () => {
      expect(sectionsMap).toContain(name);
    });
    it(`PUBLIC_SECTIONS entry "${name}" has HTML container`, () => {
      expect(htmlContainers).toContain(name);
    });
  });
});

describe("Wiring: i18n keys for nav sections", () => {
  navSections.forEach((name) => {
    const key = `nav_${name.replace(/-/g, "_")}`;
    // Not all sections have a nav_X key (e.g. landing uses nav_landing)
    // but all sections that appear in top/bottom nav should have one
    it(`he.json has i18n key "${key}" for nav section`, () => {
      expect(I18N_HE).toHaveProperty(key);
    });
    it(`en.json has i18n key "${key}" for nav section`, () => {
      expect(I18N_EN).toHaveProperty(key);
    });
  });
});

describe("Wiring: Sheets sync completeness", () => {
  // Every _SHEET_NAMES key (except _MAP_KEYS entries) must have _COL_ORDER
  const mapKeySet = new Set(mapKeys);
  const arraySheets = sheetNameKeys.filter((k) => !mapKeySet.has(k));
  arraySheets.forEach((key) => {
    it(`_COL_ORDER has columns for sheet "${key}"`, () => {
      expect(colOrderKeys).toContain(key);
    });
  });

  // Every _SHEET_NAMES value must be in GAS ALLOWED_SHEETS
  const gas = readFileSync(resolve(root, ".github", "scripts", "sheets-webapp.gs"), "utf8");
  const allowedMatch = gas.match(/ALLOWED_SHEETS\s*=\s*\[(.*?)\]/);
  const allowedSheets = allowedMatch
    ? [...allowedMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
    : [];

  it("GAS ALLOWED_SHEETS has at least 10 entries", () => {
    expect(allowedSheets.length).toBeGreaterThanOrEqual(10);
  });

  // Check that every _SHEET_NAMES value appears in GAS
  const sheetValues = [...SHEETS_IMPL.matchAll(/:\s*"([A-Z][a-z_]+)"/g)].map((m) => m[1]);
  sheetValues.forEach((tabName) => {
    it(`GAS ALLOWED_SHEETS includes "${tabName}"`, () => {
      expect(allowedSheets).toContain(tabName);
    });
  });

  // RSVP_Log is append-only, not in _SHEET_NAMES but must be in GAS
  it('GAS ALLOWED_SHEETS includes "RSVP_Log"', () => {
    expect(allowedSheets).toContain("RSVP_Log");
  });
});

describe("Wiring: no orphaned templates", () => {
  // Every template file on disk should be referenced by a loader
  const templateFiles = readdirSync(resolve(root, "src", "templates"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(".html", ""));

  templateFiles.forEach((name) => {
    it(`template file "${name}.html" has a _loaders entry`, () => {
      expect(loaderKeys).toContain(name);
    });
    it(`template file "${name}.html" has a sec-${name} container in HTML`, () => {
      expect(htmlContainers).toContain(name);
    });
  });
});

// ── Extract additional data ───────────────────────────────────────────────────

/** Extract all unique data-action values from a source string */
function extractDataActions(src) {
  return [...new Set([...src.matchAll(/data-action="([a-zA-Z]+)"/g)].map((m) => m[1]))];
}

/** Extract all on("X", ...) handler registrations from main.js */
function extractHandlers() {
  return [...new Set([...MAIN_JS.matchAll(/on\("([a-zA-Z]+)"/g)].map((m) => m[1]))];
}

/** Extract _modalLoaders keys from ui.js */
function extractModalLoaderKeys() {
  const block = UI_JS.match(/const _modalLoaders\s*=\s*\{([\s\S]*?)\};/);
  if (!block) return [];
  return [...block[1].matchAll(/([a-zA-Z]+)\s*:/g)].map((m) => m[1]);
}

const registeredHandlers = extractHandlers();
const modalLoaderKeys = extractModalLoaderKeys();

// Collect data-actions from all template + modal HTML files
const allTemplateHtml = readdirSync(resolve(root, "src", "templates"))
  .filter((f) => f.endsWith(".html"))
  .map((f) => readFileSync(resolve(root, "src", "templates", f), "utf8"))
  .join("\n");
const allModalHtml = readdirSync(resolve(root, "src", "modals"))
  .filter((f) => f.endsWith(".html"))
  .map((f) => readFileSync(resolve(root, "src", "modals", f), "utf8"))
  .join("\n");

describe("Wiring: data-action handlers registered", () => {
  // Every data-action in index.html needs a handler
  const htmlActions = extractDataActions(HTML);
  htmlActions.forEach((action) => {
    it(`main.js has on("${action}") for index.html`, () => {
      expect(registeredHandlers).toContain(action);
    });
  });

  // Every data-action in section templates needs a handler
  const templateActions = extractDataActions(allTemplateHtml);
  templateActions.forEach((action) => {
    it(`main.js has on("${action}") for section templates`, () => {
      expect(registeredHandlers).toContain(action);
    });
  });

  // Every data-action in modal templates needs a handler
  const modalActions = extractDataActions(allModalHtml);
  modalActions.forEach((action) => {
    it(`main.js has on("${action}") for modal templates`, () => {
      expect(registeredHandlers).toContain(action);
    });
  });
});

describe("Wiring: modal lazy-loading", () => {
  // Every modal shell in index.html with data-modal should have a loader
  const modalShells = [...HTML.matchAll(/data-modal="([a-zA-Z]+)"/g)].map((m) => m[1]);

  modalShells.forEach((modalId) => {
    it(`_modalLoaders has entry for data-modal="${modalId}"`, () => {
      expect(modalLoaderKeys).toContain(modalId);
    });
    it(`src/modals/${modalId}.html exists on disk`, () => {
      expect(existsSync(resolve(root, "src", "modals", `${modalId}.html`))).toBe(true);
    });
  });
});

describe("Wiring: embedded sub-sections", () => {
  it("budget mount also mounts expenses sub-section", () => {
    expect(MAIN_JS).toContain('name === "budget"');
    expect(MAIN_JS).toContain("SECTIONS.expenses?.mount");
  });
  it("budget unmount also unmounts expenses sub-section", () => {
    expect(MAIN_JS).toContain('_activeSection === "budget"');
    expect(MAIN_JS).toContain("SECTIONS.expenses?.unmount");
  });
});
