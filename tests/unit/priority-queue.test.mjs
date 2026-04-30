import { describe, it, expect } from "vitest";
import { createPriorityQueue } from "../../src/utils/priority-queue.js";

describe("priority-queue", () => {
  it("default compare uses priority field", () => {
    const q = createPriorityQueue();
    q.push({ priority: 5, name: "b" });
    q.push({ priority: 1, name: "a" });
    q.push({ priority: 3, name: "c" });
    expect(q.pop()).toEqual({ priority: 1, name: "a" });
    expect(q.pop()).toEqual({ priority: 3, name: "c" });
    expect(q.pop()).toEqual({ priority: 5, name: "b" });
  });

  it("custom compare for raw numbers", () => {
    const q = createPriorityQueue({ compare: (a, b) => a - b });
    [5, 1, 3, 2, 4].forEach((n) => q.push(n));
    expect([q.pop(), q.pop(), q.pop(), q.pop(), q.pop()]).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("max-heap via reversed compare", () => {
    const q = createPriorityQueue({ compare: (a, b) => b - a });
    [1, 5, 3].forEach((n) => q.push(n));
    expect(q.pop()).toBe(5);
    expect(q.pop()).toBe(3);
    expect(q.pop()).toBe(1);
  });

  it("pop on empty returns undefined", () => {
    const q = createPriorityQueue();
    expect(q.pop()).toBeUndefined();
  });

  it("peek returns top without removing", () => {
    const q = createPriorityQueue({ compare: (a, b) => a - b });
    q.push(2);
    q.push(1);
    expect(q.peek()).toBe(1);
    expect(q.size).toBe(2);
  });

  it("size tracks pushes and pops", () => {
    const q = createPriorityQueue({ compare: (a, b) => a - b });
    expect(q.size).toBe(0);
    q.push(1);
    q.push(2);
    expect(q.size).toBe(2);
    q.pop();
    expect(q.size).toBe(1);
  });

  it("clear empties the heap", () => {
    const q = createPriorityQueue({ compare: (a, b) => a - b });
    q.push(1);
    q.push(2);
    q.clear();
    expect(q.size).toBe(0);
    expect(q.pop()).toBeUndefined();
  });

  it("toArray returns a snapshot copy", () => {
    const q = createPriorityQueue({ compare: (a, b) => a - b });
    q.push(2);
    q.push(1);
    const snap = q.toArray();
    snap.push(99);
    expect(q.size).toBe(2);
  });

  it("handles many items in correct order", () => {
    const q = createPriorityQueue({ compare: (a, b) => a - b });
    const input = [];
    for (let i = 0; i < 100; i += 1) input.push(Math.floor(Math.random() * 100));
    for (const v of input) q.push(v);
    const out = [];
    while (q.size > 0) out.push(q.pop());
    const sorted = [...input].sort((a, b) => a - b);
    expect(out).toEqual(sorted);
  });

  it("compare with strings", () => {
    const q = createPriorityQueue({ compare: (a, b) => a.localeCompare(b) });
    ["b", "c", "a"].forEach((s) => q.push(s));
    expect(q.pop()).toBe("a");
    expect(q.pop()).toBe("b");
  });

  it("missing priority field defaults to 0", () => {
    const q = createPriorityQueue();
    q.push({ name: "x" });
    q.push({ priority: -1, name: "y" });
    expect(q.pop()).toEqual({ priority: -1, name: "y" });
  });

  it("stable peek when empty", () => {
    const q = createPriorityQueue();
    expect(q.peek()).toBeUndefined();
  });
});
