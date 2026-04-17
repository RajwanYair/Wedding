/**
 * tests/unit/guest-repository.test.mjs — Tests for BaseRepository + GuestRepository (Sprint 53)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { BaseRepository } from "../../src/repositories/base-repository.js";
import { GuestRepository } from "../../src/repositories/guest-repository.js";

// ── Minimal in-memory store stub ──────────────────────────────────────────

function makeStore() {
  const db = {};
  const storeGet = (key) => db[key] ?? [];
  const storeSet = (key, items) => { db[key] = items; };
  const storeUpsert = (key, item) => {
    const list = db[key] ?? [];
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx === -1) db[key] = [...list, item];
    else {
      const next = [...list];
      next[idx] = item;
      db[key] = next;
    }
  };
  return { storeGet, storeSet, storeUpsert };
}

// ── BaseRepository ────────────────────────────────────────────────────────

describe("BaseRepository", () => {
  let repo;
  let store;

  beforeEach(() => {
    store = makeStore();
    repo = new BaseRepository("items", store.storeGet, store.storeSet, store.storeUpsert);
  });

  it("findAll returns empty array when store is empty", () => {
    expect(repo.findAll()).toStrictEqual([]);
  });

  it("create adds an item; findAll returns it", () => {
    repo.create({ id: "1", name: "A" });
    expect(repo.findAll()).toHaveLength(1);
  });

  it("findById returns matching item", () => {
    repo.create({ id: "abc", name: "B" });
    expect(repo.findById("abc")?.name).toBe("B");
  });

  it("findById returns undefined for missing id", () => {
    expect(repo.findById("nope")).toBeUndefined();
  });

  it("upsert updates existing item", () => {
    repo.create({ id: "1", name: "Before" });
    repo.upsert({ id: "1", name: "After" });
    expect(repo.findAll()).toHaveLength(1);
    expect(repo.findById("1")?.name).toBe("After");
  });

  it("update merges patch onto existing item", () => {
    repo.create({ id: "x", a: 1, b: 2 });
    const updated = repo.update("x", { b: 99 });
    expect(updated?.a).toBe(1);
    expect(updated?.b).toBe(99);
  });

  it("update returns undefined for missing id", () => {
    expect(repo.update("missing", { a: 1 })).toBeUndefined();
  });

  it("delete removes item and returns true", () => {
    repo.create({ id: "del", v: 1 });
    expect(repo.delete("del")).toBe(true);
    expect(repo.findById("del")).toBeUndefined();
  });

  it("delete returns false for missing id", () => {
    expect(repo.delete("ghost")).toBe(false);
  });

  it("count returns item count", () => {
    repo.create({ id: "1" });
    repo.create({ id: "2" });
    expect(repo.count()).toBe(2);
  });

  it("clear removes all items", () => {
    repo.create({ id: "1" });
    repo.clear();
    expect(repo.count()).toBe(0);
  });

  it("exists returns true/false correctly", () => {
    repo.create({ id: "here" });
    expect(repo.exists("here")).toBe(true);
    expect(repo.exists("gone")).toBe(false);
  });
});

// ── GuestRepository ───────────────────────────────────────────────────────

describe("GuestRepository", () => {
  let repo;
  const g = (id, overrides = {}) => ({
    id,
    status: "pending",
    side: "groom",
    group: "friends",
    phone: "0501234567",
    checkedIn: false,
    tableId: null,
    count: 1,
    children: 0,
    ...overrides,
  });

  beforeEach(() => {
    const store = makeStore();
    repo = new GuestRepository(store.storeGet, store.storeSet, store.storeUpsert);
  });

  it("findByStatus returns only matching guests", () => {
    repo.create(g("a", { status: "confirmed" }));
    repo.create(g("b", { status: "declined" }));
    repo.create(g("c", { status: "confirmed" }));
    expect(repo.findByStatus("confirmed")).toHaveLength(2);
    expect(repo.findByStatus("declined")).toHaveLength(1);
  });

  it("findByTable returns guests at a table", () => {
    repo.create(g("a", { tableId: "t1" }));
    repo.create(g("b", { tableId: "t2" }));
    repo.create(g("c", { tableId: "t1" }));
    expect(repo.findByTable("t1")).toHaveLength(2);
  });

  it("findByPhone normalises phone and matches", () => {
    repo.create(g("a", { phone: "050-123-4567" }));
    const found = repo.findByPhone("0501234567");
    expect(found?.id).toBe("a");
  });

  it("findByPhone returns undefined for no match", () => {
    repo.create(g("a", { phone: "050-111-2222" }));
    expect(repo.findByPhone("050-999-9999")).toBeUndefined();
  });

  it("findBySide filters by side", () => {
    repo.create(g("a", { side: "bride" }));
    repo.create(g("b", { side: "groom" }));
    expect(repo.findBySide("bride")).toHaveLength(1);
  });

  it("findByGroup filters by group", () => {
    repo.create(g("a", { group: "family" }));
    repo.create(g("b", { group: "work" }));
    repo.create(g("c", { group: "family" }));
    expect(repo.findByGroup("family")).toHaveLength(2);
  });

  it("findUncheckedIn returns guests not checked in", () => {
    repo.create(g("a", { checkedIn: false }));
    repo.create(g("b", { checkedIn: true }));
    repo.create(g("c", { checkedIn: false }));
    expect(repo.findUncheckedIn()).toHaveLength(2);
  });

  it("findUnassigned returns guests without tableId", () => {
    repo.create(g("a", { tableId: null }));
    repo.create(g("b", { tableId: "t1" }));
    expect(repo.findUnassigned()).toHaveLength(1);
  });

  it("confirmedCount sums count + children for confirmed guests", () => {
    repo.create(g("a", { status: "confirmed", count: 2, children: 1 }));
    repo.create(g("b", { status: "confirmed", count: 1, children: 0 }));
    repo.create(g("c", { status: "pending", count: 1, children: 0 }));
    expect(repo.confirmedCount()).toBe(4); // (2+1) + (1+0)
  });
});
