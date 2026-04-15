/**
 * tests/unit/i18n.test.mjs — Unit tests for src/core/i18n.js
 * Covers: t() · loadLocale · currentLang · applyI18n
 *
 * @vitest-environment happy-dom
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { t, loadLocale, currentLang, applyI18n } from "../../src/core/i18n.js";

const SAMPLE_DICT = {
  app_title: "ניהול חתונה",
  btn_save: "שמור",
  btn_cancel: "בטל",
  status_pending: "ממתין",
  status_confirmed: "אישר",
};

beforeEach(async () => {
  // Reset to Hebrew with sample dict before each test
  await loadLocale("he", { ...SAMPLE_DICT });
});

// ── t() ───────────────────────────────────────────────────────────────────
describe("t()", () => {
  it("returns translated string for known key", () => {
    expect(t("app_title")).toBe("ניהול חתונה");
  });

  it("returns fallback when key missing", () => {
    expect(t("unknown_key", "fallback text")).toBe("fallback text");
  });

  it("returns key itself when missing and no fallback", () => {
    expect(t("missing_key")).toBe("missing_key");
  });

  it("returns translated value for btn_save", () => {
    expect(t("btn_save")).toBe("שמור");
  });

  it("handles empty string key gracefully", () => {
    const result = t("");
    expect(typeof result).toBe("string");
  });
});

// ── loadLocale ────────────────────────────────────────────────────────────
describe("loadLocale", () => {
  it("sets language to he with inline dict", async () => {
    await loadLocale("he", { my_key: "ערך" });
    expect(currentLang()).toBe("he");
    expect(t("my_key")).toBe("ערך");
  });

  it("switches language from he to en (mocked fetch)", async () => {
    const enDict = { app_title: "Wedding Manager", btn_save: "Save" };
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => enDict,
    });
    await loadLocale("en");
    expect(currentLang()).toBe("en");
    expect(t("app_title")).toBe("Wedding Manager");
    expect(t("btn_save")).toBe("Save");
  });

  it("uses inline dict if provided even for he", async () => {
    await loadLocale("he", { custom_key: "מפתח מותאם" });
    expect(t("custom_key")).toBe("מפתח מותאם");
  });

  it("falls back to key if fetch dict missing a key", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ only_one: "value" }),
    });
    await loadLocale("en");
    expect(t("missing_in_en")).toBe("missing_in_en");
  });
});

// ── currentLang ───────────────────────────────────────────────────────────
describe("currentLang()", () => {
  it("returns he after Hebrew load", async () => {
    await loadLocale("he", SAMPLE_DICT);
    expect(currentLang()).toBe("he");
  });

  it("returns en after English load", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ title: "Test" }),
    });
    await loadLocale("en");
    expect(currentLang()).toBe("en");
  });
});

// ── applyI18n ─────────────────────────────────────────────────────────────
describe("applyI18n()", () => {
  beforeEach(async () => {
    await loadLocale("he", { ...SAMPLE_DICT });
  });

  it("sets textContent on [data-i18n] elements", () => {
    document.body.innerHTML = '<span data-i18n="btn_save"></span>';
    applyI18n();
    expect(document.querySelector("[data-i18n]")?.textContent).toBe("שמור");
  });

  it("sets placeholder on [data-i18n-placeholder] inputs", () => {
    document.body.innerHTML = '<input data-i18n-placeholder="btn_cancel" />';
    applyI18n();
    const input = /** @type {HTMLInputElement} */ (document.querySelector("input"));
    expect(input?.placeholder).toBe("בטל");
  });

  it("sets title on [data-i18n-title] elements", () => {
    document.body.innerHTML = '<button data-i18n-title="btn_save">X</button>';
    applyI18n();
    const btn = /** @type {HTMLButtonElement} */ (document.querySelector("button"));
    expect(btn?.title).toBe("שמור");
  });

  it("translates multiple elements at once", () => {
    document.body.innerHTML = `
      <span data-i18n="app_title"></span>
      <button data-i18n="btn_cancel"></button>
    `;
    applyI18n();
    const spans = document.querySelectorAll("[data-i18n]");
    expect(spans[0].textContent).toBe("ניהול חתונה");
    expect(spans[1].textContent).toBe("בטל");
  });

  it("handles missing i18n key by using key as text", () => {
    document.body.innerHTML = '<span data-i18n="no_such_key"></span>';
    applyI18n();
    expect(document.querySelector("[data-i18n]")?.textContent).toBe("no_such_key");
  });

  it("scoped to a sub-element only", () => {
    document.body.innerHTML = `
      <div id="scope"><span data-i18n="btn_save"></span></div>
      <span data-i18n="btn_cancel"></span>
    `;
    const scope = /** @type {HTMLElement} */ (document.getElementById("scope"));
    applyI18n(scope);
    expect(document.querySelectorAll("[data-i18n]")[0].textContent).toBe("שמור");
    // Unscoped element should remain untranslated
    expect(document.querySelectorAll("[data-i18n]")[1].textContent).toBe("");
  });
});
