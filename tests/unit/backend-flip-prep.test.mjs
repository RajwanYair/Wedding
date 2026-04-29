/**
 * tests/unit/backend-flip-prep.test.mjs — S96 helpers for v13.0 backend flip.
 */
import { describe, it, beforeEach, afterEach, vi, expect } from "vitest";

vi.mock("../../src/core/app-config.js", () => ({
  getBackendTypeConfig: () => "sheets",
  getSupabaseUrl: () => "https://example.supabase.co",
}));

vi.mock("../../src/core/state.js", () => {
  const _state = new Map();
  return {
    load: (key, fallback) => (_state.has(key) ? _state.get(key) : fallback),
    save: (key, val) => _state.set(key, val),
    __reset: () => _state.clear(),
    __set: (key, val) => _state.set(key, val),
  };
});

vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorage: () => null,
}));

let backend;
let stateMod;

beforeEach(async () => {
  vi.resetModules();
  stateMod = await import("../../src/core/state.js");
  stateMod.__reset();
  backend = await import("../../src/services/backend.js");
});

afterEach(() => {
  stateMod.__reset();
});

describe("S96 — backend flip prep", () => {
  it("isDualWriteActive returns false when backendType is sheets", () => {
    expect(backend.isDualWriteActive()).toBe(false);
  });

  it("isDualWriteActive returns true when user opted in to 'both'", () => {
    stateMod.__set("backendType", "both");
    expect(backend.isDualWriteActive()).toBe(true);
  });

  it("isBackendFlipReady reports dual_write_inactive when not in both mode", () => {
    const r = backend.isBackendFlipReady();
    expect(r.ready).toBe(false);
    expect(r.reasons).toContain("dual_write_inactive");
    expect(r.reasons).toContain("supabase_never_verified");
  });

  it("isBackendFlipReady is ready when dual-write active + supabase verified", () => {
    stateMod.__set("backendType", "both");
    stateMod.__set("supabaseLastOkAt", Date.now());
    const r = backend.isBackendFlipReady();
    expect(r.ready).toBe(true);
    expect(r.reasons).toEqual([]);
  });
});
