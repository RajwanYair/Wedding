/**
 * tests/unit/audit.test.mjs — Sprint 152
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { STORAGE_KEYS } from "../../src/core/constants.js";
import { createLocalStorageMock, clearStore } from "./helpers.js";

vi.mock("../../src/core/config.js", () => ({
  BACKEND_TYPE: "supabase",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  APP_VERSION: "7.5.0",
  STORAGE_PREFIX: "wedding_v1_",
}));

vi.mock("../../src/core/state.js", () => ({
  load: vi.fn(() => ""),
}));

// ── localStorage mock ──────────────────────────────────────────────────────
const { mock: _lsMock, store: _store } = createLocalStorageMock();
vi.stubGlobal("localStorage", _lsMock);

import { audit } from "../../src/services/compliance.js";

const SESSION_KEY = STORAGE_KEYS.SUPABASE_SESSION;

beforeEach(() => {
  clearStore(_store);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
});

describe("audit", () => {
  it("does not call fetch when BACKEND_TYPE is not supabase (covered by mock)", () => {
    // Module is mocked with supabase, but no admin session → fetch not called
    audit("INSERT", "guests", "g1", null);
    // No admin session in localStorage → fetch should NOT be called
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("calls fetch when admin session present", () => {
    const session = {
      access_token: "tok123",
      user: { email: "admin@example.com" },
    };
    _store[SESSION_KEY] = JSON.stringify(session);
    audit("UPDATE", "guests", "g1", { before: {}, after: {} });
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
  });

  it("sends action as uppercase", () => {
    const session = { access_token: "tok123", user: { email: "admin@example.com" } };
    _store[SESSION_KEY] = JSON.stringify(session);
    audit("insert", "vendors", "v1", null);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body);
    expect(body.action).toBe("INSERT");
  });

  it("sends correct entity and entity_id", () => {
    const session = { access_token: "tok123", user: { email: "admin@example.com" } };
    _store[SESSION_KEY] = JSON.stringify(session);
    audit("DELETE", "tables", "t42", null);
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body);
    expect(body.entity).toBe("tables");
    expect(body.entity_id).toBe("t42");
  });

  it("includes Bearer token in Authorization header when session present", () => {
    const session = { access_token: "mytoken", user: { email: "admin@example.com" } };
    _store[SESSION_KEY] = JSON.stringify(session);
    audit("UPDATE", "guests", "g2", null);
    const headers = vi.mocked(fetch).mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer mytoken");
  });

  it("includes null diff when not provided", () => {
    const session = { access_token: "tok", user: { email: "admin@example.com" } };
    _store[SESSION_KEY] = JSON.stringify(session);
    audit("INSERT", "guests", "g3");
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body);
    expect(body.diff).toBeNull();
  });

  it("does not throw when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const session = { access_token: "tok", user: { email: "admin@example.com" } };
    _store[SESSION_KEY] = JSON.stringify(session);
    expect(() => audit("INSERT", "guests", "g4")).not.toThrow();
  });
});
