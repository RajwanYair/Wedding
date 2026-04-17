/**
 * tests/unit/timeline-analyzer.test.mjs — Sprint 107
 */

import { describe, it, expect } from "vitest";
import {
  detectConflicts,
  findGaps,
  buildDaySchedule,
  totalScheduledMinutes,
  groupByCategory,
} from "../../src/utils/timeline-analyzer.js";

const H = 3600_000; // ms per hour

function ev(id, startH, endH, category) {
  return { id, title: `Event ${id}`, startMs: startH * H, endMs: endH * H, category };
}

describe("detectConflicts", () => {
  it("returns empty when no events", () => {
    expect(detectConflicts([])).toEqual([]);
  });

  it("returns empty when no overlaps", () => {
    expect(detectConflicts([ev("a", 1, 2), ev("b", 3, 4)])).toEqual([]);
  });

  it("detects a simple overlap", () => {
    const conflicts = detectConflicts([ev("a", 1, 3), ev("b", 2, 4)]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].overlapMs).toBe(1 * H);
  });

  it("handles back-to-back events as no conflict", () => {
    expect(detectConflicts([ev("a", 1, 2), ev("b", 2, 3)])).toEqual([]);
  });

  it("detects multiple overlaps", () => {
    const events = [ev("a", 1, 5), ev("b", 2, 4), ev("c", 3, 6)];
    expect(detectConflicts(events).length).toBeGreaterThanOrEqual(2);
  });
});

describe("findGaps", () => {
  it("returns empty for single event", () => {
    expect(findGaps([ev("a", 1, 2)])).toEqual([]);
  });

  it("finds gap between two events", () => {
    const gaps = findGaps([ev("a", 1, 2), ev("b", 4, 5)], 30 * 60 * 1000);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].durationMs).toBe(2 * H);
  });

  it("respects minGapMs threshold", () => {
    // gap = 10 min, threshold = 15 min → no result
    const gaps = findGaps(
      [ev("a", 1, 2), ev("b", 2 + 10 / 60, 3)],
      15 * 60 * 1000,
    );
    expect(gaps).toHaveLength(0);
  });

  it("merges overlapping events before gap detection", () => {
    // a covers 1–3, b covers 2–4 → effectively 1–4; then c at 6–7 → 2h gap
    const gaps = findGaps([ev("a", 1, 3), ev("b", 2, 4), ev("c", 6, 7)], 30 * 60000);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].durationMs).toBe(2 * H);
  });
});

describe("buildDaySchedule", () => {
  it("returns items in chronological order", () => {
    const events = [ev("b", 3, 4), ev("a", 1, 2)];
    const schedule = buildDaySchedule(events);
    expect(schedule[0].event.id).toBe("a");
    expect(schedule[1].event.id).toBe("b");
  });

  it("matches vendor to event by name substring", () => {
    const events = [{ id: "1", title: "DJ set", startMs: 1 * H, endMs: 2 * H }];
    const vendors = [{ id: "v1", name: "DJ" }];
    const schedule = buildDaySchedule(events, vendors);
    expect(schedule[0].vendor?.name).toBe("DJ");
  });

  it("sets vendor to null when no match", () => {
    const events = [ev("a", 1, 2)];
    const schedule = buildDaySchedule(events, [{ id: "v1", name: "Plumber" }]);
    expect(schedule[0].vendor).toBeNull();
  });
});

describe("totalScheduledMinutes", () => {
  it("sums durations", () => {
    const events = [ev("a", 1, 2), ev("b", 3, 4.5)];
    expect(totalScheduledMinutes(events)).toBe(150);
  });

  it("returns 0 for empty list", () => {
    expect(totalScheduledMinutes([])).toBe(0);
  });
});

describe("groupByCategory", () => {
  it("groups by category field", () => {
    const events = [ev("a", 1, 2, "music"), ev("b", 3, 4, "food"), ev("c", 5, 6, "music")];
    const groups = groupByCategory(events);
    expect(groups.music).toHaveLength(2);
    expect(groups.food).toHaveLength(1);
  });

  it("uses 'other' as fallback category", () => {
    const events = [ev("a", 1, 2)];  // no category
    const groups = groupByCategory(events);
    expect(groups.other).toHaveLength(1);
  });
});
