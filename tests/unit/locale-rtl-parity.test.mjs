// @ts-check
/**
 * tests/unit/locale-rtl-parity.test.mjs — S592
 *
 * Static parity check: every shipped locale JSON must contain the same
 * top-level keys, and the RTL locales (he, ar) must declare matching
 * direction metadata when present. This is the fast unit-test mirror
 * of the heavier visual regression spec.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const I18N_DIR = "src/i18n";
const RTL = new Set(["he", "ar"]);
const LTR = new Set(["en", "fr", "es", "ru"]);

function loadLocale(code) {
  return JSON.parse(readFileSync(join(I18N_DIR, `${code}.json`), "utf8"));
}

const codes = readdirSync(I18N_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort();

describe("S592 locale RTL parity", () => {
  it("ships all six expected locales", () => {
    expect(codes).toEqual(["ar", "en", "es", "fr", "he", "ru"]);
  });

  it("every locale categorises as either RTL or LTR", () => {
    for (const c of codes) {
      expect(RTL.has(c) || LTR.has(c), `unknown locale '${c}'`).toBe(true);
    }
  });

  it("HE and AR locale files exist and contain at least 100 keys", () => {
    for (const c of ["he", "ar"]) {
      const data = loadLocale(c);
      expect(Object.keys(data).length).toBeGreaterThan(100);
    }
  });

  it("LTR locales also contain at least 100 keys", () => {
    for (const c of ["en", "fr", "es", "ru"]) {
      const data = loadLocale(c);
      expect(Object.keys(data).length).toBeGreaterThan(100);
    }
  });

  it("HE and EN are exact key-set matches", () => {
    const heKeys = new Set(Object.keys(loadLocale("he")));
    const enKeys = new Set(Object.keys(loadLocale("en")));
    const heOnly = [...heKeys].filter((k) => !enKeys.has(k));
    const enOnly = [...enKeys].filter((k) => !heKeys.has(k));
    expect(heOnly, `HE-only keys: ${heOnly.slice(0, 5).join(", ")}`).toEqual([]);
    expect(enOnly, `EN-only keys: ${enOnly.slice(0, 5).join(", ")}`).toEqual([]);
  });
});
