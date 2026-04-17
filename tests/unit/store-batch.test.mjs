/**
 * tests/unit/store-batch.test.mjs — Unit tests for store-batch.js (Sprint 58)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { vi } from "vitest";

// Set up localStorage stub before dynamic imports
const localStorageStub = (() => {
  let store = {};
  return {
    getItem: (k) => Object.hasOwn(store, k) ? store[k] : null,
    setItem: (k, v) => { store[k] = v; },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
vi.stubGlobal("localStorage", localStorageStub);

const { initStore, storeGet } = await import("../../src/core/store.js");
const {
  storeBatchMutate,
  upsertMutation,
  updateMutation,
  removeMutation,
  setMutation,
} = await import("../../src/utils/store-batch.js");

beforeEach(() => {
  localStorageStub.clear();
  initStore({
    guests: { value: [] },
    tables: { value: [] },
    budget: { value: { total: 0 } },
  });
});

describe("storeBatchMutate", () => {
  it("applies upsert mutation", () => {
    const result = storeBatchMutate([
      { type: "upsert", key: "guests", item: { id: "g1", name: "Alice" } },
    ]);
    expect(result.applied).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(storeGet("guests")).toHaveLength(1);
    expect(storeGet("guests")[0].name).toBe("Alice");
  });

  it("applies set mutation", () => {
    storeBatchMutate([
      { type: "set", key: "budget", value: { total: 1000 } },
    ]);
    expect(storeGet("budget").total).toBe(1000);
  });

  it("applies update mutation", () => {
    initStore({ guests: { value: [{ id: "g1", status: "pending" }] } });
    storeBatchMutate([
      { type: "update", key: "guests", id: "g1", patch: { status: "confirmed" } },
    ]);
    expect(storeGet("guests")[0].status).toBe("confirmed");
  });

  it("applies remove mutation", () => {
    initStore({ guests: { value: [{ id: "g1" }, { id: "g2" }] } });
    storeBatchMutate([
      { type: "remove", key: "guests", id: "g1" },
    ]);
    expect(storeGet("guests")).toHaveLength(1);
    expect(storeGet("guests")[0].id).toBe("g2");
  });

  it("applies multiple mutations in one batch", () => {
    storeBatchMutate([
      { type: "upsert", key: "guests", item: { id: "g1", status: "pending" } },
      { type: "upsert", key: "guests", item: { id: "g2", status: "confirmed" } },
      { type: "upsert", key: "tables", item: { id: "t1", name: "Head" } },
    ]);
    expect(storeGet("guests")).toHaveLength(2);
    expect(storeGet("tables")).toHaveLength(1);
  });

  it("records error for unknown mutation type; still applies rest", () => {
    storeBatchMutate([
      { type: "upsert", key: "guests", item: { id: "g1" } },
    ]);
    // Inject an invalid type via type cast
    const result = storeBatchMutate([
      /** @type {*} */ ({ type: "delete_all", key: "guests" }),
      { type: "upsert", key: "guests", item: { id: "g2" } },
    ]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].index).toBe(0);
    expect(result.applied).toBe(1);
  });

  it("returns applied count correctly", () => {
    const result = storeBatchMutate([
      { type: "set", key: "budget", value: { total: 5000 } },
      { type: "upsert", key: "guests", item: { id: "g1" } },
    ]);
    expect(result.applied).toBe(2);
  });
});

describe("mutation factory helpers", () => {
  it("upsertMutation builds correct descriptor", () => {
    const m = upsertMutation("guests", { id: "g1" });
    expect(m.type).toBe("upsert");
    expect(m.key).toBe("guests");
    expect(m.item.id).toBe("g1");
  });

  it("updateMutation builds correct descriptor", () => {
    const m = updateMutation("guests", "g1", { status: "confirmed" });
    expect(m.type).toBe("update");
    expect(m.id).toBe("g1");
    expect(m.patch.status).toBe("confirmed");
  });

  it("removeMutation builds correct descriptor", () => {
    const m = removeMutation("guests", "g1");
    expect(m.type).toBe("remove");
    expect(m.id).toBe("g1");
  });

  it("setMutation builds correct descriptor", () => {
    const m = setMutation("budget", { total: 999 });
    expect(m.type).toBe("set");
    expect(m.value).toStrictEqual({ total: 999 });
  });
});
