/**
 * tests/unit/i18n.test.mjs — Unit tests for src/core/i18n.js
 * Covers: t() · loadLocale · currentLang · applyI18n
 *
 * @vitest-environment happy-dom
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { t, loadLocale, currentLang, applyI18n, formatMessage } from "../../src/core/i18n.js";

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

// ── formatMessage / ICU plurals (F3.2.3) ──────────────────────────────────
describe("formatMessage()", () => {
  it("does simple interpolation", () => {
    expect(formatMessage("Hello, {name}!", { name: "Yair" })).toBe("Hello, Yair!");
  });

  it("leaves unresolved tokens as-is", () => {
    expect(formatMessage("{greeting}, {name}!", { name: "A" })).toBe("{greeting}, A!");
  });

  it("returns empty string for null template", () => {
    expect(formatMessage(null, { a: 1 })).toBe("");
  });

  it("returns template unchanged when no params", () => {
    expect(formatMessage("hello", null)).toBe("hello");
  });
});

describe("ICU plural via t()", () => {
  beforeEach(async () => {
    await loadLocale("en", {
      guest_count: "{count, plural, one {# guest} other {# guests}}",
      item_count: "{count, plural, =0 {no items} one {# item} other {# items}}",
      simple_key: "Hello, {name}!",
    });
  });

  it("resolves plural one", () => {
    expect(t("guest_count", { count: 1 })).toBe("1 guest");
  });

  it("resolves plural other", () => {
    expect(t("guest_count", { count: 5 })).toBe("5 guests");
  });

  it("resolves plural zero via other", () => {
    expect(t("guest_count", { count: 0 })).toBe("0 guests");
  });

  it("resolves plural exact =0", () => {
    expect(t("item_count", { count: 0 })).toBe("no items");
  });

  it("resolves plural one with exact match available", () => {
    expect(t("item_count", { count: 1 })).toBe("1 item");
  });

  it("resolves plural other with large number", () => {
    expect(t("item_count", { count: 42 })).toBe("42 items");
  });

  it("does simple interpolation via t()", () => {
    expect(t("simple_key", { name: "Yair" })).toBe("Hello, Yair!");
  });

  it("backward compat: t(key, stringFallback) still works", () => {
    expect(t("unknown", "fallback")).toBe("fallback");
  });

  it("backward compat: t(key) still returns key", () => {
    expect(t("missing_key")).toBe("missing_key");
  });
});
