/**
 * tests/unit/locale-bootstrap.test.mjs — S135 locale scaffold helpers.
 */
import { describe, it, expect } from "vitest";
import {
  createLocaleScaffold,
  localeCoverage,
  missingTranslations,
  validateLocaleShape,
} from "../../src/utils/locale-bootstrap.js";

const EN = {
  app_title: "Wedding Manager",
  nav_guests: "Guests",
  nav_tables: "Tables",
  btn_save: "Save",
  btn_cancel: "Cancel",
};

describe("S135 — locale-bootstrap", () => {
  it("createLocaleScaffold fills missing keys with empty strings", () => {
    const partial = { app_title: "Gestionnaire de Mariage", nav_guests: "Invités" };
    const out = createLocaleScaffold(EN, partial);
    expect(out.app_title).toBe("Gestionnaire de Mariage");
    expect(out.nav_guests).toBe("Invités");
    expect(out.nav_tables).toBe("");
    expect(out.btn_save).toBe("");
    expect(Object.keys(out)).toHaveLength(5);
  });

  it("createLocaleScaffold drops keys not in base (forward-compat)", () => {
    const partial = { app_title: "X", future_key: "Y" };
    const out = createLocaleScaffold(EN, partial);
    expect(out).not.toHaveProperty("future_key");
  });

  it("createLocaleScaffold with empty partial yields all-empty scaffold", () => {
    const out = createLocaleScaffold(EN, {});
    expect(Object.values(out).every((v) => v === "")).toBe(true);
  });

  it("localeCoverage calculates percentage correctly", () => {
    const locale = { a: "bonjour", b: "", c: "monde", d: "   " };
    const cov = localeCoverage(locale);
    expect(cov.total).toBe(4);
    expect(cov.translated).toBe(2);
    expect(cov.missing).toBe(2);
    expect(cov.pct).toBeCloseTo(0.5);
  });

  it("missingTranslations returns sorted list of untranslated keys", () => {
    const locale = { app_title: "Gestionnaire de Mariage", nav_guests: "", btn_save: "" };
    const missing = missingTranslations(locale, EN);
    expect(missing).toEqual(["btn_cancel", "btn_save", "nav_guests", "nav_tables"]);
  });

  it("validateLocaleShape detects missing and extra keys", () => {
    const locale = { app_title: "x", nav_guests: "y", bonus_key: "z" };
    const r = validateLocaleShape(locale, EN);
    expect(r.ok).toBe(false);
    expect(r.missingKeys).toEqual(["btn_cancel", "btn_save", "nav_tables"]);
    expect(r.extraKeys).toEqual(["bonus_key"]);
  });

  it("validateLocaleShape ok when keys match exactly", () => {
    const scaffold = createLocaleScaffold(EN, {});
    expect(validateLocaleShape(scaffold, EN).ok).toBe(true);
  });
});
