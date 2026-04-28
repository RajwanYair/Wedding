/**
 * tests/unit/sync-dashboard.test.mjs — Unit tests for sync health dashboard (Sprint 48)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

import { initStore } from "../../src/core/store.js";
import { initSyncTracker, setSyncState, markSynced, markSyncError } from "../../src/services/sync-tracker.js";
const {
  getSyncStatus,
  getQueueDepth,
  getLastSyncTime,
  isSyncHealthy,
  getFailedDomains,
  getPendingDomains,
} = await import("../../src/services/sync-tracker.js");

const TEST_KEYS = ["guests", "tables", "vendors"];

function seedStore() {
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    campaigns: { value: [] },
    weddingInfo: { value: {} },
  });
}

beforeEach(() => {
  seedStore();
  initSyncTracker(TEST_KEYS);
});

// ── isSyncHealthy ─────────────────────────────────────────────────────────

describe("isSyncHealthy", () => {
  it("returns true when all domains are idle", () => {
    expect(isSyncHealthy()).toBe(true);
  });

  it("returns false when a domain has an error", () => {
    markSyncError("guests", "network timeout");
    expect(isSyncHealthy()).toBe(false);
  });

  it("returns false when a domain is pending", () => {
    setSyncState("tables", { status: "pending", pendingWrites: 1 });
    expect(isSyncHealthy()).toBe(false);
  });

  it("returns false when a domain is offline", () => {
    setSyncState("vendors", { status: "offline" });
    expect(isSyncHealthy()).toBe(false);
  });
});

// ── getSyncStatus ─────────────────────────────────────────────────────────

describe("getSyncStatus", () => {
  it("returns zero counts for all-idle state", () => {
    const s = getSyncStatus();
    expect(s.pending).toBe(0);
    expect(s.syncing).toBe(0);
    expect(s.failed).toBe(0);
    expect(s.offline).toBe(0);
    expect(s.total).toBe(TEST_KEYS.length);
  });

  it("counts pending and failed correctly", () => {
    setSyncState("guests",  { status: "pending", pendingWrites: 2 });
    markSyncError("vendors", "err");
    setSyncState("tables",  { status: "pending", pendingWrites: 1 });
    const s = getSyncStatus();
    expect(s.pending).toBe(2);
    expect(s.failed).toBe(1);
  });

  it("captures lastSync from synced domain", () => {
    markSynced("guests");
    const s = getSyncStatus();
    expect(s.lastSync).not.toBeNull();
  });
});

// ── getQueueDepth ─────────────────────────────────────────────────────────

describe("getQueueDepth", () => {
  it("returns 0 for all-idle state", () => {
    expect(getQueueDepth()).toBe(0);
  });

  it("sums pending writes across domains", () => {
    setSyncState("guests",  { status: "pending", pendingWrites: 3 });
    setSyncState("tables",  { status: "pending", pendingWrites: 2 });
    expect(getQueueDepth()).toBe(5);
  });
});

// ── getLastSyncTime ───────────────────────────────────────────────────────

describe("getLastSyncTime", () => {
  it("returns null when nothing has synced", () => {
    expect(getLastSyncTime()).toBeNull();
  });

  it("returns ISO string after a sync completes", () => {
    markSynced("guests");
    const t = getLastSyncTime();
    expect(typeof t).toBe("string");
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── getFailedDomains / getPendingDomains ───────────────────────────────────

describe("getFailedDomains + getPendingDomains", () => {
  it("reports failed domains", () => {
    markSyncError("vendors", "timeout");
    expect(getFailedDomains()).toContain("vendors");
  });

  it("reports pending domains", () => {
    setSyncState("tables", { status: "pending", pendingWrites: 1 });
    expect(getPendingDomains()).toContain("tables");
  });

  it("returns empty arrays when all idle", () => {
    expect(getFailedDomains()).toEqual([]);
    expect(getPendingDomains()).toEqual([]);
  });
});
