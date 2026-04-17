/**
 * tests/unit/supabase-auth.test.mjs — Sprint 151
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/config.js", () => ({
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  ADMIN_EMAILS: ["admin@example.com", "boss@example.com"],
  BACKEND_TYPE: "supabase",
  APP_VERSION: "7.5.0",
}));

vi.mock("../../src/core/state.js", () => ({
  load: vi.fn(() => ""),
}));

import {
  isSupabaseAuthConfigured,
  getSession,
  clearSession,
  isAdmin,
  handleOAuthRedirect,
} from "../../src/services/supabase-auth.js";

const SESSION_KEY = "wedding_v1_supabase_session";

// ── localStorage mock ──────────────────────────────────────────────────────
let _store = {};
const localStorageMock = {
  getItem: (k) => (_store[k] ?? null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { _store = {}; },
};
vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("document", { title: "" });
vi.stubGlobal("window", {
  location: { hash: "", origin: "https://test.example.com", pathname: "/", search: "" },
  history: { replaceState: vi.fn() },
});

function makeSession(overrides = {}) {
  return {
    access_token: "tok123",
    refresh_token: "ref456",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "uid1", email: "admin@example.com" },
    ...overrides,
  };
}

function fakeJwt(payload) {
  const enc = (obj) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${enc({ alg: "HS256" })}.${enc(payload)}.FAKESIG`;
}

beforeEach(() => {
  _store = {};
  vi.mocked(window.history.replaceState).mockClear();
});

describe("isSupabaseAuthConfigured", () => {
  it("returns true when URL and key are set in config", () => {
    expect(isSupabaseAuthConfigured()).toBe(true);
  });
});

describe("getSession", () => {
  it("returns null when nothing stored", () => {
    expect(getSession()).toBeNull();
  });

  it("returns parsed session when valid JSON stored", () => {
    const sess = makeSession();
    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    const result = getSession();
    expect(result).not.toBeNull();
    expect(result.user.email).toBe("admin@example.com");
  });

  it("returns null for invalid JSON", () => {
    localStorage.setItem(SESSION_KEY, "not-json");
    expect(getSession()).toBeNull();
  });
});

describe("clearSession", () => {
  it("removes the session from localStorage", () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(makeSession()));
    clearSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("is idempotent when session does not exist", () => {
    expect(() => clearSession()).not.toThrow();
  });
});

describe("isAdmin", () => {
  it("returns false for null session", () => {
    expect(isAdmin(null)).toBe(false);
  });

  it("returns false when no email in session", () => {
    expect(isAdmin({ user: {} })).toBe(false);
  });

  it("returns true for admin email (exact)", () => {
    expect(isAdmin(makeSession())).toBe(true);
  });

  it("returns false for non-admin email", () => {
    expect(isAdmin(makeSession({ user: { id: "x", email: "stranger@example.com" } }))).toBe(false);
  });

  it("matches second admin email", () => {
    expect(isAdmin(makeSession({ user: { id: "y", email: "boss@example.com" } }))).toBe(true);
  });
});

describe("handleOAuthRedirect", () => {
  it("returns null when hash has no access_token", () => {
    window.location.hash = "#state=abc";
    expect(handleOAuthRedirect()).toBeNull();
  });

  it("parses access_token from hash and saves session", () => {
    const payload = {
      sub: "user123",
      email: "admin@example.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      app_metadata: { provider: "google" },
      user_metadata: { name: "Admin" },
    };
    const token = fakeJwt(payload);
    window.location.hash = `#access_token=${token}&refresh_token=ref&expires_in=3600&token_type=bearer`;
    const sess = handleOAuthRedirect();
    expect(sess).not.toBeNull();
    expect(sess.user.email).toBe("admin@example.com");
    expect(sess.user.provider).toBe("google");
  });

  it("returns null for malformed token", () => {
    window.location.hash = "#access_token=bad.data";
    expect(handleOAuthRedirect()).toBeNull();
  });
});
