/**
 * tests/unit/sprint5.test.mjs
 *
 * Sprint 5 — S16b async storage wrappers + S22b RTL helpers
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module-level mocks (Vitest hoists these before any imports) ───────────

vi.mock("../../src/core/config.js", () => ({
  STORAGE_PREFIX: "wedding_v1_",
  GOOGLE_CLIENT_ID: "",
  FB_APP_ID: "",
  APPLE_SERVICE_ID: "",
  ADMIN_EMAILS: [],
  PUBLIC_SECTIONS: ["landing", "rsvp"],
}));

vi.mock("../../src/i18n/he.json", () => ({ default: { rtl_test: "בדיקה" } }));
vi.mock("../../src/i18n/en.json", () => ({ default: { rtl_test: "test" } }));
vi.mock("../../src/i18n/ar.json", () => ({ default: { rtl_test: "اختبار" } }));
vi.mock("../../src/i18n/ru.json", () => ({ default: { rtl_test: "тест" } }));

// storage.js module-level mock — fn refs defined before factory so closure
// captures the same references used in tests
const mockStorageGet = vi.fn();
const mockStorageSet = vi.fn();
const mockStorageRemove = vi.fn();

vi.mock("../../src/core/storage.js", () => ({
  storageGet: (...args) => mockStorageGet(...args),
  storageSet: (...args) => mockStorageSet(...args),
  storageRemove: (...args) => mockStorageRemove(...args),
  storageSetBatch: vi.fn(),
  initStorage: vi.fn(),
  storageClear: vi.fn(),
  getAdapterType: vi.fn(() => "indexeddb"),
  migrateFromLocalStorage: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────

import { currentLang, isRTL, textDir, loadLocale } from "../../src/core/i18n.js";
import { loadAsync, saveAsync, removeAsync } from "../../src/core/state.js";

// ── S22b: i18n RTL helpers ────────────────────────────────────────────────

describe("S22b — currentLang / isRTL / textDir", () => {
  it("currentLang() returns Hebrew as default", async () => {
    await loadLocale("he");
    expect(currentLang()).toBe("he");
  });

  it("isRTL() is true for Hebrew", async () => {
    await loadLocale("he");
    expect(isRTL()).toBe(true);
  });

  it("textDir() returns 'rtl' for Hebrew", async () => {
    await loadLocale("he");
    expect(textDir()).toBe("rtl");
  });

  it("isRTL() is true for Arabic", async () => {
    await loadLocale("ar");
    expect(isRTL()).toBe(true);
  });

  it("textDir() returns 'rtl' for Arabic", async () => {
    await loadLocale("ar");
    expect(textDir()).toBe("rtl");
  });

  it("isRTL() is false for English", async () => {
    await loadLocale("en");
    expect(isRTL()).toBe(false);
  });

  it("textDir() returns 'ltr' for English", async () => {
    await loadLocale("en");
    expect(textDir()).toBe("ltr");
  });

  it("isRTL() is false for Russian", async () => {
    await loadLocale("ru");
    expect(isRTL()).toBe(false);
  });

  it("textDir() returns 'ltr' for Russian", async () => {
    await loadLocale("ru");
    expect(textDir()).toBe("ltr");
  });

  it("currentLang() reflects language after switch", async () => {
    await loadLocale("en");
    expect(currentLang()).toBe("en");
    await loadLocale("ar");
    expect(currentLang()).toBe("ar");
  });
});

// ── S16b: async storage wrappers ─────────────────────────────────────────

describe("S16b — loadAsync / saveAsync / removeAsync", () => {
  beforeEach(() => {
    mockStorageGet.mockReset();
    mockStorageSet.mockReset();
    mockStorageRemove.mockReset();
  });

  it("loadAsync returns parsed value from storage", async () => {
    mockStorageGet.mockResolvedValue(JSON.stringify({ name: "Alice" }));
    const val = await loadAsync("guests");
    expect(val).toEqual({ name: "Alice" });
  });

  it("loadAsync returns fallback when storage returns null", async () => {
    mockStorageGet.mockResolvedValue(null);
    const val = await loadAsync("guests", []);
    expect(val).toEqual([]);
  });

  it("loadAsync returns fallback on parse error", async () => {
    mockStorageGet.mockResolvedValue("not-valid-json{{");
    const val = await loadAsync("guests", []);
    expect(Array.isArray(val)).toBe(true);
  });

  it("saveAsync calls storageSet with serialized value", async () => {
    mockStorageSet.mockResolvedValue(undefined);
    await saveAsync("guests", [{ id: "1" }]);
    expect(mockStorageSet).toHaveBeenCalledWith(
      expect.stringContaining("guests"),
      JSON.stringify([{ id: "1" }])
    );
  });

  it("saveAsync falls back to sync save on storageSet error", async () => {
    mockStorageSet.mockRejectedValue(new Error("quota"));
    await expect(saveAsync("guests", [])).resolves.toBeUndefined();
  });

  it("removeAsync calls storageRemove", async () => {
    mockStorageRemove.mockResolvedValue(undefined);
    await removeAsync("guests");
    expect(mockStorageRemove).toHaveBeenCalledWith(
      expect.stringContaining("guests")
    );
  });

  it("removeAsync falls back gracefully on error", async () => {
    mockStorageRemove.mockRejectedValue(new Error("storage error"));
    await expect(removeAsync("guests")).resolves.toBeUndefined();
  });
});
