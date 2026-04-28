/**
 * tests/unit/es-locale.test.mjs — S137 ES locale scaffold validation.
 * Verifies es.json has the correct shape, key parity with en.json, and
 * that known core translations are present and non-empty.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  localeCoverage,
  missingTranslations,
  validateLocaleShape,
} from "../../src/utils/locale-bootstrap.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "../../src/i18n");

const en = JSON.parse(readFileSync(resolve(root, "en.json"), "utf8"));
const es = JSON.parse(readFileSync(resolve(root, "es.json"), "utf8"));

describe("S137 — ES locale scaffold", () => {
  it("es.json has the same keys as en.json (no missing, no extra)", () => {
    const { ok, missingKeys, extraKeys } = validateLocaleShape(es, en);
    expect(missingKeys).toEqual([]);
    expect(extraKeys).toEqual([]);
    expect(ok).toBe(true);
  });

  it("es.json has at least 70 translated keys", () => {
    const { translated } = localeCoverage(es);
    expect(translated).toBeGreaterThanOrEqual(70);
  });

  it("core nav keys are translated in ES", () => {
    const navKeys = [
      "nav_dashboard",
      "nav_guests",
      "nav_tables",
      "nav_settings",
    ];
    for (const k of navKeys) {
      expect(es[k], `${k} should be translated`).toBeTruthy();
    }
  });

  it("core button keys are translated in ES", () => {
    const btnKeys = ["btn_save", "btn_cancel", "btn_delete", "btn_edit"];
    for (const k of btnKeys) {
      expect(es[k], `${k} should be translated`).toBeTruthy();
    }
  });

  it("app_title is translated in ES", () => {
    expect(es.app_title).toBe("Gestor de Boda");
  });

  it("missingTranslations returns untranslated keys sorted", () => {
    const missing = missingTranslations(es, en);
    // should be many untranslated keys (scaffold), and sorted
    expect(missing.length).toBeGreaterThan(100);
    expect(missing).toEqual([...missing].sort());
  });

  it("all values are strings (no nulls or non-string)", () => {
    for (const [k, v] of Object.entries(es)) {
      expect(typeof v, `key ${k} should be string`).toBe("string");
    }
  });
});
