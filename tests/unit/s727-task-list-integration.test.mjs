/**
 * S727 integration tests — Task list wired into run-of-show.js
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn() }));
vi.mock("../../src/services/schedule.js", () => ({
  loadRunOfShow: vi.fn(() => []),
  saveRunOfShow: vi.fn(),
  buildDefaultTimeline: vi.fn(() => []),
  sortTimeline: vi.fn((x) => x),
  detectOverlaps: vi.fn(() => []),
}));

import {
  addTaskToList,
  completeTaskInList,
  getDaysUntilEvent,
  getPendingTasks,
  groupTasksByDueWindow,
  getTaskProgress,
} from "../../src/sections/run-of-show.js";

describe("S727 -- addTaskToList", () => {
  it("adds a task to an empty list", () => {
    const tasks = addTaskToList([], { id: "t1", title: "Book venue" });
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe("Book venue");
    expect(tasks[0].done).toBe(false);
  });

  it("throws on duplicate id", () => {
    const tasks = addTaskToList([], { id: "t1", title: "A" });
    expect(() => addTaskToList(tasks, { id: "t1", title: "B" })).toThrow();
  });

  it("throws on missing title", () => {
    expect(() => addTaskToList([], { id: "t1", title: "" })).toThrow();
  });
});

describe("S727 -- completeTaskInList", () => {
  it("marks a task as done", () => {
    const tasks = addTaskToList([], { id: "t1", title: "Send invitations" });
    const updated = completeTaskInList(tasks, "t1");
    expect(updated[0].done).toBe(true);
    expect(updated[0]).toHaveProperty("doneAt");
  });

  it("ignores unknown id (returns unchanged array)", () => {
    const tasks = addTaskToList([], { id: "t1", title: "A" });
    const updated = completeTaskInList(tasks, "unknown");
    expect(updated[0].done).toBe(false);
  });
});

describe("S727 -- getDaysUntilEvent", () => {
  it("returns positive days for future date", () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(getDaysUntilEvent(future)).toBeGreaterThan(0);
  });

  it("returns negative days for past date", () => {
    const past = new Date(Date.now() - 10 * 86400000).toISOString();
    expect(getDaysUntilEvent(past)).toBeLessThan(0);
  });

  it("uses provided now timestamp", () => {
    const now = Date.parse("2026-06-01T00:00:00Z");
    const event = "2026-06-15T00:00:00Z";
    expect(getDaysUntilEvent(event, now)).toBe(14);
  });
});

describe("S727 -- getPendingTasks", () => {
  it("returns only tasks not yet done", () => {
    let tasks = addTaskToList([], { id: "t1", title: "A" });
    tasks = addTaskToList(tasks, { id: "t2", title: "B" });
    tasks = completeTaskInList(tasks, "t1");
    const pending = getPendingTasks(tasks);
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe("t2");
  });
});

describe("S727 -- groupTasksByDueWindow", () => {
  it("groups tasks into overdue / dueThisWeek / dueThisMonth / later", () => {
    const tasks = [
      { id: "a", title: "Overdue", done: false, daysBefore: 50 },
      { id: "b", title: "ThisWeek", done: false, daysBefore: 42 },
      { id: "c", title: "Later", done: false, daysBefore: 5 },
    ];
    const groups = groupTasksByDueWindow(tasks, 45);
    expect(groups).toHaveProperty("overdue");
    expect(groups).toHaveProperty("dueThisWeek");
    expect(groups).toHaveProperty("later");
  });
});

describe("S727 -- getTaskProgress", () => {
  it("returns total/done/percent for a list", () => {
    let tasks = addTaskToList([], { id: "t1", title: "A" });
    tasks = addTaskToList(tasks, { id: "t2", title: "B" });
    tasks = completeTaskInList(tasks, "t1");
    const prog = getTaskProgress(tasks);
    expect(prog.total).toBe(2);
    expect(prog.done).toBe(1);
    expect(prog.percent).toBe(50);
  });

  it("returns 0 for empty list", () => {
    const prog = getTaskProgress([]);
    expect(prog.total).toBe(0);
    expect(prog.percent).toBe(0);
  });
});
