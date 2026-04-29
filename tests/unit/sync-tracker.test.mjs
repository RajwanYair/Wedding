/**
 * tests/unit/sync-tracker.test.mjs
 *
 * Unit tests for src/services/sync.js
 * Tests: initSyncTracker, getSyncState, setSyncState, watchSyncState,
 *        markSyncing, markSynced, markSyncError, markAllOffline, markAllOnline,
 *        getDataClass, pending counter increments.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Store mock ────────────────────────────────────────────────────────────
const _subs = new Map();
vi.mock("../../src/core/store.js", () => ({
  storeGet: vi.fn(() => []),
  storeSet: vi.fn(),
  storeSubscribe: vi.fn((key, fn) => {
    if (!_subs.has(key)) _subs.set(key, new Set());
    _subs.get(key).add(fn);
    return () => _subs.get(key)?.delete(fn);
  }),
}));

// ── Constants mock ────────────────────────────────────────────────────────
vi.mock("../../src/core/constants.js", () => ({
  STORE_DATA_CLASS: {
    guests: "admin-sensitive",
    tables: "admin-sensitive",
    vendors: "admin-sensitive",
    budget: "admin-sensitive",
    contacts: "guest-private",
    timeline: "public",
    gallery: "public",
    weddingInfo: "public",
    timelineDone: "operational",
  },
}));

// Helpers used each test
let initSyncTracker, getSyncState, getAllSyncStates, watchSyncState, setSyncState;
let markSyncing, markSynced, markSyncError, markAllOffline, markAllOnline, getDataClass;

beforeEach(async () => {
  // Re-import fresh module each suite by resetting module cache
  vi.resetModules();
  _subs.clear();
  ({
    initSyncTracker, getSyncState, getAllSyncStates, watchSyncState, setSyncState,
    markSyncing, markSynced, markSyncError, markAllOffline, markAllOnline, getDataClass,
  } = await import("../../src/services/sync.js"));
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("sync-tracker — initSyncTracker", () => {
  it("creates idle state for every supplied key", () => {
    initSyncTracker(["guests", "tables"]);
    expect(getSyncState("guests").status).toBe("idle");
    expect(getSyncState("tables").status).toBe("idle");
  });

  it("sets pendingWrites to 0 at init", () => {
    initSyncTracker(["guests"]);
    expect(getSyncState("guests").pendingWrites).toBe(0);
  });

  it("getAllSyncStates returns all tracked keys", () => {
    initSyncTracker(["guests", "vendors"]);
    const keys = getAllSyncStates().map((s) => s.key);
    expect(keys).toContain("guests");
    expect(keys).toContain("vendors");
  });

  it("returns default state for untracked key", () => {
    const s = getSyncState("unknown");
    expect(s.status).toBe("idle");
    expect(s.key).toBe("unknown");
  });
});

describe("sync-tracker — setSyncState / transitions", () => {
  beforeEach(() => initSyncTracker(["guests"]));

  it("markSyncing sets status to syncing", () => {
    markSyncing("guests");
    expect(getSyncState("guests").status).toBe("syncing");
    expect(getSyncState("guests").error).toBeNull();
  });

  it("markSynced resets to idle with lastSyncAt", () => {
    markSyncing("guests");
    markSynced("guests");
    const s = getSyncState("guests");
    expect(s.status).toBe("idle");
    expect(s.pendingWrites).toBe(0);
    expect(typeof s.lastSyncAt).toBe("string");
  });

  it("markSyncError sets error status and message", () => {
    markSyncError("guests", "Network timeout");
    const s = getSyncState("guests");
    expect(s.status).toBe("error");
    expect(s.error).toBe("Network timeout");
  });

  it("setSyncState preserves unpatched fields", () => {
    markSyncing("guests");
    setSyncState("guests", { error: "partial" });
    const s = getSyncState("guests");
    expect(s.status).toBe("syncing");
    expect(s.error).toBe("partial");
  });
});

describe("sync-tracker — offline / online transitions", () => {
  beforeEach(() => initSyncTracker(["guests", "tables", "vendors"]));

  it("markAllOffline sets every key to offline", () => {
    markAllOffline();
    for (const s of getAllSyncStates()) {
      expect(s.status).toBe("offline");
    }
  });

  it("markAllOnline restores offline keys to idle when no pending writes", () => {
    markAllOffline();
    markAllOnline();
    for (const s of getAllSyncStates()) {
      expect(s.status).toBe("idle");
    }
  });

  it("markAllOnline restores to pending when there are pending writes", () => {
    initSyncTracker(["guests"]);
    setSyncState("guests", { status: "offline", pendingWrites: 3 });
    markAllOnline();
    expect(getSyncState("guests").status).toBe("pending");
  });

  it("markAllOffline skips keys already offline", () => {
    markAllOffline();
    const s1 = getSyncState("guests");
    markAllOffline();
    const s2 = getSyncState("guests");
    expect(s1).toEqual(s2);
  });
});

describe("sync-tracker — watchSyncState / notifications", () => {
  beforeEach(() => initSyncTracker(["guests"]));

  it("notifies listener on state change", () => {
    const listener = vi.fn();
    watchSyncState("guests", listener);
    markSyncing("guests");
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0][0].status).toBe("syncing");
  });

  it("wildcard listener * receives all key changes", () => {
    initSyncTracker(["guests", "tables"]);
    const all = vi.fn();
    watchSyncState("*", all);
    markSyncing("guests");
    markSyncing("tables");
    expect(all).toHaveBeenCalledTimes(2);
  });

  it("unsubscribe stops notifications", () => {
    const fn = vi.fn();
    const unsub = watchSyncState("guests", fn);
    markSyncing("guests");
    unsub();
    markSynced("guests");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("sync-tracker — getDataClass", () => {
  it("returns admin-sensitive for guests", () => {
    expect(getDataClass("guests")).toBe("admin-sensitive");
  });

  it("returns guest-private for contacts", () => {
    expect(getDataClass("contacts")).toBe("guest-private");
  });

  it("returns public for timeline", () => {
    expect(getDataClass("timeline")).toBe("public");
  });

  it("defaults to operational for unknown key", () => {
    expect(getDataClass("unknownKey")).toBe("operational");
  });
});

describe("sync-tracker — pending counter from store mutations", () => {
  it("increments pendingWrites when store changes for non-operational key", async () => {
    initSyncTracker(["guests"]);
    // Simulate a store mutation by invoking the subscription callback
    const sub = [...(_subs.get("guests") ?? [])][0];
    expect(typeof sub).toBe("function");
    sub();
    expect(getSyncState("guests").status).toBe("pending");
    expect(getSyncState("guests").pendingWrites).toBe(1);
  });

  it("does not increment pendingWrites for operational data class keys", async () => {
    initSyncTracker(["timelineDone"]);
    const sub = [...(_subs.get("timelineDone") ?? [])][0];
    expect(typeof sub).toBe("function");
    sub();
    // operational key: should NOT increment
    expect(getSyncState("timelineDone").pendingWrites).toBe(0);
  });
});
