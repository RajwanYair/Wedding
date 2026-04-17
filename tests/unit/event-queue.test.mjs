/**
 * tests/unit/event-queue.test.mjs — Sprint 167
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventQueue } from "../../src/utils/event-queue.js";

/** @type {EventQueue<string>} */
let q;

beforeEach(() => {
  q = new EventQueue();
});

describe("enqueue / size / isEmpty", () => {
  it("starts empty", () => {
    expect(q.isEmpty).toBe(true);
    expect(q.size).toBe(0);
  });

  it("increases size on enqueue", () => {
    q.enqueue("a", "payload");
    expect(q.size).toBe(1);
    expect(q.isEmpty).toBe(false);
  });

  it("stores multiple items", () => {
    q.enqueue("a", "1");
    q.enqueue("b", "2");
    expect(q.size).toBe(2);
  });
});

describe("deduplication (last-write-wins)", () => {
  it("replaces existing item with same key", () => {
    q.enqueue("a", "first");
    q.enqueue("a", "second");
    expect(q.size).toBe(1);
    expect(q.dequeue()?.payload).toBe("second");
  });

  it("no dedup when disabled", () => {
    const q2 = new EventQueue({ deduplicate: false });
    q2.enqueue("a", "first");
    q2.enqueue("a", "second");
    expect(q2.size).toBe(2);
  });
});

describe("priority ordering", () => {
  it("high priority items come first", () => {
    q.enqueue("low1", "l", "low");
    q.enqueue("normal1", "n", "normal");
    q.enqueue("high1", "h", "high");
    expect(q.dequeue()?.key).toBe("high1");
    expect(q.dequeue()?.key).toBe("normal1");
    expect(q.dequeue()?.key).toBe("low1");
  });

  it("FIFO within same priority", () => {
    q.enqueue("a", "1", "normal");
    q.enqueue("b", "2", "normal");
    expect(q.dequeue()?.key).toBe("a");
    expect(q.dequeue()?.key).toBe("b");
  });
});

describe("dequeue / peek", () => {
  it("peek does not consume item", () => {
    q.enqueue("a", "v");
    q.peek();
    expect(q.size).toBe(1);
  });

  it("dequeue returns undefined when empty", () => {
    expect(q.dequeue()).toBeUndefined();
  });

  it("dequeue removes item", () => {
    q.enqueue("a", "v");
    q.dequeue();
    expect(q.size).toBe(0);
  });
});

describe("keys", () => {
  it("returns keys in priority order", () => {
    q.enqueue("b", "n", "normal");
    q.enqueue("a", "h", "high");
    expect(q.keys()).toEqual(["a", "b"]);
  });
});

describe("clear", () => {
  it("empties the queue", () => {
    q.enqueue("a", "1");
    q.enqueue("b", "2");
    q.clear();
    expect(q.isEmpty).toBe(true);
  });
});

describe("drain", () => {
  it("processes all items and calls consumer", async () => {
    const seen = [];
    q.enqueue("a", "1");
    q.enqueue("b", "2");
    await q.drain(async (item) => { seen.push(item.key); });
    expect(seen).toEqual(["a", "b"]);
    expect(q.isEmpty).toBe(true);
  });

  it("processes items added during drain", async () => {
    const seen = [];
    q.enqueue("a", "1");
    let added = false;
    await q.drain(async (item) => {
      seen.push(item.key);
      if (!added) {
        added = true;
        q.enqueue("b", "2");
      }
    });
    expect(seen).toContain("b");
  });

  it("does not start concurrent drain", async () => {
    const calls = [];
    q.enqueue("a", "v");
    const p1 = q.drain(async (item) => { calls.push(item.key); await Promise.resolve(); });
    const p2 = q.drain(async (item) => { calls.push("dup-" + item.key); });
    await Promise.all([p1, p2]);
    expect(calls.filter((c) => c.startsWith("dup-"))).toHaveLength(0);
  });
});

describe("onDrain", () => {
  it("fires callback after drain", async () => {
    const fn = vi.fn();
    q.onDrain(fn);
    q.enqueue("a", "v");
    await q.drain(async () => {});
    expect(fn).toHaveBeenCalledOnce();
  });

  it("unsubscribe stops notifications", async () => {
    const fn = vi.fn();
    const unsub = q.onDrain(fn);
    unsub();
    q.enqueue("a", "v");
    await q.drain(async () => {});
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("size cap", () => {
  it("drops low-priority items when full", () => {
    const qq = new EventQueue({ maxSize: 3 });
    qq.enqueue("low1", "l", "low");
    qq.enqueue("a", "n", "normal");
    qq.enqueue("b", "n", "normal");
    qq.enqueue("c", "n", "normal"); // should evict low1
    expect(qq.keys()).not.toContain("low1");
    expect(qq.size).toBe(3);
  });
});
