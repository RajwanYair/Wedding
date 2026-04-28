/**
 * tests/unit/run-of-show-editor.test.mjs — Sprint 144 run-of-show editor
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const _store = new Map();
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: (k) => _store.get(k) ?? null,
  writeBrowserStorageJson: (k, v) => {
    _store.set(k, JSON.parse(JSON.stringify(v)));
  },
}));

beforeEach(() => {
  _store.clear();
});

const {
  loadRunOfShow,
  saveRunOfShow,
  buildDefaultTimeline,
  sortTimeline,
  detectOverlaps,
  shiftTimeline,
} = await import("../../src/services/run-of-show.js");

describe("RunOfShowEditor (Sprint 144)", () => {
  describe("buildDefaultTimeline", () => {
    it("creates 5 default items starting at 18:00", () => {
      const items = buildDefaultTimeline("18:00");
      expect(items).toHaveLength(5);
      expect(items[0].startTime).toBe("18:00");
      expect(items[0].title).toBe("קבלת פנים");
    });

    it("each item has id, title, startTime, durationMinutes", () => {
      const items = buildDefaultTimeline("18:00");
      for (const item of items) {
        expect(item.id).toMatch(/^t_/);
        expect(typeof item.title).toBe("string");
        expect(item.startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(typeof item.durationMinutes).toBe("number");
      }
    });

    it("items are sequential without gaps", () => {
      const items = buildDefaultTimeline("18:00");
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const [ph, pm] = prev.startTime.split(":").map(Number);
        const expected = ph * 60 + pm + prev.durationMinutes;
        const [h, m] = items[i].startTime.split(":").map(Number);
        expect(h * 60 + m).toBe(expected % (24 * 60));
      }
    });
  });

  describe("saveRunOfShow / loadRunOfShow", () => {
    it("round-trips valid items", () => {
      const items = buildDefaultTimeline("19:00");
      saveRunOfShow(items);
      const loaded = loadRunOfShow();
      expect(loaded).toHaveLength(items.length);
      expect(loaded[0].title).toBe(items[0].title);
    });

    it("returns empty array when nothing stored", () => {
      expect(loadRunOfShow()).toEqual([]);
    });
  });

  describe("sortTimeline", () => {
    it("sorts items by startTime ascending", () => {
      const items = [
        { id: "a", title: "Late", startTime: "22:00", durationMinutes: 30 },
        { id: "b", title: "Early", startTime: "18:00", durationMinutes: 60 },
      ];
      const sorted = sortTimeline(items);
      expect(sorted[0].title).toBe("Early");
      expect(sorted[1].title).toBe("Late");
    });
  });

  describe("detectOverlaps", () => {
    it("detects overlapping items", () => {
      const items = [
        { id: "a", title: "A", startTime: "18:00", durationMinutes: 90 },
        { id: "b", title: "B", startTime: "19:00", durationMinutes: 60 },
      ];
      const overlaps = detectOverlaps(items);
      expect(overlaps).toHaveLength(1);
      expect(overlaps[0]).toEqual(["a", "b"]);
    });

    it("returns empty for non-overlapping items", () => {
      const items = [
        { id: "a", title: "A", startTime: "18:00", durationMinutes: 60 },
        { id: "b", title: "B", startTime: "19:00", durationMinutes: 60 },
      ];
      expect(detectOverlaps(items)).toHaveLength(0);
    });
  });

  describe("shiftTimeline", () => {
    it("shifts items from index onward by delta", () => {
      const items = [
        { id: "a", title: "A", startTime: "18:00", durationMinutes: 60 },
        { id: "b", title: "B", startTime: "19:00", durationMinutes: 60 },
        { id: "c", title: "C", startTime: "20:00", durationMinutes: 60 },
      ];
      const shifted = shiftTimeline(items, 1, 30);
      expect(shifted[0].startTime).toBe("18:00");
      expect(shifted[1].startTime).toBe("19:30");
      expect(shifted[2].startTime).toBe("20:30");
    });
  });
});
