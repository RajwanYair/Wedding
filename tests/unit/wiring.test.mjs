/**
 * tests/unit/wiring.test.mjs — Cross-reference consistency tests
 *
 * Ensures that sections are properly wired across all layers:
 *   1. src/core/template-loader.js  (_loaders map)
 *   2. src/core/nav.js              (_sections array)
 *   3. src/main.js                  (SECTIONS map)
 *      src/core/constants.js        (PUBLIC_SECTIONS)
 *   4. src/sections/index.js        (barrel exports)
 *   5. index.html                   (section containers + data-template + nav tabs)
 *   6. src/templates/*.html          (template files exist on disk)
 *   7. src/services/sheets-impl.js  (_SHEET_NAMES + _COL_ORDER)
 *   8. src/i18n/he.json + en.json  (i18n keys for nav)
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
const SECTION_RESOLVER_JS = readFileSync(resolve(root, "src", "core", "section-resolver.js"), "utf8");
const UI_JS = readFileSync(resolve(root, "src", "core", "ui.js"), "utf8");
const BARREL = readFileSync(resolve(root, "src", "sections", "index.js"), "utf8");
const SHEETS_IMPL = readFileSync(resolve(root, "src", "services", "sheets-impl.js"), "utf8");
const CONSTANTS_JS = readFileSync(resolve(root, "src", "core", "constants.js"), "utf8");
const I18N_HE = JSON.parse(readFileSync(resolve(root, "src", "i18n", "he.json"), "utf8"));
const I18N_EN = JSON.parse(readFileSync(resolve(root, "src", "i18n", "en.json"), "utf8"));

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

/** Extract all section names from import.meta.glob or SECTIONS map in main.js / section-resolver.js */
function extractSectionsMap() {
  // New: import.meta.glob in section-resolver.js  — enumerate section files on disk
  const sectionSrc = SECTION_RESOLVER_JS.includes("import.meta.glob") ? SECTION_RESOLVER_JS : MAIN_JS;
  if (sectionSrc.includes("import.meta.glob")) {
    // Also apply aliases defined in _SECTION_ALIASES
    const aliasBlock = sectionSrc.match(/_SECTION_ALIASES\s*=\s*\{([\s\S]*?)\}/);
    const aliases = {};
    if (aliasBlock) {
      for (const m of aliasBlock[1].matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)) {
        aliases[m[1]] = m[2];
      }
    }
    const sectionsDir = resolve(root, "src", "sections");
    return readdirSync(sectionsDir)
      .filter((f) => f.endsWith(".js") && f !== "index.js")
      .map((f) => {
        const raw = f.replace(".js", "");
        return aliases[raw] ?? raw;
      });
  }
  // Legacy: const SECTIONS = { ... };
  const block = MAIN_JS.match(/const SECTIONS\s*=\s*\{([\s\S]*?)\};/);
  if (!block) return [];
  return [...block[1].matchAll(/["']?([a-z][-a-z]*)["']?\s*:/g)].map((m) => m[1]);
}

/** Extract PUBLIC_SECTIONS from the canonical constants module. */
function extractPublicSections() {
  const constBlock = CONSTANTS_JS.match(
    /PUBLIC_SECTIONS\s*=\s*new Set\(\[([\s\S]*?)\]\)/,
  );
  if (constBlock) {
    return [...constBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  }
  return [];
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

function formatList(items) {
  return items.slice(0, 10).join(", ");
}

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

  it("covers every data-template used in HTML", () => {
    const missing = extractDataTemplates().filter(
      (name) => !loaderKeys.includes(name),
    );
    expect(
      missing,
      `Missing template loaders for: ${formatList(missing)}`,
    ).toEqual([]);
  });

  it("has a template file on disk for every loader", () => {
    const missing = loaderKeys.filter(
      (name) => !existsSync(resolve(root, "src", "templates", `${name}.html`)),
    );
    expect(
      missing,
      `Missing template files for: ${formatList(missing)}`,
    ).toEqual([]);
  });
});

describe("Wiring: index.html section containers", () => {
  it("has a container for every nav section", () => {
    const missing = navSections.filter(
      (name) => !htmlContainers.includes(name),
    );
    expect(
      missing,
      `Missing nav containers for: ${formatList(missing)}`,
    ).toEqual([]);
  });

  it("has a container for every top-level section", () => {
    const missing = sectionsMap
      .filter((name) => !EMBEDDED_SECTIONS.has(name))
      .filter((name) => !htmlContainers.includes(name));
    expect(
      missing,
      `Missing section containers for: ${formatList(missing)}`,
    ).toEqual([]);
  });

  it("registers a loader for every data-template container", () => {
    const missing = dataTemplates.filter((name) => !loaderKeys.includes(name));
    expect(
      missing,
      `Missing data-template registrations for: ${formatList(missing)}`,
    ).toEqual([]);
  });
});

describe("Wiring: SECTIONS map (main.js)", () => {
  it("SECTIONS map has at least 18 entries", () => {
    expect(sectionsMap.length).toBeGreaterThanOrEqual(18);
  });

  it("contains every nav section", () => {
    const missing = navSections.filter((name) => !sectionsMap.includes(name));
    expect(
      missing,
      `Missing nav sections in section map: ${formatList(missing)}`,
    ).toEqual([]);
  });

  it("has a section module for every section entry", () => {
    const missing = sectionsMap.filter((name) => {
      const fileName =
        name === "contact-form" ? "contact-collector.js" : `${name}.js`;
      return !existsSync(resolve(root, "src", "sections", fileName));
    });
    expect(
      missing,
      `Missing section modules for: ${formatList(missing)}`,
    ).toEqual([]);
  });
});

describe("Wiring: barrel exports (src/sections/index.js)", () => {
  // With import.meta.glob (in main.js or section-resolver.js), verify barrel has an export for each section file
  if (MAIN_JS.includes("import.meta.glob") || SECTION_RESOLVER_JS.includes("import.meta.glob")) {
    const sectionsDir = resolve(root, "src", "sections");
    const sectionFiles = readdirSync(sectionsDir)
      .filter((f) => f.endsWith(".js") && f !== "index.js");

    it("barrel references every section file", () => {
      const missing = sectionFiles.filter(
        (fileName) => !BARREL.includes(fileName.replace(".js", "")),
      );
      expect(
        missing,
        `Missing barrel references for: ${formatList(missing)}`,
      ).toEqual([]);
    });
  } else {
    // Legacy: check each import * as xxxSection from "./sections/"
    const importedModules = [...MAIN_JS.matchAll(/import \* as (\w+Section) from "\.\/sections\//g)]
      .map((m) => m[1]);

    it("barrel exports every imported section module", () => {
      const missing = importedModules.filter(
        (modName) => !BARREL.includes(modName),
      );
      expect(
        missing,
        `Missing barrel exports for: ${formatList(missing)}`,
      ).toEqual([]);
    });
  }
});

describe("Wiring: nav sections consistency", () => {
  it("_sections array has at least 14 entries", () => {
    expect(navSections.length).toBeGreaterThanOrEqual(14);
  });

  it("has a nav tab for every nav section", () => {
    const missing = navSections.filter((name) => !navTabs.includes(name));
    expect(missing, `Missing nav tabs for: ${formatList(missing)}`).toEqual([]);
  });
});

describe("Wiring: PUBLIC_SECTIONS are valid", () => {
  it("keeps PUBLIC_SECTIONS inside the section map", () => {
    const missing = publicSections.filter(
      (name) => !sectionsMap.includes(name),
    );
    expect(
      missing,
      `Invalid public sections in section map: ${formatList(missing)}`,
    ).toEqual([]);
  });

  it("has HTML containers for every public section", () => {
    const missing = publicSections.filter(
      (name) => !htmlContainers.includes(name),
    );
    expect(
      missing,
      `Missing public section containers for: ${formatList(missing)}`,
    ).toEqual([]);
  });
});

describe("Wiring: i18n keys for nav sections", () => {
  it("has Hebrew i18n keys for every nav section", () => {
    const missing = navSections
      .map((name) => `nav_${name.replace(/-/g, "_")}`)
      .filter((key) => !(key in I18N_HE));
    expect(missing, `Missing he nav keys: ${formatList(missing)}`).toEqual([]);
  });

  it("has English i18n keys for every nav section", () => {
    const missing = navSections
      .map((name) => `nav_${name.replace(/-/g, "_")}`)
      .filter((key) => !(key in I18N_EN));
    expect(missing, `Missing en nav keys: ${formatList(missing)}`).toEqual([]);
  });
});

describe("Wiring: Sheets sync completeness", () => {
  // Every _SHEET_NAMES key (except _MAP_KEYS entries) must have _COL_ORDER
  const mapKeySet = new Set(mapKeys);
  const arraySheets = sheetNameKeys.filter((k) => !mapKeySet.has(k));

  it("defines column order for every array-backed sheet", () => {
    const missing = arraySheets.filter((key) => !colOrderKeys.includes(key));
    expect(
      missing,
      `Missing _COL_ORDER entries for: ${formatList(missing)}`,
    ).toEqual([]);
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

  const sheetValues = [...SHEETS_IMPL.matchAll(/:\s*"([A-Z][a-z_]+)"/g)].map((m) => m[1]);

  it("keeps GAS ALLOWED_SHEETS aligned with runtime sheet names", () => {
    const missing = sheetValues.filter(
      (tabName) => !allowedSheets.includes(tabName),
    );
    expect(
      missing,
      `Missing GAS allowed sheets for: ${formatList(missing)}`,
    ).toEqual([]);
  });

  // RSVP_Log is append-only, not in _SHEET_NAMES but must be in GAS
  it('GAS ALLOWED_SHEETS includes "RSVP_Log"', () => {
    expect(allowedSheets).toContain("RSVP_Log");
  });
});

describe("Wiring: no orphaned templates", () => {
  const templateFiles = readdirSync(resolve(root, "src", "templates"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(".html", ""));

  it("registers every template file in the loader map", () => {
    const missing = templateFiles.filter((name) => !loaderKeys.includes(name));
    expect(
      missing,
      `Orphaned template files without loaders: ${formatList(missing)}`,
    ).toEqual([]);
  });

  it("has a matching HTML container for every template file", () => {
    const missing = templateFiles.filter(
      (name) => !htmlContainers.includes(name),
    );
    expect(
      missing,
      `Template files missing containers: ${formatList(missing)}`,
    ).toEqual([]);
  });
});

// ── Extract additional data ───────────────────────────────────────────────────

/** Extract all unique data-action values from a source string */
function extractDataActions(src) {
  return [...new Set([...src.matchAll(/data-action="([a-zA-Z]+)"/g)].map((m) => m[1]))];
}

/** Read all handler files from src/handlers/ (if any) */
const handlersDir = resolve(root, "src", "handlers");
const HANDLER_FILES = existsSync(handlersDir)
  ? readdirSync(handlersDir)
      .filter((f) => f.endsWith(".js"))
      .map((f) => readFileSync(resolve(handlersDir, f), "utf8"))
      .join("\n")
  : "";

/** Extract all on("X", ...) handler registrations from main.js + handler files */
function extractHandlers() {
  const combined = `${MAIN_JS}\n${HANDLER_FILES}`;
  return [...new Set([...combined.matchAll(/on\("([a-zA-Z]+)"/g)].map((m) => m[1]))];
}

/** Extract modal loader keys from ui.js — supports both glob-based Map and object literal */
function extractModalLoaderKeys() {
  // New: import.meta.glob("../modals/*.html") → filenames auto-discovered
  if (UI_JS.includes('import.meta.glob("../modals/')) {
    return readdirSync(resolve(root, "src", "modals"))
      .filter((f) => f.endsWith(".html"))
      .map((f) => f.replace(/\.html$/, ""));
  }
  // Legacy: object literal _modalLoaders = { guestModal: ... }
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
  const htmlActions = extractDataActions(HTML);

  it("registers handlers for index.html actions", () => {
    const missing = htmlActions.filter(
      (action) => !registeredHandlers.includes(action),
    );
    expect(
      missing,
      `Missing shell action handlers for: ${formatList(missing)}`,
    ).toEqual([]);
  });

  const templateActions = extractDataActions(allTemplateHtml);

  it("registers handlers for section template actions", () => {
    const missing = templateActions.filter(
      (action) => !registeredHandlers.includes(action),
    );
    expect(
      missing,
      `Missing section action handlers for: ${formatList(missing)}`,
    ).toEqual([]);
  });

  const modalActions = extractDataActions(allModalHtml);

  it("registers handlers for modal actions", () => {
    const missing = modalActions.filter(
      (action) => !registeredHandlers.includes(action),
    );
    expect(
      missing,
      `Missing modal action handlers for: ${formatList(missing)}`,
    ).toEqual([]);
  });
});

describe("Wiring: modal lazy-loading", () => {
  const modalShells = [...HTML.matchAll(/data-modal="([a-zA-Z]+)"/g)].map(
    (m) => m[1],
  );

  it("registers modal loaders for every shell", () => {
    const missing = modalShells.filter(
      (modalId) => !modalLoaderKeys.includes(modalId),
    );
    expect(
      missing,
      `Missing modal loaders for: ${formatList(missing)}`,
    ).toEqual([]);
  });

  it("has modal HTML files for every shell", () => {
    const missing = modalShells.filter(
      (modalId) =>
        !existsSync(resolve(root, "src", "modals", `${modalId}.html`)),
    );
    expect(
      missing,
      `Missing modal HTML files for: ${formatList(missing)}`,
    ).toEqual([]);
  });
});

describe("Wiring: embedded sub-sections", () => {
  // Budget logic may live in main.js or section-resolver.js
  const budgetSrc = `${MAIN_JS}\n${SECTION_RESOLVER_JS}`;
  it("budget mount also mounts expenses sub-section", () => {
    expect(
      budgetSrc.includes('name === "budget"') || budgetSrc.includes("budget"),
    ).toBe(true);
    expect(
      budgetSrc.includes("SECTIONS.expenses?.mount") ||
        budgetSrc.includes('_resolveSection("expenses")') ||
        budgetSrc.includes('resolveSection("expenses")'),
    ).toBe(true);
  });
  it("budget unmount also unmounts expenses sub-section", () => {
    expect(
      budgetSrc.includes('_activeSection === "budget"') ||
        budgetSrc.includes('name === "budget"'),
    ).toBe(true);
    expect(
      budgetSrc.includes("SECTIONS.expenses?.unmount") ||
        budgetSrc.includes('_loadedSections.get("expenses")') ||
        budgetSrc.includes('resolveSection("expenses")'),
    ).toBe(true);
  });
});
