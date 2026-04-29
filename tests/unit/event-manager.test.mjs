/**
 * tests/unit/event-manager.test.mjs — S357: services/event-manager.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────

const _globalStore = new Map();
let _activeEventId = "default";

vi.mock("../../src/core/state.js", () => ({
  loadGlobal: vi.fn((key, def) => _globalStore.get(key) ?? def),
  saveGlobal: vi.fn((key, val) => _globalStore.set(key, val)),
  getActiveEventId: vi.fn(() => _activeEventId),
  setActiveEvent: vi.fn((id) => { _activeEventId = id; }),
}));

import {
  markDirty,
  markClean,
  markAllClean,
  isDirty,
  hasUnsavedChanges,
  getDirtyKeys,
  dirtyCount,
  snapshotBaseline,
  checkDirty,
  clearBaselines,
  getDirtyStateSummary,
  createOptimisticManager,
  createEvent,
  getEvent,
  listEvents,
  updateEvent,
  deleteEvent,
  setActiveEvent,
  getActiveEvent,
  clearActiveEvent,
} from "../../src/services/event-manager.js";

beforeEach(() => {
  _globalStore.clear();
  _activeEventId = "default";
  vi.clearAllMocks();
  markAllClean();
  clearBaselines();
});

// ── Dirty tracking ─────────────────────────────────────────────────────────

describe("dirty tracking", () => {
  it("markDirty + isDirty", () => {
    markDirty("guests");
    expect(isDirty("guests")).toBe(true);
  });

  it("markClean clears a key", () => {
    markDirty("guests");
    markClean("guests");
    expect(isDirty("guests")).toBe(false);
  });

  it("markAllClean clears all keys", () => {
    markDirty("guests");
    markDirty("tables");
    markAllClean();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("hasUnsavedChanges returns false when clean", () => {
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("getDirtyKeys returns all dirty keys", () => {
    markDirty("a");
    markDirty("b");
    expect(getDirtyKeys()).toContain("a");
    expect(getDirtyKeys()).toContain("b");
  });

  it("dirtyCount returns correct count", () => {
    markDirty("a");
    markDirty("b");
    expect(dirtyCount()).toBe(2);
  });
});

// ── Baseline / checkDirty ──────────────────────────────────────────────────

describe("snapshotBaseline + checkDirty", () => {
  it("detects change after snapshot", () => {
    snapshotBaseline("guests", [{ id: "g1" }]);
    const changed = checkDirty("guests", [{ id: "g1" }, { id: "g2" }]);
    expect(changed).toBe(true);
    expect(isDirty("guests")).toBe(true);
  });

  it("returns false when unchanged", () => {
    const value = [{ id: "g1" }];
    snapshotBaseline("guests", value);
    const changed = checkDirty("guests", [{ id: "g1" }]);
    expect(changed).toBe(false);
    expect(isDirty("guests")).toBe(false);
  });

  it("returns false when no baseline set", () => {
    expect(checkDirty("untracked", "anything")).toBe(false);
  });

  it("clearBaselines removes all baselines", () => {
    snapshotBaseline("k", "v");
    clearBaselines();
    expect(checkDirty("k", "v")).toBe(false);
  });
});

// ── getDirtyStateSummary ───────────────────────────────────────────────────

describe("getDirtyStateSummary", () => {
  it("returns empty when clean", () => {
    const s = getDirtyStateSummary();
    expect(s.dirtyKeys).toHaveLength(0);
    expect(s.hasUnsaved).toBe(false);
  });

  it("includes dirty keys and baselines", () => {
    markDirty("guests");
    snapshotBaseline("tables", []);
    const s = getDirtyStateSummary();
    expect(s.dirtyKeys).toContain("guests");
    expect(s.baselineKeys).toContain("tables");
  });
});

// ── createOptimisticManager ────────────────────────────────────────────────

describe("createOptimisticManager", () => {
  it("applies a patch optimistically", () => {
    const _data = new Map();
    _data.set("guests", [{ id: "g1", status: "pending" }]);
    const manager = createOptimisticManager(
      (k) => _data.get(k) ?? [],
      (k, v) => _data.set(k, v),
    );
    manager.applyOptimistic("guests", "g1", { status: "confirmed" });
    const guests = _data.get("guests");
    expect(guests[0].status).toBe("confirmed");
  });

  it("rollback restores original value", () => {
    const _data = new Map();
    _data.set("guests", [{ id: "g1", status: "pending" }]);
    const manager = createOptimisticManager(
      (k) => _data.get(k) ?? [],
      (k, v) => _data.set(k, v),
    );
    const { rollback } = manager.applyOptimistic("guests", "g1", { status: "confirmed" });
    rollback();
    expect(_data.get("guests")[0].status).toBe("pending");
  });

  it("commit discards snapshot", () => {
    const _data = new Map();
    _data.set("guests", [{ id: "g1", status: "pending" }]);
    const manager = createOptimisticManager(
      (k) => _data.get(k) ?? [],
      (k, v) => _data.set(k, v),
    );
    const { commit, snapshotId } = manager.applyOptimistic("guests", "g1", { status: "confirmed" });
    commit();
    expect(manager.pendingSnapshots()).toHaveLength(0);
    expect(manager.rollbackOptimistic(snapshotId)).toBe(false);
  });
});

// ── Multi-event CRUD ───────────────────────────────────────────────────────

describe("createEvent", () => {
  it("creates an event and returns an id", () => {
    const id = createEvent({ name: "Our Wedding" });
    expect(id).toMatch(/^evt_/);
  });

  it("throws if name is empty", () => {
    expect(() => createEvent({ name: "" })).toThrow();
    expect(() => createEvent({ name: "  " })).toThrow();
  });

  it("stores date and venue", () => {
    const id = createEvent({ name: "Event", date: "2026-05-01", venue: "Tel Aviv" });
    const evt = getEvent(id);
    expect(evt?.date).toBe("2026-05-01");
    expect(evt?.venue).toBe("Tel Aviv");
  });
});

describe("getEvent", () => {
  it("returns null for unknown id", () => {
    expect(getEvent("ghost")).toBeNull();
  });

  it("returns event for known id", () => {
    const id = createEvent({ name: "Test" });
    expect(getEvent(id)).not.toBeNull();
  });
});

describe("listEvents", () => {
  it("returns empty array when no events", () => {
    expect(listEvents()).toHaveLength(0);
  });

  it("sorts dated events before undated", () => {
    const id1 = createEvent({ name: "Undated" });
    const id2 = createEvent({ name: "Dated", date: "2026-01-01" });
    const list = listEvents();
    expect(list[0].id).toBe(id2);
    expect(list[list.length - 1].id).toBe(id1);
  });
});

describe("updateEvent", () => {
  it("updates event fields", () => {
    const id = createEvent({ name: "Old Name" });
    expect(updateEvent(id, { name: "New Name" })).toBe(true);
    expect(getEvent(id)?.name).toBe("New Name");
  });

  it("returns false for unknown id", () => {
    expect(updateEvent("ghost", { name: "X" })).toBe(false);
  });
});

describe("deleteEvent", () => {
  it("deletes an existing event", () => {
    const id = createEvent({ name: "Delete Me" });
    expect(deleteEvent(id)).toBe(true);
    expect(getEvent(id)).toBeNull();
  });

  it("returns false for unknown id", () => {
    expect(deleteEvent("ghost")).toBe(false);
  });
});

// ── Active event ───────────────────────────────────────────────────────────

describe("setActiveEvent / getActiveEvent / clearActiveEvent", () => {
  it("setActiveEvent returns false when event not found", () => {
    expect(setActiveEvent("ghost")).toBe(false);
  });

  it("setActiveEvent succeeds for existing event", () => {
    const id = createEvent({ name: "Active" });
    expect(setActiveEvent(id)).toBe(true);
    expect(_activeEventId).toBe(id);
  });

  it("getActiveEvent returns null when no active", () => {
    expect(getActiveEvent()).toBeNull();
  });

  it("clearActiveEvent resets to default", () => {
    clearActiveEvent();
    expect(_activeEventId).toBe("default");
  });
});
