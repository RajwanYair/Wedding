/**
 * tests/unit/app-config.test.mjs — S350: core/app-config.js helpers
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock config.js constants ──────────────────────────────────────────────

vi.mock("../../src/core/config.js", () => ({
  ADMIN_EMAILS: ["admin@test.com"],
  BACKEND_TYPE: "sheets",
  SHEETS_WEBAPP_URL: "https://script.google.com/build-url",
  SPREADSHEET_ID: "build-spreadsheet-id",
  SUPABASE_URL: "https://build.supabase.co",
  SUPABASE_ANON_KEY: "build-anon-key",
}));

// ── Mock state.js load() ──────────────────────────────────────────────────

const _storeState = new Map();

vi.mock("../../src/core/state.js", () => ({
  load: vi.fn((key, defaultVal) => _storeState.get(key) ?? defaultVal),
  save: vi.fn(),
}));

import {
  getSheetsWebAppUrl,
  getSpreadsheetId,
  getSupabaseUrl,
  getSupabaseAnonKey,
  getBackendTypeConfig,
  getApprovedAdminEmails,
} from "../../src/core/app-config.js";

beforeEach(() => {
  _storeState.clear();
  vi.clearAllMocks();
});

// ── getSheetsWebAppUrl ─────────────────────────────────────────────────────

describe("getSheetsWebAppUrl", () => {
  it("returns build-time URL when no stored value", () => {
    expect(getSheetsWebAppUrl()).toBe("https://script.google.com/build-url");
  });

  it("prefers stored value over build-time URL", () => {
    _storeState.set("sheetsWebAppUrl", "https://runtime.google.com/url");
    expect(getSheetsWebAppUrl()).toBe("https://runtime.google.com/url");
  });

  it("falls back to build URL when stored value is empty", () => {
    _storeState.set("sheetsWebAppUrl", "");
    expect(getSheetsWebAppUrl()).toBe("https://script.google.com/build-url");
  });
});

// ── getSpreadsheetId ──────────────────────────────────────────────────────

describe("getSpreadsheetId", () => {
  it("returns build-time ID when no stored value", () => {
    expect(getSpreadsheetId()).toBe("build-spreadsheet-id");
  });

  it("prefers stored ID over build-time ID", () => {
    _storeState.set("sheetsSpreadsheetId", "runtime-spreadsheet-id");
    expect(getSpreadsheetId()).toBe("runtime-spreadsheet-id");
  });
});

// ── getSupabaseUrl ────────────────────────────────────────────────────────

describe("getSupabaseUrl", () => {
  it("returns build-time URL when no stored value", () => {
    expect(getSupabaseUrl()).toBe("https://build.supabase.co");
  });

  it("prefers stored URL over build URL", () => {
    _storeState.set("supabaseUrl", "https://runtime.supabase.co");
    expect(getSupabaseUrl()).toBe("https://runtime.supabase.co");
  });
});

// ── getSupabaseAnonKey ────────────────────────────────────────────────────

describe("getSupabaseAnonKey", () => {
  it("returns build-time key when no stored value", () => {
    expect(getSupabaseAnonKey()).toBe("build-anon-key");
  });

  it("prefers stored key over build key", () => {
    _storeState.set("supabaseAnonKey", "runtime-anon-key");
    expect(getSupabaseAnonKey()).toBe("runtime-anon-key");
  });
});

// ── getBackendTypeConfig ──────────────────────────────────────────────────

describe("getBackendTypeConfig", () => {
  it("returns 'sheets' as default", () => {
    expect(getBackendTypeConfig()).toBe("sheets");
  });

  it("returns 'supabase' when stored", () => {
    _storeState.set("backendType", "supabase");
    expect(getBackendTypeConfig()).toBe("supabase");
  });

  it("returns 'both' when stored", () => {
    _storeState.set("backendType", "both");
    expect(getBackendTypeConfig()).toBe("both");
  });

  it("returns 'none' when stored", () => {
    _storeState.set("backendType", "none");
    expect(getBackendTypeConfig()).toBe("none");
  });

  it("normalizes unknown values to 'sheets'", () => {
    _storeState.set("backendType", "unknown-backend");
    expect(getBackendTypeConfig()).toBe("sheets");
  });
});

// ── getApprovedAdminEmails ────────────────────────────────────────────────

describe("getApprovedAdminEmails", () => {
  it("includes build-time emails", () => {
    const emails = getApprovedAdminEmails();
    expect(emails).toContain("admin@test.com");
  });

  it("includes runtime emails from store", () => {
    _storeState.set("approvedEmails", ["runtime@test.com"]);
    const emails = getApprovedAdminEmails();
    expect(emails).toContain("runtime@test.com");
  });

  it("deduplicates emails", () => {
    _storeState.set("approvedEmails", ["admin@test.com"]);
    const emails = getApprovedAdminEmails();
    const count = emails.filter((e) => e === "admin@test.com").length;
    expect(count).toBe(1);
  });

  it("normalizes emails to lowercase", () => {
    _storeState.set("approvedEmails", ["UPPER@TEST.COM"]);
    const emails = getApprovedAdminEmails();
    expect(emails).toContain("upper@test.com");
  });

  it("filters out empty entries", () => {
    _storeState.set("approvedEmails", ["", " ", "valid@test.com"]);
    const emails = getApprovedAdminEmails();
    expect(emails).not.toContain("");
    expect(emails).not.toContain(" ");
  });
});
