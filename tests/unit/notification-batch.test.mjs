import { describe, it, expect } from "vitest";
import {
  enqueue,
  takeBatch,
  groupByCategory,
  pruneOlderThan,
} from "../../src/utils/notification-batch.js";

describe("notification-batch", () => {
  it("enqueue appends with default priority and timestamp", () => {
    const out = enqueue([], { id: "a", message: "hi" });
    expect(out).toHaveLength(1);
    expect(out[0].priority).toBe(0);
    expect(typeof out[0].createdAt).toBe("string");
  });

  it("enqueue preserves explicit priority", () => {
    const out = enqueue([], { id: "a", message: "x", priority: 5 });
    expect(out[0].priority).toBe(5);
  });

  it("enqueue throws on missing id", () => {
    expect(() => enqueue([], { message: "x" })).toThrow(TypeError);
  });

  it("takeBatch drains in priority order", () => {
    const q = [
      { id: "a", message: "x", priority: 1 },
      { id: "b", message: "x", priority: 5 },
      { id: "c", message: "x", priority: 3 },
    ];
    const { batch } = takeBatch(q, { size: 2 });
    expect(batch.map((n) => n.id)).toEqual(["b", "c"]);
  });

  it("takeBatch is stable for equal priorities (FIFO)", () => {
    const q = [
      { id: "a", message: "x" },
      { id: "b", message: "x" },
      { id: "c", message: "x" },
    ];
    const { batch } = takeBatch(q, { size: 2 });
    expect(batch.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("takeBatch returns remaining items not in batch", () => {
    const q = [
      { id: "a", message: "x" },
      { id: "b", message: "x" },
      { id: "c", message: "x" },
    ];
    const { remaining } = takeBatch(q, { size: 2 });
    expect(remaining.map((n) => n.id)).toEqual(["c"]);
  });

  it("takeBatch respects category filter", () => {
    const q = [
      { id: "a", message: "x", category: "rsvp" },
      { id: "b", message: "x", category: "tip" },
    ];
    const { batch, remaining } = takeBatch(q, { category: "tip" });
    expect(batch.map((n) => n.id)).toEqual(["b"]);
    expect(remaining.map((n) => n.id)).toEqual(["a"]);
  });

  it("takeBatch respects minPriority filter", () => {
    const q = [
      { id: "a", message: "x", priority: 1 },
      { id: "b", message: "x", priority: 4 },
    ];
    const { batch } = takeBatch(q, { minPriority: 3 });
    expect(batch.map((n) => n.id)).toEqual(["b"]);
  });

  it("takeBatch defaults size to 10", () => {
    const q = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, message: "x" }));
    const { batch } = takeBatch(q);
    expect(batch).toHaveLength(10);
  });

  it("groupByCategory buckets correctly with default key", () => {
    const m = groupByCategory([
      { id: "a", message: "x", category: "rsvp" },
      { id: "b", message: "x" },
    ]);
    expect(m.get("rsvp")).toHaveLength(1);
    expect(m.get("_uncategorised")).toHaveLength(1);
  });

  it("pruneOlderThan removes stale entries", () => {
    const now = Date.parse("2026-05-01T00:00:00.000Z");
    const q = [
      { id: "a", message: "x", createdAt: "2026-04-01T00:00:00.000Z" },
      { id: "b", message: "x", createdAt: "2026-04-30T22:00:00.000Z" },
    ];
    const out = pruneOlderThan(q, 24 * 60 * 60 * 1000, now);
    expect(out.map((n) => n.id)).toEqual(["b"]);
  });

  it("pruneOlderThan keeps undated entries", () => {
    const out = pruneOlderThan([{ id: "a", message: "x" }], 1000);
    expect(out).toHaveLength(1);
  });

  it("pruneOlderThan returns copy when maxAgeMs invalid", () => {
    const q = [{ id: "a", message: "x", createdAt: "2020-01-01T00:00:00.000Z" }];
    expect(pruneOlderThan(q, NaN)).toEqual(q);
    expect(pruneOlderThan(q, -1)).toEqual(q);
  });
});
