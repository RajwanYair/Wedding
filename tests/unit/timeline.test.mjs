/**
 * tests/unit/timeline.test.mjs — Integration tests for timeline section
 * Covers: saveTimelineItem · deleteTimelineItem · exportTimelineCSV
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  saveTimelineItem,
  deleteTimelineItem,
  exportTimelineCSV,
  getTimelineCompletionStats,
  getTimelineDuration,
  getUpcomingTimelineItems,
} from "../../src/sections/timeline.js";

function seedStore() {
  initStore({
    timeline: { value: [] },
    timelineDone: { value: {} },
    guests: { value: [] },
    tables: { value: [] },
    weddingInfo: { value: {} },
  });
}

function makeItem(overrides = {}) {
  return {
    time: "18:00",
    title: "Ceremony",
    ...overrides,
  };
}

// ── saveTimelineItem ─────────────────────────────────────────────────────

describe("saveTimelineItem", () => {
  beforeEach(() => seedStore());

  it("creates a new timeline item", () => {
    const result = saveTimelineItem(makeItem());
    expect(result.ok).toBe(true);
    expect(storeGet("timeline")).toHaveLength(1);
  });

  it("rejects missing time", () => {
    const result = saveTimelineItem({ title: "Test" });
    expect(result.ok).toBe(false);
  });

  it("rejects missing title", () => {
    const result = saveTimelineItem({ time: "18:00" });
    expect(result.ok).toBe(false);
  });

  it("stores time and title correctly", () => {
    saveTimelineItem(makeItem({ time: "20:00", title: "Dinner" }));
    const items = /** @type {any[]} */ (storeGet("timeline"));
    expect(items[0].time).toBe("20:00");
    expect(items[0].title).toBe("Dinner");
  });

  it("updates existing item by ID", () => {
    saveTimelineItem(makeItem({ time: "18:00", title: "First" }));
    const items = /** @type {any[]} */ (storeGet("timeline"));
    const id = items[0].id;
    saveTimelineItem(makeItem({ time: "19:00", title: "Updated" }), id);
    const updated = /** @type {any[]} */ (storeGet("timeline"));
    expect(updated).toHaveLength(1);
    expect(updated[0].title).toBe("Updated");
    expect(updated[0].time).toBe("19:00");
  });

  it("generates unique IDs for new items", () => {
    saveTimelineItem(makeItem({ title: "A" }));
    saveTimelineItem(makeItem({ title: "B" }));
    const items = /** @type {any[]} */ (storeGet("timeline"));
    expect(items[0].id).not.toBe(items[1].id);
  });
});

// ── deleteTimelineItem ───────────────────────────────────────────────────

describe("deleteTimelineItem", () => {
  beforeEach(() => seedStore());

  it("removes a timeline item by ID", () => {
    saveTimelineItem(makeItem({ title: "Remove Me" }));
    const items = /** @type {any[]} */ (storeGet("timeline"));
    deleteTimelineItem(items[0].id);
    expect(storeGet("timeline")).toHaveLength(0);
  });

  it("does nothing for non-existent ID", () => {
    saveTimelineItem(makeItem());
    deleteTimelineItem("nonexistent");
    expect(storeGet("timeline")).toHaveLength(1);
  });
});

// ── exportTimelineCSV ────────────────────────────────────────────────────

describe("exportTimelineCSV", () => {
  beforeEach(() => seedStore());

  it("is a function", () => {
    expect(typeof exportTimelineCSV).toBe("function");
  });

  it("does not throw with empty timeline", () => {
    expect(() => exportTimelineCSV()).not.toThrow();
  });

  it("does not throw with items", () => {
    saveTimelineItem(makeItem({ time: "18:00", title: "Ceremony" }));
    saveTimelineItem(makeItem({ time: "20:00", title: "Dinner" }));
    expect(() => exportTimelineCSV()).not.toThrow();
  });
});

// ── getTimelineCompletionStats ────────────────────────────────────────────
describe("getTimelineCompletionStats", () => {
  beforeEach(() => seedStore());

  it("returns zeros for empty timeline", () => {
    const stats = getTimelineCompletionStats();
    expect(stats.total).toBe(0);
    expect(stats.completionRate).toBe(0);
  });

  it("calculates done/pending/rate correctly", () => {
    saveTimelineItem(makeItem({ time: "18:00", title: "A" }));
    saveTimelineItem(makeItem({ time: "19:00", title: "B" }));
    const items = storeGet("timeline");
    storeSet("timelineDone", { [items[0].id]: true });
    const stats = getTimelineCompletionStats();
    expect(stats.total).toBe(2);
    expect(stats.done).toBe(1);
    expect(stats.pending).toBe(1);
    expect(stats.completionRate).toBe(50);
  });
});

// ── getTimelineDuration ───────────────────────────────────────────────────
describe("getTimelineDuration", () => {
  beforeEach(() => seedStore());

  it("returns null with fewer than 2 items", () => {
    saveTimelineItem(makeItem({ time: "18:00" }));
    expect(getTimelineDuration()).toBeNull();
  });

  it("calculates duration between first and last items", () => {
    saveTimelineItem(makeItem({ time: "17:00", title: "Start" }));
    saveTimelineItem(makeItem({ time: "23:30", title: "End" }));
    const d = getTimelineDuration();
    expect(d.startTime).toBe("17:00");
    expect(d.endTime).toBe("23:30");
    expect(d.durationMinutes).toBe(390);
  });
});

// ── getUpcomingTimelineItems ──────────────────────────────────────────────
describe("getUpcomingTimelineItems", () => {
  beforeEach(() => seedStore());

  it("excludes done items", () => {
    saveTimelineItem(makeItem({ time: "18:00", title: "Done" }));
    saveTimelineItem(makeItem({ time: "19:00", title: "Pending" }));
    const items = storeGet("timeline");
    storeSet("timelineDone", { [items[0].id]: true });
    const upcoming = getUpcomingTimelineItems(5);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].title).toBe("Pending");
  });

  it("respects limit parameter", () => {
    saveTimelineItem(makeItem({ time: "17:00" }));
    saveTimelineItem(makeItem({ time: "18:00" }));
    saveTimelineItem(makeItem({ time: "19:00" }));
    const upcoming = getUpcomingTimelineItems(2);
    expect(upcoming).toHaveLength(2);
  });
});
