/**
 * tests/unit/config.test.mjs — Unit tests for src/core/config.js
 * Covers: exported constants, types, and values (S6.2)
 *
 * Run: npm test
 */

import { describe, it, expect } from "vitest";
import {
  APP_VERSION,
  STORAGE_PREFIX,
  SHEETS_WEBAPP_URL,
  SHEETS_GUESTS_TAB,
  SHEETS_TABLES_TAB,
  SHEETS_CONFIG_TAB,
  SHEETS_VENDORS_TAB,
  SHEETS_EXPENSES_TAB,
  SHEETS_RSVP_LOG_TAB,
  GOOGLE_CLIENT_ID,
  FB_APP_ID,
  APPLE_SERVICE_ID,
  ADMIN_EMAILS,
  AUTH_SESSION_DURATION_MS,
  TOAST_DURATION_MS,
  DEBOUNCE_MS,
  GUEST_STATUSES,
  MEAL_TYPES,
} from "../../src/core/config.js";

// ── Version ──────────────────────────────────────────────────────────────
describe("APP_VERSION", () => {
  it("is a non-empty string", () => {
    expect(typeof APP_VERSION).toBe("string");
    expect(APP_VERSION.length).toBeGreaterThan(0);
  });

  it("follows semver format X.Y.Z", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

// ── Storage ───────────────────────────────────────────────────────────────
describe("STORAGE_PREFIX", () => {
  it("is wedding_v1_", () => {
    expect(STORAGE_PREFIX).toBe("wedding_v1_");
  });
});

// ── Sheets tabs ───────────────────────────────────────────────────────────
describe("Sheets tab names", () => {
  it("SHEETS_GUESTS_TAB is a non-empty string", () => {
    expect(typeof SHEETS_GUESTS_TAB).toBe("string");
    expect(SHEETS_GUESTS_TAB.length).toBeGreaterThan(0);
  });

  it("SHEETS_TABLES_TAB is a non-empty string", () => {
    expect(typeof SHEETS_TABLES_TAB).toBe("string");
    expect(SHEETS_TABLES_TAB.length).toBeGreaterThan(0);
  });

  it("SHEETS_VENDORS_TAB is a non-empty string", () => {
    expect(typeof SHEETS_VENDORS_TAB).toBe("string");
    expect(SHEETS_VENDORS_TAB.length).toBeGreaterThan(0);
  });

  it("SHEETS_EXPENSES_TAB is a non-empty string", () => {
    expect(typeof SHEETS_EXPENSES_TAB).toBe("string");
    expect(SHEETS_EXPENSES_TAB.length).toBeGreaterThan(0);
  });

  it("SHEETS_RSVP_LOG_TAB is a non-empty string", () => {
    expect(typeof SHEETS_RSVP_LOG_TAB).toBe("string");
    expect(SHEETS_RSVP_LOG_TAB.length).toBeGreaterThan(0);
  });

  it("SHEETS_CONFIG_TAB is a non-empty string", () => {
    expect(typeof SHEETS_CONFIG_TAB).toBe("string");
    expect(SHEETS_CONFIG_TAB.length).toBeGreaterThan(0);
  });
});

// ── Auth credentials structure ────────────────────────────────────────────
describe("Auth credentials", () => {
  it("GOOGLE_CLIENT_ID is a string", () => {
    expect(typeof GOOGLE_CLIENT_ID).toBe("string");
  });

  it("FB_APP_ID is a string", () => {
    expect(typeof FB_APP_ID).toBe("string");
  });

  it("APPLE_SERVICE_ID is a string", () => {
    expect(typeof APPLE_SERVICE_ID).toBe("string");
  });

  it("ADMIN_EMAILS is an array", () => {
    expect(Array.isArray(ADMIN_EMAILS)).toBe(true);
  });

  it("SHEETS_WEBAPP_URL is a string", () => {
    expect(typeof SHEETS_WEBAPP_URL).toBe("string");
  });
});

// ── Session duration ─────────────────────────────────────────────────────
describe("AUTH_SESSION_DURATION_MS", () => {
  it("equals exactly 2 hours in milliseconds", () => {
    expect(AUTH_SESSION_DURATION_MS).toBe(2 * 60 * 60 * 1000);
  });

  it("is a positive number", () => {
    expect(AUTH_SESSION_DURATION_MS).toBeGreaterThan(0);
  });
});

// ── UI timing ────────────────────────────────────────────────────────────
describe("UI timing constants", () => {
  it("TOAST_DURATION_MS is a positive number", () => {
    expect(typeof TOAST_DURATION_MS).toBe("number");
    expect(TOAST_DURATION_MS).toBeGreaterThan(0);
  });

  it("DEBOUNCE_MS is a positive number", () => {
    expect(typeof DEBOUNCE_MS).toBe("number");
    expect(DEBOUNCE_MS).toBeGreaterThan(0);
  });
});

// ── Guest data types ──────────────────────────────────────────────────────
describe("GUEST_STATUSES", () => {
  it("contains pending, confirmed, declined, maybe", () => {
    expect(GUEST_STATUSES).toContain("pending");
    expect(GUEST_STATUSES).toContain("confirmed");
    expect(GUEST_STATUSES).toContain("declined");
    expect(GUEST_STATUSES).toContain("maybe");
  });

  it("has exactly 4 statuses", () => {
    expect(GUEST_STATUSES.length).toBe(4);
  });
});

describe("MEAL_TYPES", () => {
  it("contains regular and vegetarian", () => {
    expect(MEAL_TYPES).toContain("regular");
    expect(MEAL_TYPES).toContain("vegetarian");
  });

  it("contains vegan, gluten_free, kosher", () => {
    expect(MEAL_TYPES).toContain("vegan");
    expect(MEAL_TYPES).toContain("gluten_free");
    expect(MEAL_TYPES).toContain("kosher");
  });
});
