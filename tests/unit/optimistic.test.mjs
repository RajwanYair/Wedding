/**
 * tests/unit/optimistic.test.mjs — Unit tests for optimistic update helpers (Phase 2)
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  withOptimistic,
  createOptimisticCheckpoint,
  withOptimisticBatch,
  optimisticAppend,
  optimisticRemove,
} from "../../src/utils/optimistic.js";

function seed(overrides = {}) {
  initStore({
    guests: { value: overrides.guests ?? [] },
    tables: { value: overrides.tables ?? [] },
  });
}

// ── withOptimistic ────────────────────────────────────────────────────────

describe("withOptimistic — success path", () => {
  beforeEach(() => seed({ guests: [{ id: "g1", name: "Alice" }] }));

  it("applies mutation to store immediately", async () => {
    let storeValueDuringOp;
    await withOptimistic(
      "guests",
      (curr) => [...curr, { id: "g2", name: "Bob" }],
      async () => {
        storeValueDuringOp = storeGet("guests");
        return {};
      },
    );
    expect(storeValueDuringOp).toHaveLength(2);
  });

  it("keeps mutation on success", async () => {
    await withOptimistic(
      "guests",
      (curr) => [...curr, { id: "g2", name: "Bob" }],
      async () => ({}),
    );
    expect(storeGet("guests")).toHaveLength(2);
  });

  it("returns server result on success", async () => {
    const result = await withOptimistic(
      "guests",
      (c) => c,
      async () => ({ saved: true }),
    );
    expect(result).toEqual({ saved: true });
  });

  it("calls onSuccess callback", async () => {
    const onSuccess = vi.fn();
    await withOptimistic("guests", (c) => c, async () => "ok", { onSuccess });
    expect(onSuccess).toHaveBeenCalledWith("ok");
  });

  it("calls onSettle callback on success", async () => {
    const onSettle = vi.fn();
    await withOptimistic("guests", (c) => c, async () => {}, { onSettle });
    expect(onSettle).toHaveBeenCalled();
  });
});

describe("withOptimistic — failure path", () => {
  beforeEach(() => seed({ guests: [{ id: "g1", name: "Alice" }] }));

  it("rolls back store on rejection", async () => {
    await expect(
      withOptimistic(
        "guests",
        (curr) => [...curr, { id: "g2", name: "Bob" }],
        async () => { throw new Error("save failed"); },
      ),
    ).rejects.toThrow("save failed");
    expect(storeGet("guests")).toHaveLength(1);
    expect(storeGet("guests")[0].id).toBe("g1");
  });

  it("calls onError callback", async () => {
    const onError = vi.fn();
    await expect(
      withOptimistic("guests", (c) => c, async () => { throw new Error("oops"); }, { onError }),
    ).rejects.toThrow();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "oops" }));
  });

  it("calls onSettle callback on failure", async () => {
    const onSettle = vi.fn();
    await expect(
      withOptimistic("guests", (c) => c, async () => { throw new Error("x"); }, { onSettle }),
    ).rejects.toThrow();
    expect(onSettle).toHaveBeenCalled();
  });

  it("re-throws the original error", async () => {
    const err = new Error("specific error");
    await expect(
      withOptimistic("guests", (c) => c, async () => { throw err; }),
    ).rejects.toBe(err);
  });
});

// ── createOptimisticCheckpoint ─────────────────────────────────────────────

describe("createOptimisticCheckpoint", () => {
  beforeEach(() => seed({ guests: [{ id: "x", n: "X" }] }));

  it("returns a snapshot", () => {
    const { snapshot } = createOptimisticCheckpoint("guests");
    expect(snapshot).toHaveLength(1);
  });

  it("snapshot is independent of store", () => {
    const { snapshot } = createOptimisticCheckpoint("guests");
    storeSet("guests", []);
    expect(snapshot).toHaveLength(1); // unchanged clone
  });

  it("rollback() restores store", () => {
    const { rollback } = createOptimisticCheckpoint("guests");
    storeSet("guests", []);
    rollback();
    expect(storeGet("guests")).toHaveLength(1);
  });

  it("handles null store value", () => {
    storeSet("tables", null);
    const { snapshot, rollback } = createOptimisticCheckpoint("tables");
    expect(snapshot).toBeNull();
    storeSet("tables", [{ id: "t1" }]);
    rollback();
    expect(storeGet("tables")).toBeNull();
  });
});

// ── withOptimisticBatch ───────────────────────────────────────────────────

describe("withOptimisticBatch", () => {
  beforeEach(() =>
    seed({
      guests: [{ id: "g1" }],
      tables: [{ id: "t1" }],
    }),
  );

  it("applies all mutations", async () => {
    await withOptimisticBatch(
      [
        { key: "guests", mutate: (c) => [...c, { id: "g2" }] },
        { key: "tables", mutate: (c) => [...c, { id: "t2" }] },
      ],
      async () => {},
    );
    expect(storeGet("guests")).toHaveLength(2);
    expect(storeGet("tables")).toHaveLength(2);
  });

  it("rolls back all keys on failure", async () => {
    await expect(
      withOptimisticBatch(
        [
          { key: "guests", mutate: (c) => [...c, { id: "g2" }] },
          { key: "tables", mutate: (c) => [...c, { id: "t2" }] },
        ],
        async () => { throw new Error("batch fail"); },
      ),
    ).rejects.toThrow();
    expect(storeGet("guests")).toHaveLength(1);
    expect(storeGet("tables")).toHaveLength(1);
  });
});

// ── optimisticAppend ──────────────────────────────────────────────────────

describe("optimisticAppend", () => {
  beforeEach(() => seed({ guests: [{ id: "g1" }] }));

  it("appends item immediately", async () => {
    let snapDuring;
    await optimisticAppend("guests", { id: "g2" }, async () => {
      snapDuring = storeGet("guests");
      return { id: "g2" };
    });
    expect(snapDuring).toHaveLength(2);
    expect(storeGet("guests")).toHaveLength(2);
  });

  it("removes appended item on failure", async () => {
    await expect(
      optimisticAppend("guests", { id: "g99" }, async () => { throw new Error("x"); }),
    ).rejects.toThrow();
    expect(storeGet("guests")).toHaveLength(1);
  });
});

// ── optimisticRemove ──────────────────────────────────────────────────────

describe("optimisticRemove", () => {
  beforeEach(() => seed({ guests: [{ id: "g1" }, { id: "g2" }] }));

  it("removes item immediately", async () => {
    let snapDuring;
    await optimisticRemove("guests", "g1", async () => {
      snapDuring = storeGet("guests");
    });
    expect(snapDuring).toHaveLength(1);
    expect(storeGet("guests")[0].id).toBe("g2");
  });

  it("restores item on failure", async () => {
    await expect(
      optimisticRemove("guests", "g1", async () => { throw new Error("del fail"); }),
    ).rejects.toThrow();
    expect(storeGet("guests")).toHaveLength(2);
  });
});
