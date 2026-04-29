/**
 * tests/unit/optimistic-updates.test.mjs — Tests for optimistic-updates.js (Sprint 69)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createOptimisticManager } from "../../src/services/state-tracking.js";

function makeStore(initial = {}) {
  const db = { ...initial };
  return {
    get: (k) => db[k] ?? [],
    set: (k, v) => { db[k] = v; },
    raw: db,
  };
}

describe("applyOptimistic", () => {
  it("applies patch immediately to the store", () => {
    const store = makeStore({ guests: [{ id: "g1", status: "pending" }] });
    const opt = createOptimisticManager(store.get, store.set);
    opt.applyOptimistic("guests", "g1", { status: "confirmed" });
    expect(store.raw.guests[0].status).toBe("confirmed");
  });

  it("does not mutate other records", () => {
    const store = makeStore({
      guests: [
        { id: "g1", status: "pending" },
        { id: "g2", status: "pending" },
      ],
    });
    const opt = createOptimisticManager(store.get, store.set);
    opt.applyOptimistic("guests", "g1", { status: "confirmed" });
    expect(store.raw.guests[1].status).toBe("pending");
  });

  it("returns a snapshotId", () => {
    const store = makeStore({ guests: [{ id: "g1", status: "pending" }] });
    const opt = createOptimisticManager(store.get, store.set);
    const { snapshotId } = opt.applyOptimistic("guests", "g1", { status: "confirmed" });
    expect(typeof snapshotId).toBe("string");
    expect(snapshotId.length).toBeGreaterThan(0);
  });

  it("returns empty snapshotId when record not found", () => {
    const store = makeStore({ guests: [] });
    const opt = createOptimisticManager(store.get, store.set);
    const { snapshotId } = opt.applyOptimistic("guests", "nonexistent", { status: "confirmed" });
    expect(snapshotId).toBe("");
  });
});

describe("rollbackOptimistic", () => {
  it("restores the original value", () => {
    const store = makeStore({ guests: [{ id: "g1", status: "pending" }] });
    const opt = createOptimisticManager(store.get, store.set);
    const { rollback } = opt.applyOptimistic("guests", "g1", { status: "confirmed" });
    rollback();
    expect(store.raw.guests[0].status).toBe("pending");
  });

  it("returns true on successful rollback", () => {
    const store = makeStore({ guests: [{ id: "g1", count: 1 }] });
    const opt = createOptimisticManager(store.get, store.set);
    const { snapshotId } = opt.applyOptimistic("guests", "g1", { count: 5 });
    expect(opt.rollbackOptimistic(snapshotId)).toBe(true);
  });

  it("returns false for unknown snapshotId", () => {
    const store = makeStore({ guests: [] });
    const opt = createOptimisticManager(store.get, store.set);
    expect(opt.rollbackOptimistic("__nonexistent__")).toBe(false);
  });

  it("removes snapshot after rollback", () => {
    const store = makeStore({ guests: [{ id: "g1", status: "pending" }] });
    const opt = createOptimisticManager(store.get, store.set);
    const { snapshotId, rollback } = opt.applyOptimistic("guests", "g1", { status: "confirmed" });
    rollback();
    expect(opt.pendingSnapshots()).not.toContain(snapshotId);
  });
});

describe("commitOptimistic", () => {
  it("removes snapshot without rolling back", () => {
    const store = makeStore({ guests: [{ id: "g1", status: "pending" }] });
    const opt = createOptimisticManager(store.get, store.set);
    const { snapshotId, commit } = opt.applyOptimistic("guests", "g1", { status: "confirmed" });
    commit();
    expect(store.raw.guests[0].status).toBe("confirmed");
    expect(opt.pendingSnapshots()).not.toContain(snapshotId);
  });

  it("returns true on success", () => {
    const store = makeStore({ guests: [{ id: "g1", count: 1 }] });
    const opt = createOptimisticManager(store.get, store.set);
    const { snapshotId } = opt.applyOptimistic("guests", "g1", { count: 5 });
    expect(opt.commitOptimistic(snapshotId)).toBe(true);
  });
});

describe("pendingSnapshots", () => {
  it("tracks all pending snapshot IDs", () => {
    const store = makeStore({
      guests: [{ id: "g1", count: 1 }, { id: "g2", count: 2 }],
    });
    const opt = createOptimisticManager(store.get, store.set);
    const { snapshotId: id1 } = opt.applyOptimistic("guests", "g1", { count: 5 });
    const { snapshotId: id2 } = opt.applyOptimistic("guests", "g2", { count: 10 });
    const pending = opt.pendingSnapshots();
    expect(pending).toContain(id1);
    expect(pending).toContain(id2);
  });
});

describe("rollbackAll", () => {
  it("rolls back all pending snapshots and returns count", () => {
    const store = makeStore({
      guests: [{ id: "g1", count: 1 }, { id: "g2", count: 2 }],
    });
    const opt = createOptimisticManager(store.get, store.set);
    opt.applyOptimistic("guests", "g1", { count: 99 });
    opt.applyOptimistic("guests", "g2", { count: 99 });
    const count = opt.rollbackAll();
    expect(count).toBe(2);
    expect(opt.pendingSnapshots()).toHaveLength(0);
  });
});

describe("commitAll", () => {
  it("commits all pending snapshots and returns count", () => {
    const store = makeStore({
      guests: [{ id: "g1", count: 1 }, { id: "g2", count: 2 }],
    });
    const opt = createOptimisticManager(store.get, store.set);
    opt.applyOptimistic("guests", "g1", { count: 99 });
    opt.applyOptimistic("guests", "g2", { count: 99 });
    const count = opt.commitAll();
    expect(count).toBe(2);
    expect(store.raw.guests[0].count).toBe(99);
    expect(opt.pendingSnapshots()).toHaveLength(0);
  });
});
