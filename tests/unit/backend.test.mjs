/**
 * tests/unit/backend.test.mjs — Unit tests for backend.js dispatcher (Sprint 3)
 *
 * Covers: getBackendType (priority/fallback logic) + syncStoreKey routing.
 * The edge-function tests (callEdgeFunction, sendRsvpEmail, etc.) live in edge-functions.test.mjs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module mocks (hoisted) ────────────────────────────────────────────────

vi.mock("../../src/core/config.js", () => ({
  BACKEND_TYPE: "sheets",
  APP_VERSION: "test",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "test-key",
  GAS_URL: "",
  GOOGLE_CLIENT_ID: "",
  FB_APP_ID: "",
  APPLE_SERVICE_ID: "",
  ADMIN_EMAILS: [],
}));

vi.mock("../../src/core/constants.js", () => ({
  STORAGE_KEYS: { SHEETS_MIRROR: "wedding_v1_sheets_mirror" },
}));

const mockLoad = vi.fn((_k, def) => def);
vi.mock("../../src/core/state.js", () => ({
  load: (...args) => mockLoad(...args),
  save: vi.fn(),
  getActiveEventId: () => "default",
}));

vi.mock("../../src/services/sheets.js", () => ({
  syncStoreKeyToSheets: vi.fn(),
  appendToRsvpLog: vi.fn(),
  sheetsCheckConnection: vi.fn(),
  createMissingSheetTabs: vi.fn(),
}));

vi.mock("../../src/services/sheets.js", () => ({
  syncStoreKeyToSheetsImpl: vi.fn(),
  appendToRsvpLogImpl: vi.fn(),
  sheetsCheckConnectionImpl: vi.fn(),
  createMissingSheetTabsImpl: vi.fn(),
  pullAllFromSheetsImpl: vi.fn(),
  pushAllToSheetsImpl: vi.fn(),
}));

vi.mock("../../src/services/supabase.js", () => ({
  syncStoreKeyToSupabase: vi.fn(),
  appendToRsvpLogSupabase: vi.fn(),
  supabaseCheckConnection: vi.fn(),
}));

const { getBackendType } = await import("../../src/services/backend.js");

// ── getBackendType tests ──────────────────────────────────────────────────

describe("getBackendType", () => {
  beforeEach(() => {
    // Reset the mock so load returns "" (the default)
    mockLoad.mockReset();
    mockLoad.mockImplementation((_k, def) => def);
  });

  it("defaults to config BACKEND_TYPE when localStorage is empty", () => {
    // config mock has BACKEND_TYPE="sheets", load returns ""
    expect(getBackendType()).toBe("sheets");
  });

  it('returns "supabase" when localStorage stores "supabase"', () => {
    mockLoad.mockReturnValue("supabase");
    expect(getBackendType()).toBe("supabase");
  });

  it('returns "none" when localStorage stores "none"', () => {
    mockLoad.mockReturnValue("none");
    expect(getBackendType()).toBe("none");
  });

  it('returns "both" when localStorage stores "both"', () => {
    mockLoad.mockReturnValue("both");
    expect(getBackendType()).toBe("both");
  });

  it('returns "sheets" when localStorage stores "sheets"', () => {
    // "sheets" is the fallback, not in the explicit list, returns "sheets"
    mockLoad.mockReturnValue("sheets");
    expect(getBackendType()).toBe("sheets");
  });

  it('returns "sheets" for unknown/invalid stored value', () => {
    mockLoad.mockReturnValue("invalid-value");
    expect(getBackendType()).toBe("sheets");
  });

  it("trims whitespace from stored value before matching", () => {
    mockLoad.mockReturnValue("  supabase  ");
    expect(getBackendType()).toBe("supabase");
  });
});
