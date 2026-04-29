/**
 * tests/unit/run-of-show.test.mjs — S125 timeline editor.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const _store = new Map();
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: (k) => _store.get(k) ?? null,
  writeBrowserStorageJson: (k, v) => _store.set(k, JSON.parse(JSON.stringify(v))),
}));

beforeEach(() => {
  _store.clear();
  vi.resetModules();
});

describe("S125 — run-of-show", () => {
  it("buildDefaultTimeline starts at given time and chains durations", async () => {
    const m = await import("../../src/services/schedule.js");
    const tl = m.buildDefaultTimeline("18:00");
    expect(tl[1].startTime).toBe("19:00");
    expect(tl[2].startTime).toBe("19:30");
    expect(tl).toHaveLength(5);
  });

  it("sortTimeline orders by startTime ascending", async () => {
    const m = await import("../../src/services/schedule.js");
    const out = m.sortTimeline([
      { id: "b", title: "B", startTime: "20:00", durationMinutes: 10 },
      { id: "a", title: "A", startTime: "18:30", durationMinutes: 10 },
    ]);
    expect(out.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("detectOverlaps finds adjacent overlap pairs", async () => {
    const m = await import("../../src/services/schedule.js");
    const c = m.detectOverlaps([
      { id: "a", title: "A", startTime: "18:00", durationMinutes: 60 },
      { id: "b", title: "B", startTime: "18:30", durationMinutes: 30 }, // overlaps a
      { id: "c", title: "C", startTime: "19:30", durationMinutes: 10 },
    ]);
    expect(c).toEqual([["a", "b"]]);
  });

  it("shiftTimeline shifts items from index forward", async () => {
    const m = await import("../../src/services/schedule.js");
    const tl = [
      { id: "a", title: "A", startTime: "18:00", durationMinutes: 60 },
      { id: "b", title: "B", startTime: "19:00", durationMinutes: 30 },
      { id: "c", title: "C", startTime: "19:30", durationMinutes: 90 },
    ];
    const out = m.shiftTimeline(tl, 1, 15);
    expect(out[0].startTime).toBe("18:00");
    expect(out[1].startTime).toBe("19:15");
    expect(out[2].startTime).toBe("19:45");
  });

  it("save/load round-trip filters invalid items", async () => {
    const m = await import("../../src/services/schedule.js");
    const tl = m.buildDefaultTimeline("17:30");
    const dirty = [
      ...tl,
      /** @type {any} */ ({ id: "x", title: "bad", startTime: "nope" }),
    ];
    m.saveRunOfShow(dirty);
    const back = m.loadRunOfShow();
    expect(back).toHaveLength(tl.length);
    expect(back.every((i) => /^\d{2}:\d{2}$/.test(i.startTime))).toBe(true);
  });

  it("loadRunOfShow returns [] for empty/corrupt storage", async () => {
    const m = await import("../../src/services/schedule.js");
    expect(m.loadRunOfShow()).toEqual([]);
    _store.set("wedding_v1_run_of_show", "garbage");
    expect(m.loadRunOfShow()).toEqual([]);
  });

  it("saveRunOfShow throws on non-array", async () => {
    const m = await import("../../src/services/schedule.js");
    expect(() => m.saveRunOfShow(/** @type {any} */ ("nope"))).toThrow();
  });
});
