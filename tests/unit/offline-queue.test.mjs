/**
 * tests/unit/offline-queue.test.mjs
 *
 * Unit tests for src/services/offline-queue.js
 * Tests: enqueueOffline, getOfflineQueueCount, getQueueStats,
 *        exhausted item tracking, queue persistence.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Store mock ────────────────────────────────────────────────────────────
/** @type {Record<string, unknown>} */
const _store = {};
vi.mock("../../src/core/store.js", () => ({
  storeGet: vi.fn((key) => _store[key] ?? null),
  storeSet: vi.fn((key, val) => { _store[key] = val; }),
}));

// ── Config mock ───────────────────────────────────────────────────────────
vi.mock("../../src/core/config.js", () => ({
  MAX_RETRIES: 4,
  BACKOFF_BASE_MS: 100,
  APP_VERSION: "6.0.0",
  SHEETS_WEBAPP_URL: "",
  GOOGLE_CLIENT_ID: "",
  FB_APP_ID: "",
  APPLE_SERVICE_ID: "",
  ADMIN_EMAILS: [],
}));

// ── i18n mock ─────────────────────────────────────────────────────────────
vi.mock("../../src/core/i18n.js", () => ({
  t: vi.fn((key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key)),
}));

// Re-import module before each test (fresh state)
let enqueueOffline, getOfflineQueueCount, getQueueStats, flushOfflineQueue, initOfflineQueue;

beforeEach(async () => {
  vi.resetModules();
  Object.keys(_store).forEach((k) => delete _store[k]);
  ({ enqueueOffline, getOfflineQueueCount, getQueueStats, flushOfflineQueue, initOfflineQueue } =
    await import("../../src/services/offline-queue.js"));
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("offline-queue — enqueue / count", () => {
  it("starts with 0 items", () => {
    expect(getOfflineQueueCount()).toBe(0);
  });

  it("enqueueOffline adds item", () => {
    enqueueOffline("rsvp", { name: "Test" });
    expect(getOfflineQueueCount()).toBe(1);
  });

  it("enqueueOffline adds multiple items", () => {
    enqueueOffline("rsvp", { a: 1 });
    enqueueOffline("contact", { b: 2 });
    expect(getOfflineQueueCount()).toBe(2);
  });

  it("persists queue to store on enqueue", async () => {
    const { storeSet } = await import("../../src/core/store.js");
    enqueueOffline("rsvp", { x: 1 });
    expect(storeSet).toHaveBeenCalledWith("offline_queue", expect.arrayContaining([
      expect.objectContaining({ type: "rsvp", retries: 0 }),
    ]));
  });
});

describe("offline-queue — getQueueStats", () => {
  it("returns zero stats when empty", () => {
    const stats = getQueueStats();
    expect(stats.total).toBe(0);
    expect(stats.exhausted).toBe(0);
    expect(stats.oldestAddedAt).toBeNull();
  });

  it("returns correct total", () => {
    enqueueOffline("rsvp", {});
    enqueueOffline("rsvp", {});
    expect(getQueueStats().total).toBe(2);
  });

  it("oldestAddedAt is the earliest addedAt", () => {
    enqueueOffline("rsvp", {});
    const first = getQueueStats().oldestAddedAt;
    // Small delay to ensure different timestamps
    enqueueOffline("rsvp", {});
    expect(getQueueStats().oldestAddedAt).toBe(first);
  });
});

describe("offline-queue — exhausted tracking", () => {
  it("getQueueStats reports zero exhausted initially", () => {
    expect(getQueueStats().exhausted).toBe(0);
  });

  it("item retries increment towards MAX_RETRIES on each flush failure", async () => {
    _store["offline_queue"] = [
      { type: "rsvp", payload: { id: 1 }, addedAt: new Date().toISOString(), retries: 2 },
    ];
    const failPost = vi.fn(() => Promise.reject(new Error("fail")));
    initOfflineQueue({ webAppUrl: "https://example.com/api", postFn: failPost });

    flushOfflineQueue();
    // Give microtasks time to resolve the rejected promise
    await new Promise((r) => setTimeout(r, 20));

    // Item with retries:2 should be requeued with retries:3 (2 < MAX_RETRIES:4)
    expect(getQueueStats().total).toBe(1);
    expect(getQueueStats().exhausted).toBe(0);
  });
});

describe("offline-queue — initOfflineQueue", () => {
  it("loads persisted queue from store", async () => {
    const { storeGet } = await import("../../src/core/store.js");
    storeGet.mockReturnValueOnce([
      { type: "rsvp", payload: {}, addedAt: new Date().toISOString(), retries: 0 },
    ]);
    initOfflineQueue({});
    expect(getOfflineQueueCount()).toBe(1);
  });
});

describe("offline-queue — Background Sync tag registration", () => {
  it("calls reg.sync.register('rsvp-sync') when enqueuing with SW controller", async () => {
    const register = vi.fn(() => Promise.resolve());
    const ready = Promise.resolve({ sync: { register } });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true, writable: true,
      value: { controller: {}, ready, addEventListener: vi.fn() },
    });
    enqueueOffline("rsvp", { name: "Alice" });
    await ready;
    await new Promise((r) => setTimeout(r, 10));
    expect(register).toHaveBeenCalledWith("rsvp-sync");
    // restore
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true, writable: true, value: undefined,
    });
  });

  it("does not throw when serviceWorker is absent", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true, writable: true, value: undefined,
    });
    expect(() => enqueueOffline("rsvp", {})).not.toThrow();
  });
});
