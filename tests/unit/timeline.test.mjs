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
