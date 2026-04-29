/**
 * tests/unit/timeline-section.test.mjs — S338: data helpers in src/sections/timeline.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Store ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
  storeSubscribe: vi.fn(() => () => {}),
  storeSubscribeScoped: vi.fn(() => () => {}),
  cleanupScope: vi.fn(),
}));

// ── Deps ──────────────────────────────────────────────────────────────────

vi.mock("../../src/core/i18n.js", () => ({ t: (k) => k }));
vi.mock("../../src/core/dom.js", () => ({ el: new Proxy({}, { get: () => null }) }));
vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/utils/misc.js", () => ({ uid: () => "uid-tl-001" }));
vi.mock("../../src/utils/sanitize.js", () => ({
  sanitize: (data, _schema) => ({ value: data, errors: [] }),
}));
vi.mock("../../src/services/schedule.js", () => ({
  getRunOfShow: () => [],
  getNextItem: () => null,
  formatTimeUntil: () => "",
}));
vi.mock("../../src/core/section-base.js", () => ({
  BaseSection: class {
    constructor(_name) {}
    subscribe() {}
  },
  fromSection: (_s) => ({ mount: vi.fn(), unmount: vi.fn(), capabilities: [] }),
}));
vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));

// Stub URL for CSV tests
vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock"),
  revokeObjectURL: vi.fn(),
});

import {
  saveTimelineItem,
  deleteTimelineItem,
  toggleTimelineDone,
  getTimelineCompletionStats,
  getTimelineDuration,
  getUpcomingTimelineItems,
  exportTimelineCSV,
} from "../../src/sections/timeline.js";

// ── Helpers ───────────────────────────────────────────────────────────────

const mkItem = (overrides = {}) => ({
  id: "t1",
  time: "10:00",
  title: "Ceremony",
  note: "",
  icon: "💍",
  ...overrides,
});

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
});

// ── saveTimelineItem ──────────────────────────────────────────────────────

describe("saveTimelineItem", () => {
  it("adds a new item to the store", () => {
    _store.set("timeline", []);
    const result = saveTimelineItem({ time: "14:00", title: "Dinner" });
    expect(result.ok).toBe(true);
    const items = _store.get("timeline");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Dinner");
  });

  it("updates an existing item when existingId provided", () => {
    _store.set("timeline", [mkItem({ id: "t1", title: "Old Title" })]);
    saveTimelineItem({ time: "10:00", title: "New Title" }, "t1");
    const items = _store.get("timeline");
    expect(items[0].title).toBe("New Title");
    expect(items).toHaveLength(1);
  });

  it("sorts items by time after save", () => {
    _store.set("timeline", []);
    // Add items out of order
    _store.set("timeline", [
      mkItem({ id: "t1", time: "15:00", title: "Dinner" }),
      mkItem({ id: "t2", time: "10:00", title: "Ceremony" }),
    ]);
    saveTimelineItem({ time: "12:00", title: "Lunch" });
    const items = _store.get("timeline");
    expect(items[0].time).toBe("10:00");
    expect(items[1].time).toBe("12:00");
    expect(items[2].time).toBe("15:00");
  });
});

// ── deleteTimelineItem ────────────────────────────────────────────────────

describe("deleteTimelineItem", () => {
  it("removes the item with the given id", () => {
    _store.set("timeline", [mkItem({ id: "t1" }), mkItem({ id: "t2" })]);
    deleteTimelineItem("t1");
    const items = _store.get("timeline");
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("t2");
  });

  it("is a no-op for non-existent id", () => {
    _store.set("timeline", [mkItem({ id: "t1" })]);
    deleteTimelineItem("unknown");
    expect(_store.get("timeline")).toHaveLength(1);
  });
});

// ── toggleTimelineDone ────────────────────────────────────────────────────

describe("toggleTimelineDone", () => {
  it("marks an item as done", () => {
    _store.set("timelineDone", {});
    toggleTimelineDone("t1");
    expect(_store.get("timelineDone")["t1"]).toBe(true);
  });

  it("un-marks a done item", () => {
    _store.set("timelineDone", { t1: true });
    toggleTimelineDone("t1");
    expect(_store.get("timelineDone")["t1"]).toBe(false);
  });

  it("initialises correctly when timelineDone is null", () => {
    _store.set("timelineDone", null);
    toggleTimelineDone("t1");
    expect(_store.get("timelineDone")["t1"]).toBe(true);
  });
});

// ── getTimelineCompletionStats ────────────────────────────────────────────

describe("getTimelineCompletionStats", () => {
  it("returns zeros for empty timeline", () => {
    _store.set("timeline", []);
    const stats = getTimelineCompletionStats();
    expect(stats).toEqual({ total: 0, done: 0, pending: 0, completionRate: 0 });
  });

  it("counts done and pending correctly", () => {
    _store.set("timeline", [mkItem({ id: "t1" }), mkItem({ id: "t2" }), mkItem({ id: "t3" })]);
    _store.set("timelineDone", { t1: true });
    const stats = getTimelineCompletionStats();
    expect(stats.total).toBe(3);
    expect(stats.done).toBe(1);
    expect(stats.pending).toBe(2);
    expect(stats.completionRate).toBe(33);
  });

  it("completionRate is 100 when all done", () => {
    _store.set("timeline", [mkItem({ id: "t1" }), mkItem({ id: "t2" })]);
    _store.set("timelineDone", { t1: true, t2: true });
    expect(getTimelineCompletionStats().completionRate).toBe(100);
  });

  it("completionRate is 0 when timelineDone is null", () => {
    _store.set("timeline", [mkItem({ id: "t1" })]);
    // no timelineDone in store
    const stats = getTimelineCompletionStats();
    expect(stats.completionRate).toBe(0);
  });
});

// ── getTimelineDuration ───────────────────────────────────────────────────

describe("getTimelineDuration", () => {
  it("returns null for empty timeline", () => {
    _store.set("timeline", []);
    expect(getTimelineDuration()).toBeNull();
  });

  it("returns null for a single item", () => {
    _store.set("timeline", [mkItem({ time: "10:00" })]);
    expect(getTimelineDuration()).toBeNull();
  });

  it("calculates duration between first and last items", () => {
    _store.set("timeline", [
      mkItem({ id: "t1", time: "10:00" }),
      mkItem({ id: "t2", time: "14:30" }),
      mkItem({ id: "t3", time: "16:00" }),
    ]);
    const dur = getTimelineDuration();
    expect(dur).not.toBeNull();
    expect(dur.startTime).toBe("10:00");
    expect(dur.endTime).toBe("16:00");
    expect(dur.durationMinutes).toBe(360);
  });

  it("sorts by time before calculating", () => {
    _store.set("timeline", [
      mkItem({ id: "t1", time: "20:00" }),
      mkItem({ id: "t2", time: "09:00" }),
    ]);
    const dur = getTimelineDuration();
    expect(dur.startTime).toBe("09:00");
    expect(dur.endTime).toBe("20:00");
    expect(dur.durationMinutes).toBe(660);
  });
});

// ── getUpcomingTimelineItems ──────────────────────────────────────────────

describe("getUpcomingTimelineItems", () => {
  it("returns empty array when no items", () => {
    _store.set("timeline", []);
    expect(getUpcomingTimelineItems()).toEqual([]);
  });

  it("excludes done items", () => {
    _store.set("timeline", [mkItem({ id: "t1" }), mkItem({ id: "t2" })]);
    _store.set("timelineDone", { t1: true });
    const upcoming = getUpcomingTimelineItems();
    expect(upcoming.every((i) => i.id !== "t1")).toBe(true);
  });

  it("respects the limit parameter", () => {
    _store.set("timeline", [
      mkItem({ id: "t1", time: "10:00" }),
      mkItem({ id: "t2", time: "11:00" }),
      mkItem({ id: "t3", time: "12:00" }),
      mkItem({ id: "t4", time: "13:00" }),
    ]);
    const upcoming = getUpcomingTimelineItems(2);
    expect(upcoming).toHaveLength(2);
  });

  it("default limit is 3", () => {
    _store.set("timeline", [
      mkItem({ id: "t1", time: "10:00" }),
      mkItem({ id: "t2", time: "11:00" }),
      mkItem({ id: "t3", time: "12:00" }),
      mkItem({ id: "t4", time: "13:00" }),
    ]);
    expect(getUpcomingTimelineItems()).toHaveLength(3);
  });

  it("returns items sorted by time", () => {
    _store.set("timeline", [
      mkItem({ id: "t1", time: "14:00" }),
      mkItem({ id: "t2", time: "09:00" }),
    ]);
    const upcoming = getUpcomingTimelineItems();
    expect(upcoming[0].time).toBe("09:00");
    expect(upcoming[1].time).toBe("14:00");
  });
});

// ── exportTimelineCSV ─────────────────────────────────────────────────────

describe("exportTimelineCSV", () => {
  it("triggers a download link click", () => {
    _store.set("timeline", [mkItem({ id: "t1", time: "10:00", title: "Ceremony" })]);
    const clickSpy = vi.spyOn(HTMLElement.prototype, "click").mockImplementation(() => {});
    exportTimelineCSV();
    expect(URL.createObjectURL).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("does not throw for empty timeline", () => {
    _store.set("timeline", []);
    const clickSpy = vi.spyOn(HTMLElement.prototype, "click").mockImplementation(() => {});
    expect(() => exportTimelineCSV()).not.toThrow();
    clickSpy.mockRestore();
  });
});
