/**
 * tests/unit/api-key.test.mjs — S442: coverage for src/utils/api-key.js
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── localStorage mock ──────────────────────────────────────────────────────
const _store = {};
const localStorageMock = {
  getItem: vi.fn((k) => _store[k] ?? null),
  setItem: vi.fn((k, v) => { _store[k] = v; }),
  removeItem: vi.fn((k) => { delete _store[k]; }),
};
vi.stubGlobal("localStorage", localStorageMock);

// ── crypto mock ────────────────────────────────────────────────────────────
vi.stubGlobal("crypto", {
  randomUUID: () => "aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb",
});

import {
  generateApiKey,
  getApiKey,
  revokeApiKey,
} from "../../src/utils/api-key.js";

const STORAGE_KEY = "wedding_v1_api_key";

beforeEach(() => {
  Object.keys(_store).forEach((k) => delete _store[k]);
  vi.clearAllMocks();
});

describe("generateApiKey", () => {
  it("returns a wk_-prefixed string", () => {
    const key = generateApiKey();
    expect(key).toMatch(/^wk_[a-f0-9]{32}$/);
  });

  it("stores the key in localStorage", () => {
    const key = generateApiKey();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, key);
    expect(_store[STORAGE_KEY]).toBe(key);
  });

  it("overwrites a previously stored key", () => {
    generateApiKey();
    generateApiKey();
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);
    expect(_store[STORAGE_KEY]).toBe("wk_aaaabbbbccccddddeeeeffffaaaabbbb");
  });
});

describe("getApiKey", () => {
  it("returns null when no key is stored", () => {
    expect(getApiKey()).toBeNull();
  });

  it("returns the stored key", () => {
    _store[STORAGE_KEY] = "wk_testkey";
    expect(getApiKey()).toBe("wk_testkey");
  });
});

describe("revokeApiKey", () => {
  it("removes the key from localStorage", () => {
    _store[STORAGE_KEY] = "wk_testkey";
    revokeApiKey();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(_store[STORAGE_KEY]).toBeUndefined();
  });

  it("does not throw when no key exists", () => {
    expect(() => revokeApiKey()).not.toThrow();
  });
});
