/**
 * tests/unit/schedule.test.mjs — S351: services/schedule.js helpers
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
}));

vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: vi.fn(() => null),
  writeBrowserStorageJson: vi.fn(),
}));

import {
  buildDefaultTimeline,
  sortTimeline,
  detectOverlaps,
  shiftTimeline,
  getRunOfShow,
  getNextItem,
  formatTimeUntil,
} from "../../src/services/schedule.js";

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
});

// ── buildDefaultTimeline ──────────────────────────────────────────────────

describe("buildDefaultTimeline", () => {
  it("returns 5 default items", () => {
    const items = buildDefaultTimeline("18:00");
    expect(items).toHaveLength(5);
  });

  it("first item starts at firstStart", () => {
    const items = buildDefaultTimeline("18:00");
    expect(items[0].startTime).toBe("18:00");
  });

  it("uses custom firstStart", () => {
    const items = buildDefaultTimeline("17:30");
    expect(items[0].startTime).toBe("17:30");
  });

  it("each item has required properties", () => {
    const items = buildDefaultTimeline("18:00");
    for (const item of items) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("startTime");
      expect(item).toHaveProperty("durationMinutes");
    }
  });

  it("items start sequentially", () => {
    const items = buildDefaultTimeline("18:00");
    // item[1] should start after item[0] ends
    const [first, second] = items;
    if (first.durationMinutes > 0) {
      expect(second.startTime).not.toBe(first.startTime);
    }
  });
});

// ── sortTimeline ──────────────────────────────────────────────────────────

describe("sortTimeline", () => {
  const mkItem = (id, startTime, dur = 30) => ({
    id, title: "T", startTime, durationMinutes: dur,
  });

  it("sorts items ascending by startTime", () => {
    const items = [mkItem("b", "20:00"), mkItem("a", "18:00"), mkItem("c", "19:00")];
    const sorted = sortTimeline(items);
    expect(sorted.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the original array", () => {
    const items = [mkItem("b", "20:00"), mkItem("a", "18:00")];
    const original = [...items];
    sortTimeline(items);
    expect(items).toEqual(original);
  });

  it("handles empty array", () => {
    expect(sortTimeline([])).toEqual([]);
  });

  it("single item stays unchanged", () => {
    const items = [mkItem("x", "19:00")];
    expect(sortTimeline(items)).toHaveLength(1);
  });
});

// ── detectOverlaps ────────────────────────────────────────────────────────

describe("detectOverlaps", () => {
  const mkItem = (id, startTime, dur) => ({
    id, title: "T", startTime, durationMinutes: dur,
  });

  it("returns empty array when no overlaps", () => {
    const items = [
      mkItem("a", "18:00", 60),
      mkItem("b", "19:00", 60),
    ];
    expect(detectOverlaps(items)).toEqual([]);
  });

  it("detects overlapping items", () => {
    const items = [
      mkItem("a", "18:00", 90), // ends 19:30
      mkItem("b", "19:00", 60), // starts 19:00 — overlaps with a
    ];
    const conflicts = detectOverlaps(items);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toContain("a");
    expect(conflicts[0]).toContain("b");
  });

  it("returns empty for empty list", () => {
    expect(detectOverlaps([])).toEqual([]);
  });

  it("returns empty for single item", () => {
    expect(detectOverlaps([mkItem("x", "18:00", 60)])).toEqual([]);
  });
});

// ── shiftTimeline ─────────────────────────────────────────────────────────

describe("shiftTimeline", () => {
  const mkItem = (id, startTime, dur = 30) => ({
    id, title: "T", startTime, durationMinutes: dur,
  });

  it("shifts items from fromIndex onward", () => {
    const items = [mkItem("a", "18:00"), mkItem("b", "19:00"), mkItem("c", "20:00")];
    const shifted = shiftTimeline(items, 1, 30);
    expect(shifted[0].startTime).toBe("18:00"); // unchanged
    expect(shifted[1].startTime).toBe("19:30"); // +30 min
    expect(shifted[2].startTime).toBe("20:30"); // +30 min
  });

  it("shifts all items when fromIndex=0", () => {
    const items = [mkItem("a", "18:00"), mkItem("b", "19:00")];
    const shifted = shiftTimeline(items, 0, 60);
    expect(shifted[0].startTime).toBe("19:00");
    expect(shifted[1].startTime).toBe("20:00");
  });

  it("supports negative delta (earlier)", () => {
    const items = [mkItem("a", "19:00")];
    const shifted = shiftTimeline(items, 0, -60);
    expect(shifted[0].startTime).toBe("18:00");
  });

  it("does not mutate original items", () => {
    const items = [mkItem("a", "18:00")];
    const original = items[0].startTime;
    shiftTimeline(items, 0, 30);
    expect(items[0].startTime).toBe(original);
  });
});

// ── getRunOfShow ──────────────────────────────────────────────────────────

describe("getRunOfShow", () => {
  const now = new Date("2025-09-15T18:30:00");

  it("returns empty when no timeline data", () => {
    _store.set("timeline", []);
    _store.set("weddingInfo", { date: "2025-09-15" });
    expect(getRunOfShow(now)).toHaveLength(0);
  });

  it("returns empty when no weddingInfo.date", () => {
    _store.set("timeline", [{ id: "x", time: "18:00", title: "Test" }]);
    _store.set("weddingInfo", {});
    expect(getRunOfShow(now)).toHaveLength(0);
  });

  it("returns events sorted by time", () => {
    _store.set("timeline", [
      { id: "b", time: "20:00", title: "Late" },
      { id: "a", time: "18:00", title: "Early" },
    ]);
    _store.set("weddingInfo", { date: "2025-09-15" });
    const events = getRunOfShow(now);
    expect(events[0].id).toBe("a");
    expect(events[1].id).toBe("b");
  });

  it("marks past events as isPast", () => {
    _store.set("timeline", [{ id: "x", time: "18:00", title: "Past" }]);
    _store.set("weddingInfo", { date: "2025-09-15" });
    // now is 18:30, event at 18:00 = past
    const events = getRunOfShow(now);
    expect(events[0].isPast).toBe(true);
  });

  it("marks upcoming event as isNext", () => {
    _store.set("timeline", [
      { id: "past", time: "17:00", title: "Past" },
      { id: "next", time: "19:00", title: "Next" },
    ]);
    _store.set("weddingInfo", { date: "2025-09-15" });
    const events = getRunOfShow(now);
    const nextEvent = events.find((e) => e.isNext);
    expect(nextEvent?.id).toBe("next");
  });
});

// ── getNextItem ───────────────────────────────────────────────────────────

describe("getNextItem", () => {
  const now = new Date("2025-09-15T18:30:00");

  it("returns null when no timeline", () => {
    _store.set("timeline", []);
    _store.set("weddingInfo", { date: "2025-09-15" });
    expect(getNextItem(now)).toBeNull();
  });

  it("returns the next upcoming event", () => {
    _store.set("timeline", [
      { id: "past", time: "17:00", title: "Done" },
      { id: "next", time: "19:00", title: "Coming" },
    ]);
    _store.set("weddingInfo", { date: "2025-09-15" });
    const item = getNextItem(now);
    expect(item?.id).toBe("next");
  });
});

// ── formatTimeUntil ───────────────────────────────────────────────────────

describe("formatTimeUntil", () => {
  it("formats future minutes correctly", () => {
    const result = formatTimeUntil(30);
    expect(result).toContain("בעוד");
    expect(result).toContain("30");
  });

  it("formats past minutes correctly", () => {
    const result = formatTimeUntil(-15);
    expect(result).toContain("לפני");
    expect(result).toContain("15");
  });

  it("formats hours and minutes", () => {
    const result = formatTimeUntil(90);
    expect(result).toContain("בעוד");
    expect(result).toMatch(/1ש׳/);
    expect(result).toMatch(/30ד׳/);
  });

  it("formats exactly 0 minutes", () => {
    const result = formatTimeUntil(0);
    expect(result).toContain("בעוד");
    expect(result).toContain("0ד׳");
  });
});
