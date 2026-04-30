import { describe, it, expect } from "vitest";
import {
  addTask,
  completeTask,
  daysUntil,
  pendingTasks,
  groupByDueWindow,
  progress,
} from "../../src/utils/task-list.js";

describe("task-list", () => {
  it("addTask appends new task with default done=false", () => {
    const out = addTask([], { id: "a", title: "Book DJ" });
    expect(out).toHaveLength(1);
    expect(out[0].done).toBe(false);
  });

  it("addTask preserves explicit done flag", () => {
    const out = addTask([], { id: "a", title: "x", done: true });
    expect(out[0].done).toBe(true);
  });

  it("addTask throws on missing id/title", () => {
    expect(() => addTask([], {})).toThrow(TypeError);
    expect(() => addTask([], { id: "a" })).toThrow(TypeError);
  });

  it("addTask throws on duplicate id", () => {
    expect(() =>
      addTask([{ id: "a", title: "x" }], { id: "a", title: "y" }),
    ).toThrow(RangeError);
  });

  it("completeTask marks the matching task", () => {
    const out = completeTask(
      [{ id: "a", title: "x" }],
      "a",
      "2026-01-01T00:00:00Z",
    );
    expect(out[0].done).toBe(true);
    expect(out[0].doneAt).toBe("2026-01-01T00:00:00Z");
  });

  it("completeTask is no-op on unknown id", () => {
    const out = completeTask([{ id: "a", title: "x" }], "b");
    expect(out[0].done).toBeUndefined();
  });

  it("daysUntil returns positive for future date", () => {
    const now = Date.parse("2026-09-01T00:00:00Z");
    expect(daysUntil("2026-09-11T00:00:00Z", now)).toBe(10);
  });

  it("daysUntil returns negative for past date", () => {
    const now = Date.parse("2026-09-15T00:00:00Z");
    expect(daysUntil("2026-09-10T00:00:00Z", now)).toBe(-5);
  });

  it("daysUntil returns NaN for invalid date", () => {
    expect(Number.isNaN(daysUntil("nonsense"))).toBe(true);
  });

  it("pendingTasks excludes done", () => {
    const out = pendingTasks([
      { id: "a", title: "x", done: true },
      { id: "b", title: "y" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("b");
  });

  it("groupByDueWindow buckets tasks", () => {
    const tasks = [
      { id: "a", title: "Book venue", daysBefore: 365 },
      { id: "b", title: "Send invites", daysBefore: 70 },
      { id: "c", title: "Final headcount", daysBefore: 53 },
      { id: "d", title: "Pickup dress", daysBefore: 49 },
      { id: "e", title: "No date" },
    ];
    const g = groupByDueWindow(tasks, 50);
    expect(g.overdue.map((t) => t.id)).toEqual(["d"]);
    expect(g.dueThisWeek.map((t) => t.id)).toEqual(["c"]);
    expect(g.dueThisMonth.map((t) => t.id)).toEqual(["b"]);
    expect(g.later.map((t) => t.id)).toEqual(["a", "e"]);
  });

  it("groupByDueWindow ignores done tasks", () => {
    const g = groupByDueWindow(
      [{ id: "a", title: "x", daysBefore: 1, done: true }],
      30,
    );
    expect(g.overdue).toHaveLength(0);
  });

  it("progress returns 0..1 ratio", () => {
    expect(progress([])).toBe(0);
    expect(
      progress([
        { id: "a", title: "x", done: true },
        { id: "b", title: "y" },
      ]),
    ).toBe(0.5);
  });
});
