/**
 * tests/unit/config-scopes.test.mjs — Unit tests for config-scopes.js (Sprint 57)
 */

import { describe, it, expect, beforeEach } from "vitest";

// Minimal localStorage stub
const localStorageStub = (() => {
  let store = {};
  return {
    getItem: (k) => Object.hasOwn(store, k) ? store[k] : null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

globalThis.localStorage = localStorageStub;

// Import AFTER setting up localStorage so module initialises cleanly
const {
  getConfig,
  setRuntimeConfig,
  resetRuntimeConfig,
  clearRuntimeConfig,
  getConfigSnapshot,
  listConfigKeys,
} = await import("../../src/core/config-scopes.js");

describe("config-scopes", () => {
  beforeEach(() => {
    localStorageStub.clear();
    // Remove any build-time global injected by previous test
    delete globalThis.__WEDDING_CONFIG__;
  });

  // ── Defaults ────────────────────────────────────────────────────────────

  it("getConfig returns default value for known key", () => {
    expect(getConfig("defaultLang")).toBe("he");
  });

  it("getConfig returns undefined for unknown key", () => {
    expect(getConfig("__bogus__")).toBeUndefined();
  });

  it("listConfigKeys returns non-empty array with known keys", () => {
    const keys = listConfigKeys();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys).toContain("defaultLang");
    expect(keys).toContain("defaultTheme");
    expect(keys).toContain("maxGuestsPerTable");
  });

  // ── Runtime override ─────────────────────────────────────────────────────

  it("setRuntimeConfig persists and getConfig returns override", () => {
    setRuntimeConfig("defaultLang", "en");
    expect(getConfig("defaultLang")).toBe("en");
  });

  it("setRuntimeConfig can override a known default", () => {
    setRuntimeConfig("maxGuestsPerTable", 20);
    expect(getConfig("maxGuestsPerTable")).toBe(20);
  });

  it("resetRuntimeConfig removes override, falls back to default", () => {
    setRuntimeConfig("defaultLang", "ar");
    expect(getConfig("defaultLang")).toBe("ar");
    resetRuntimeConfig("defaultLang");
    expect(getConfig("defaultLang")).toBe("he");
  });

  it("clearRuntimeConfig removes all overrides", () => {
    setRuntimeConfig("defaultLang", "ru");
    setRuntimeConfig("defaultTheme", "gold");
    clearRuntimeConfig();
    expect(getConfig("defaultLang")).toBe("he");
    expect(getConfig("defaultTheme")).toBe("default");
  });

  // ── Build (window.__WEDDING_CONFIG__) layer ──────────────────────────────

  it("getConfig reads from __WEDDING_CONFIG__ before defaults", () => {
    globalThis.__WEDDING_CONFIG__ = { defaultTheme: "emerald" };
    expect(getConfig("defaultTheme")).toBe("emerald");
    delete globalThis.__WEDDING_CONFIG__;
  });

  it("runtime overrides __WEDDING_CONFIG__", () => {
    globalThis.__WEDDING_CONFIG__ = { defaultTheme: "gold" };
    setRuntimeConfig("defaultTheme", "royal");
    expect(getConfig("defaultTheme")).toBe("royal");
    delete globalThis.__WEDDING_CONFIG__;
  });

  // ── getConfigSnapshot ─────────────────────────────────────────────────────

  it("getConfigSnapshot returns merged object", () => {
    setRuntimeConfig("defaultLang", "en");
    const snap = getConfigSnapshot();
    expect(snap.defaultLang).toBe("en");
    expect(typeof snap.maxGuestsPerTable).toBe("number");
  });

  it("getConfigSnapshot includes all default keys", () => {
    const snap = getConfigSnapshot();
    for (const k of listConfigKeys()) {
      expect(Object.hasOwn(snap, k), `snapshot missing ${k}`).toBe(true);
    }
  });
});
