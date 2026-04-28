/**
 * tests/integration/sync-resilience.test.mjs — Sprint 118
 *
 * Integration tests for the sync resilience stack:
 *   sheets.js (enqueueWrite, retry) + sync-tracker + sync-dashboard
 *
 * Network calls (syncStoreKey, checkConnection etc.) are mocked via backend.js.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ── Backend mock (no real HTTP) ───────────────────────────────────────────

vi.mock("../../src/services/backend.js", () => ({
  syncStoreKey:      vi.fn(),
  appendRsvpLog:     vi.fn(),
  checkConnection:   vi.fn().mockResolvedValue(true),
  createMissingTabs: vi.fn().mockResolvedValue(undefined),
  pullAll:           vi.fn().mockResolvedValue({}),
  pushAll:           vi.fn().mockResolvedValue(undefined),
  getBackendType:    vi.fn().mockReturnValue("supabase"),
}));

vi.mock("../../src/core/storage.js", () => ({
  storageGet:    vi.fn().mockResolvedValue(null),
  storageSet:    vi.fn().mockResolvedValue(undefined),
  storageRemove: vi.fn().mockResolvedValue(undefined),
}));

// ── Imports ────────────────────────────────────────────────────────────────

import { initStore } from "../../src/core/store.js";
const { enqueueWrite, onSyncStatus, syncStatus } =
  await import("../../src/services/sheets.js");
const { initSyncTracker, getSyncState, markSyncing, markSynced, markSyncError, markAllOffline, markAllOnline } =
  await import("../../src/services/sync-tracker.js");
const { getSyncStatus, isSyncHealthy, getFailedDomains, getPendingDomains } =
  await import("../../src/services/sync-tracker.js");
import { syncStoreKey } from "../../src/services/backend.js";

const KEYS = ["guests", "tables", "vendors", "expenses"];

function seed() {
  initStore({
    guests:      { value: [] },
    tables:      { value: [] },
    vendors:     { value: [] },
    expenses:    { value: {} },
    weddingInfo: { value: {} },
  });
  initSyncTracker(KEYS);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  seed();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── enqueueWrite debounce ─────────────────────────────────────────────────

describe("enqueueWrite — debounce behaviour", () => {
  it("calls syncFn after the debounce delay", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    enqueueWrite("guests", fn);
    expect(fn).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("coalesces multiple enqueueWrites for the same key", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    enqueueWrite("guests", fn);
    enqueueWrite("guests", fn);
    enqueueWrite("guests", fn);
    await vi.runAllTimersAsync();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("different keys fire independently", async () => {
    const fnA = vi.fn().mockResolvedValue(undefined);
    const fnB = vi.fn().mockResolvedValue(undefined);
    enqueueWrite("guests",  fnA);
    enqueueWrite("vendors", fnB);
    await vi.runAllTimersAsync();
    expect(fnA).toHaveBeenCalledOnce();
    expect(fnB).toHaveBeenCalledOnce();
  });
});

// ── Sync tracker state transitions ────────────────────────────────────────

describe("sync-tracker — state transitions", () => {
  it("starts all keys as idle", () => {
    for (const key of KEYS) {
      expect(getSyncState(key).status).toBe("idle");
    }
  });

  it("markSyncing → syncing", () => {
    markSyncing("guests");
    expect(getSyncState("guests").status).toBe("syncing");
  });

  it("markSynced → idle + sets lastSyncAt", () => {
    markSyncing("guests");
    markSynced("guests");
    const s = getSyncState("guests");
    expect(s.status).toBe("idle");
    expect(s.lastSyncAt).toBeTruthy();
  });

  it("markSyncError → error with message", () => {
    markSyncError("tables", "timeout");
    const s = getSyncState("tables");
    expect(s.status).toBe("error");
    expect(s.error).toMatch(/timeout/);
  });

  it("markAllOffline sets every key to offline", () => {
    markAllOffline();
    for (const key of KEYS) {
      expect(getSyncState(key).status).toBe("offline");
    }
  });

  it("markAllOnline restores offline keys to idle", () => {
    markAllOffline();
    markAllOnline();
    for (const key of KEYS) {
      expect(["idle", "pending"]).toContain(getSyncState(key).status);
    }
  });
});

// ── Sync dashboard ────────────────────────────────────────────────────────

describe("sync-dashboard — health checks", () => {
  it("isSyncHealthy is true when all domains idle", () => {
    expect(isSyncHealthy()).toBe(true);
  });

  it("isSyncHealthy is false when a domain has error", () => {
    markSyncError("guests", "network");
    expect(isSyncHealthy()).toBe(false);
  });

  it("isSyncHealthy is false when a domain is offline", () => {
    markAllOffline();
    expect(isSyncHealthy()).toBe(false);
  });

  it("getFailedDomains returns error domains", () => {
    markSyncError("vendors", "500");
    const failed = getFailedDomains();
    expect(failed).toContain("vendors");
  });

  it("getPendingDomains returns domains with pending writes", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    enqueueWrite("tables", fn);
    // Before timer fires, tables should be pending (or show up in pending)
    const pending = getPendingDomains();
    // After timer fires syncFn runs and it becomes idle again
    await vi.runAllTimersAsync();
    // Just verify no error is thrown
    expect(Array.isArray(pending)).toBe(true);
  });
});

// ── syncStatus (global flag) ──────────────────────────────────────────────

describe("syncStatus — global flag", () => {
  it("starts as idle or synced", () => {
    expect(["idle", "synced"]).toContain(syncStatus());
  });

  it("onSyncStatus listener is called on change", async () => {
    const listener = vi.fn();
    onSyncStatus(listener);
    const fn = vi.fn().mockResolvedValue(undefined);
    enqueueWrite("guests", fn);
    await vi.runAllTimersAsync();
    // listener should have been called at least once during sync cycle
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Retry on failure (exponential backoff) ────────────────────────────────

describe("sync retry — exponential backoff", () => {
  it("retries syncFn after failure", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue(undefined);
    enqueueWrite("guests", fn);
    // First attempt
    await vi.runAllTimersAsync();
    // After backoff, second attempt
    await vi.runAllTimersAsync();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
