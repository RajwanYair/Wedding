/**
 * tests/unit/edge-functions.test.mjs
 * Unit tests for Supabase Edge Function client helpers in backend.js.
 * Tests: callEdgeFunction, checkEdgeHealth, sendRsvpEmail
 */

import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";

// ── Module setup ──────────────────────────────────────────────────────────

vi.mock("../../src/core/config.js", () => ({
  BACKEND_TYPE: "supabase",
  APP_VERSION: "6.0.0",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  GAS_URL: "",
  GOOGLE_CLIENT_ID: "",
  FB_APP_ID: "",
  APPLE_SERVICE_ID: "",
  ADMIN_EMAILS: [],
}));

vi.mock("../../src/core/state.js", () => ({
  load: (_key, def) => def,
  save: vi.fn(),
  getActiveEventId: () => "default",
}));

// Mock sheets modules to avoid circular imports in backend.js
vi.mock("../../src/services/sheets.js", () => ({
  syncStoreKeyToSheets: vi.fn(),
  appendToRsvpLog: vi.fn(),
  sheetsCheckConnection: vi.fn(),
  createMissingSheetTabs: vi.fn(),
}));

vi.mock("../../src/services/sheets-impl.js", () => ({
  pullAllFromSheetsImpl: vi.fn(),
  pushAllToSheetsImpl: vi.fn(),
}));

vi.mock("../../src/services/supabase.js", () => ({
  syncStoreKeyToSupabase: vi.fn(),
  appendToRsvpLogSupabase: vi.fn(),
  supabaseCheckConnection: vi.fn(),
}));

const {
  callEdgeFunction,
  checkEdgeHealth,
  sendRsvpEmail,
  syncToSheetsEdge,
  isSheetsMirrorEnabled,
} = await import("../../src/services/backend.js");

// ── Tests ─────────────────────────────────────────────────────────────────

describe("callEdgeFunction", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ok:true with data on successful GET", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok", version: "6.0.0" }),
    });
    const result = await callEdgeFunction("health");
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://test.supabase.co/functions/v1/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("sends POST with body when body arg is provided", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, sent: true }),
    });
    const result = await callEdgeFunction("rsvp-email", {
      guestEmail: "test@example.com",
      guestName: "Test",
      status: "confirmed",
    });
    expect(result.ok).toBe(true);
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toMatchObject({ guestEmail: "test@example.com" });
  });

  it("returns ok:false with error on HTTP error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal error" }),
    });
    const result = await callEdgeFunction("rsvp-email", { test: true });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Internal error");
  });

  it("returns ok:false with error on fetch network failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network failed"));
    const result = await callEdgeFunction("health");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Network failed");
  });
});

describe("checkEdgeHealth", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ok:true with version and uptime on healthy response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        version: "6.0.0",
        uptime_ms: 12345,
      }),
    });
    const result = await checkEdgeHealth();
    expect(result.ok).toBe(true);
    expect(result.version).toBe("6.0.0");
    expect(result.uptime_ms).toBe(12345);
  });

  it("returns ok:false when status is not 'ok'", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "degraded" }),
    });
    const result = await checkEdgeHealth();
    expect(result.ok).toBe(false);
  });

  it("returns ok:false on network failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const result = await checkEdgeHealth();
    expect(result.ok).toBe(false);
  });
});

describe("sendRsvpEmail", () => {
  let fetchMock;
  let warnSpy;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    warnSpy.mockRestore();
  });

  it("calls rsvp-email edge function with correct payload", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, sent: true }),
    });
    await sendRsvpEmail("Alice", "alice@example.com", "confirmed", {
      venue: "Wedding Hall",
    });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("rsvp-email");
    const body = JSON.parse(opts.body);
    expect(body.guestName).toBe("Alice");
    expect(body.guestEmail).toBe("alice@example.com");
    expect(body.status).toBe("confirmed");
    expect(body.venue).toBe("Wedding Hall");
  });

  it("is a no-op when guestEmail is empty", async () => {
    await sendRsvpEmail("Alice", "", "confirmed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs warning but does not throw on edge function error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));
    await expect(
      sendRsvpEmail("Alice", "alice@example.com", "declined"),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});
// ── Phase 7.5 — syncToSheetsEdge / isSheetsMirrorEnabled ─────────────────
describe("syncToSheetsEdge", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls sync-to-sheets edge function with resource and rows", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, resource: "guests", rows: 3, updatedCells: 12 }),
    });
    const rows = [["id", "name"], ["1", "Alice"], ["2", "Bob"]];
    const result = await syncToSheetsEdge("guests", rows);
    expect(result.ok).toBe(true);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toContain("sync-to-sheets");
    const body = JSON.parse(call[1].body);
    expect(body.resource).toBe("guests");
    expect(body.rows).toHaveLength(3);
  });

  it("returns ok:false on HTTP error from sheet sync", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "Sheets sync not configured" }),
    });
    const result = await syncToSheetsEdge("guests", []);
    expect(result.ok).toBe(false);
  });
});

describe("isSheetsMirrorEnabled", () => {
  /** @type {Map<string, string>} */
  let store;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, v),
      removeItem: (k) => store.delete(k),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when key not set", () => {
    expect(isSheetsMirrorEnabled()).toBe(false);
  });

  it("returns true when key set to 'true'", () => {
    localStorage.setItem("wedding_v1_sheets_mirror", "true");
    expect(isSheetsMirrorEnabled()).toBe(true);
  });

  it("returns false when key set to 'false'", () => {
    localStorage.setItem("wedding_v1_sheets_mirror", "false");
    expect(isSheetsMirrorEnabled()).toBe(false);
  });
});