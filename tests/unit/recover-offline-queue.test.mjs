/**
 * tests/unit/recover-offline-queue.test.mjs — S158: persistent IDB write queue recovery
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── storage mock ──────────────────────────────────────────────────────────
const _storage = new Map();
vi.mock("../../src/core/storage.js", () => ({
  storageGet: vi.fn(async (k) => _storage.get(k) ?? null),
  storageSet: vi.fn(async (k, v) => { _storage.set(k, v); }),
  storageRemove: vi.fn(async (k) => { _storage.delete(k); }),
  readBrowserStorage: vi.fn(() => null),
  writeBrowserStorage: vi.fn(),
  initStorage: vi.fn(async () => {}),
  getAdapterType: vi.fn(() => "memory"),
  migrateFromLocalStorage: vi.fn(async () => 0),
  cleanupLocalStorageRemnants: vi.fn(async () => {}),
}));

// ── backend mock ──────────────────────────────────────────────────────────
vi.mock("../../src/services/backend.js", () => ({
  syncStoreKey: vi.fn(async () => {}),
  appendRsvpLog: vi.fn(async () => {}),
  checkConnection: vi.fn(async () => true),
  createMissingTabs: vi.fn(async () => {}),
  pullAll: vi.fn(async () => ({})),
  pushAll: vi.fn(async () => {}),
  getBackendType: vi.fn(() => "sheets"),
}));

// ── background-sync mock ──────────────────────────────────────────────────
vi.mock("../../src/services/background-sync.js", () => ({
  registerBackgroundSync: vi.fn(async () => false),
  isBackgroundSyncSupported: vi.fn(() => false),
}));

// ── config mock ──────────────────────────────────────────────────────────
vi.mock("../../src/core/config.js", () => ({
  DEBOUNCE_MS: 100,
  MAX_RETRIES: 2,
  BACKOFF_BASE_MS: 100,
  STORAGE_PREFIX: "wedding_v1_",
  SHEETS_WEBAPP_URL: "",
  SPREADSHEET_ID: "",
  ADMIN_EMAILS: [],
  BACKEND_TYPE: "sheets",
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
}));

const { enqueueWrite, recoverOfflineQueue } = await import("../../src/services/sheets.js");

beforeEach(() => {
  _storage.clear();
  vi.useFakeTimers();
});

const STORAGE_KEY = "wedding_offline_queue_keys";

describe("recoverOfflineQueue", () => {
  it("returns empty array when no persisted keys", async () => {
    const recovered = await recoverOfflineQueue(() => async () => {});
    expect(recovered).toEqual([]);
  });

  it("recovers persisted keys and re-enqueues them", async () => {
    _storage.set(STORAGE_KEY, JSON.stringify(["guests", "vendors"]));
    const calledKeys = [];
    const factory = (key) => async () => { calledKeys.push(key); };
    const recovered = await recoverOfflineQueue(factory);
    expect(recovered).toEqual(["guests", "vendors"]);
    // Run the debounced timers
    await vi.runAllTimersAsync();
    expect(calledKeys).toContain("guests");
    expect(calledKeys).toContain("vendors");
  });

  it("clears persisted keys after recovery", async () => {
    _storage.set(STORAGE_KEY, JSON.stringify(["guests"]));
    await recoverOfflineQueue(() => async () => {});
    // After recovery the key should be removed
    expect(_storage.has(STORAGE_KEY)).toBe(false);
  });

  it("tolerates malformed JSON and returns empty", async () => {
    _storage.set(STORAGE_KEY, "not-json");
    const recovered = await recoverOfflineQueue(() => async () => {});
    expect(recovered).toEqual([]);
  });

  it("tolerates non-array JSON and returns empty", async () => {
    _storage.set(STORAGE_KEY, JSON.stringify({ not: "array" }));
    const recovered = await recoverOfflineQueue(() => async () => {});
    expect(recovered).toEqual([]);
  });

  it("enqueueWrite persists queue keys to storage", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    enqueueWrite("testQueueKey", fn);
    // Let storage settle (not debounced, fire-and-forget Promise)
    await Promise.resolve();
    await Promise.resolve();
    // Key should be persisted
    const stored = _storage.get(STORAGE_KEY);
    expect(stored).toBeTruthy();
    const keys = JSON.parse(stored);
    expect(keys).toContain("testQueueKey");
  });
});
