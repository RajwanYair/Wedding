/**
 * tests/unit/supabase-client.test.mjs — Unit tests for src/core/supabase-client.js
 *
 * Strategy: Mocks `@supabase/supabase-js` `createClient` and tests the singleton
 * lifecycle, credential resolution, and reset behaviour without real network calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock createClient ─────────────────────────────────────────────────────

const _mockClient = {
  from: vi.fn(() => _mockClient),
  select: vi.fn(() => _mockClient),
  limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
  realtime: {
    disconnect: vi.fn(() => Promise.resolve()),
  },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => _mockClient),
}));

vi.mock("../../src/core/config.js", () => ({
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  APP_VERSION: "test",
}));

vi.mock("../../src/core/state.js", () => ({
  load: vi.fn(() => ""),
}));

const { createClient } = await import("@supabase/supabase-js");
const {
  isSupabaseConfigured,
  getSupabaseClient,
  resetSupabaseClient,
} = await import("../../src/core/supabase-client.js");

// ── Helpers ───────────────────────────────────────────────────────────────

// Helper to set env credentials via mock overrides
const { load } = await import("../../src/core/state.js");

/** @param {string} url @param {string} key */
function mockCreds(url = "", key = "") {
  vi.mocked(load).mockImplementation((k) => {
    if (k === "supabaseUrl") return url;
    if (k === "supabaseAnonKey") return key;
    return "";
  });
}

// ── isSupabaseConfigured ──────────────────────────────────────────────────

describe("isSupabaseConfigured", () => {
  beforeEach(() => mockCreds());
  afterEach(() => vi.mocked(load).mockReset());

  it("returns false when URL and key are empty", () => {
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns false when only URL is set", () => {
    mockCreds("https://abc.supabase.co", "");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns false when only key is set", () => {
    mockCreds("", "anon-key-123");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns true when both URL and key are set", () => {
    mockCreds("https://abc.supabase.co", "anon-key-123");
    expect(isSupabaseConfigured()).toBe(true);
  });
});

// ── getSupabaseClient ─────────────────────────────────────────────────────

describe("getSupabaseClient", () => {
  beforeEach(async () => {
    vi.mocked(load).mockReset();
    await resetSupabaseClient();
    vi.mocked(createClient).mockClear();
  });

  it("returns null when credentials are not configured", () => {
    mockCreds("", "");
    expect(getSupabaseClient()).toBeNull();
  });

  it("creates a client when credentials are configured", () => {
    mockCreds("https://abc.supabase.co", "anon-key-123");
    const client = getSupabaseClient();
    expect(client).not.toBeNull();
    expect(createClient).toHaveBeenCalledOnce();
  });

  it("returns the same singleton on repeated calls", () => {
    mockCreds("https://abc.supabase.co", "anon-key-123");
    const c1 = getSupabaseClient();
    const c2 = getSupabaseClient();
    expect(c1).toBe(c2);
    expect(createClient).toHaveBeenCalledOnce();
  });

  it("passes correct URL and key to createClient", () => {
    const url = "https://xyzxyz.supabase.co";
    const key = "super-anon-key";
    mockCreds(url, key);
    getSupabaseClient();
    expect(createClient).toHaveBeenCalledWith(url, key, expect.any(Object));
  });

  it("includes auth persistSession and autoRefreshToken in config", () => {
    mockCreds("https://abc.supabase.co", "key");
    getSupabaseClient();
    const opts = /** @type {any} */ (vi.mocked(createClient).mock.calls[0]?.[2]);
    expect(opts?.auth?.persistSession).toBe(true);
    expect(opts?.auth?.autoRefreshToken).toBe(true);
  });

  it("includes realtime eventsPerSecond in config", () => {
    mockCreds("https://abc.supabase.co", "key");
    getSupabaseClient();
    const opts = /** @type {any} */ (vi.mocked(createClient).mock.calls[0]?.[2]);
    expect(opts?.realtime?.params?.eventsPerSecond).toBe(10);
  });
});

// ── resetSupabaseClient ───────────────────────────────────────────────────

describe("resetSupabaseClient", () => {
  beforeEach(async () => {
    vi.mocked(load).mockReset();
    await resetSupabaseClient();
    vi.mocked(createClient).mockClear();
  });

  it("does not throw when no client was created", async () => {
    await expect(resetSupabaseClient()).resolves.toBeUndefined();
  });

  it("allows creating a new client after reset", async () => {
    mockCreds("https://abc.supabase.co", "key");
    getSupabaseClient(); // create
    expect(createClient).toHaveBeenCalledOnce();

    await resetSupabaseClient(); // reset
    vi.mocked(createClient).mockClear();

    getSupabaseClient(); // create again
    expect(createClient).toHaveBeenCalledOnce();
  });

  it("calls realtime.disconnect on the existing client", async () => {
    mockCreds("https://abc.supabase.co", "key");
    getSupabaseClient();
    vi.mocked(_mockClient.realtime.disconnect).mockClear();

    await resetSupabaseClient();
    expect(_mockClient.realtime.disconnect).toHaveBeenCalledOnce();
  });
});
