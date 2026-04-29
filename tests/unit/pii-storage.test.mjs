/**
 * tests/unit/pii-storage.test.mjs — PII-aware storage helpers (S157)
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock secure-storage — use a Map to simulate encrypted store
const _secureStore = new Map();
vi.mock("../../src/services/secure-storage.js", () => ({
  setSecure: vi.fn(async (key, value) => {
    _secureStore.set(key, structuredClone(value));
  }),
  getSecure: vi.fn(async (key) => {
    const v = _secureStore.get(key);
    return v !== undefined ? structuredClone(v) : null;
  }),
  removeSecure: vi.fn((key) => {
    _secureStore.delete(key);
  }),
  importRawKey: vi.fn(async () => ({})),
  encryptField: vi.fn(async (_k, v) => btoa(v)),
  decryptField: vi.fn(async (_k, v) => atob(v)),
}));

// Mock state — default event
vi.mock("../../src/core/state.js", () => ({
  getActiveEventId: vi.fn(() => "default"),
  load: vi.fn((key, fallback) => {
    try {
      const raw = localStorage.getItem(`wedding_v1_${key}`);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }),
}));

// Mock config
vi.mock("../../src/core/config.js", () => ({
  STORAGE_PREFIX: "wedding_v1_",
}));

const { isPiiKey, savePii, loadPii, migratePlaintextPii } = await import(
  "../../src/services/privacy.js"
);

beforeEach(() => {
  _secureStore.clear();
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k);
});

describe("isPiiKey", () => {
  it("returns true for admin-sensitive keys", () => {
    expect(isPiiKey("guests")).toBe(true);
    expect(isPiiKey("vendors")).toBe(true);
    expect(isPiiKey("approvedEmails")).toBe(true);
    expect(isPiiKey("tables")).toBe(true);
  });

  it("returns true for guest-private keys", () => {
    expect(isPiiKey("contacts")).toBe(true);
    expect(isPiiKey("notificationPreferences")).toBe(true);
  });

  it("returns false for operational/public keys", () => {
    expect(isPiiKey("backendType")).toBe(false);
    expect(isPiiKey("timeline")).toBe(false);
    expect(isPiiKey("gallery")).toBe(false);
    expect(isPiiKey("sheetsWebAppUrl")).toBe(false);
  });

  it("returns false for unknown keys", () => {
    expect(isPiiKey("nonexistent_key")).toBe(false);
  });
});

describe("savePii", () => {
  it("writes to encrypted storage with enc_ prefix", () => {
    savePii("guests", [{ name: "Alice" }]);
    // Key should be enc_wedding_v1_guests
    expect(_secureStore.has("enc_wedding_v1_guests")).toBe(true);
    expect(_secureStore.get("enc_wedding_v1_guests")).toEqual([{ name: "Alice" }]);
  });
});

describe("loadPii", () => {
  it("returns encrypted value when available", async () => {
    _secureStore.set("enc_wedding_v1_guests", [{ name: "Bob" }]);
    const result = await loadPii("guests", []);
    expect(result).toEqual([{ name: "Bob" }]);
  });

  it("falls back to plaintext localStorage and migrates", async () => {
    localStorage.setItem("wedding_v1_guests", JSON.stringify([{ name: "Carol" }]));
    const result = await loadPii("guests", []);
    expect(result).toEqual([{ name: "Carol" }]);
    // Should have migrated to encrypted storage
    expect(_secureStore.has("enc_wedding_v1_guests")).toBe(true);
    // Plaintext should be removed
    expect(localStorage.getItem("wedding_v1_guests")).toBeNull();
  });

  it("returns fallback when neither encrypted nor plaintext exists", async () => {
    const result = await loadPii("guests", []);
    expect(result).toEqual([]);
  });
});

describe("migratePlaintextPii", () => {
  it("migrates PII keys from plaintext to encrypted", async () => {
    localStorage.setItem("wedding_v1_guests", JSON.stringify([{ name: "Dan" }]));
    localStorage.setItem("wedding_v1_vendors", JSON.stringify([{ biz: "Flowers" }]));
    localStorage.setItem("wedding_v1_timeline", JSON.stringify([{ id: "t1" }]));

    const map = new Map([
      ["guests", "guests"],
      ["vendors", "vendors"],
      ["timeline", "timeline"],
    ]);

    const count = await migratePlaintextPii(map);
    expect(count).toBe(2); // guests + vendors (PII), not timeline (public)
    expect(_secureStore.has("enc_wedding_v1_guests")).toBe(true);
    expect(_secureStore.has("enc_wedding_v1_vendors")).toBe(true);
    expect(localStorage.getItem("wedding_v1_guests")).toBeNull();
    expect(localStorage.getItem("wedding_v1_vendors")).toBeNull();
    // timeline stays in plaintext
    expect(localStorage.getItem("wedding_v1_timeline")).not.toBeNull();
  });

  it("skips keys already encrypted", async () => {
    _secureStore.set("enc_wedding_v1_guests", [{ name: "Existing" }]);
    localStorage.setItem("wedding_v1_guests", JSON.stringify([{ name: "Old" }]));

    const map = new Map([["guests", "guests"]]);
    const count = await migratePlaintextPii(map);
    expect(count).toBe(0);
    // Encrypted value unchanged
    expect(_secureStore.get("enc_wedding_v1_guests")).toEqual([{ name: "Existing" }]);
  });

  it("returns 0 for empty map", async () => {
    const count = await migratePlaintextPii(new Map());
    expect(count).toBe(0);
  });
});
