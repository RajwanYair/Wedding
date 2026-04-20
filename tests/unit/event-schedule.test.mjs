import { describe, it, expect } from "vitest";
import {
  WEDDING_PHASES,
  PHASE_ORDER,
  createScheduleItem,
  sortByTime,
  getItemsByPhase,
  groupByPhase,
  estimateTotalDuration,
  addBufferTime,
  findConflicts,
  buildDaySchedule,
  formatMinuteOffset,
  parseTimeToMinutes,
} from "../../src/utils/event-schedule.js";

// ── WEDDING_PHASES / PHASE_ORDER ────────────────────────────────────────────

describe("WEDDING_PHASES", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(WEDDING_PHASES)).toBe(true);
  });

  it("contains all expected phases", () => {
    expect(WEDDING_PHASES.PREPARATION).toBe("preparation");
    expect(WEDDING_PHASES.CEREMONY).toBe("ceremony");
    expect(WEDDING_PHASES.RECEPTION).toBe("reception");
    expect(WEDDING_PHASES.DINNER).toBe("dinner");
    expect(WEDDING_PHASES.DANCING).toBe("dancing");
    expect(WEDDING_PHASES.CLOSING).toBe("closing");
  });
});

describe("PHASE_ORDER", () => {
  it("is frozen array with 6 phases", () => {
    expect(Object.isFrozen(PHASE_ORDER)).toBe(true);
    expect(PHASE_ORDER).toHaveLength(6);
  });

  it("starts with preparation and ends with closing", () => {
    expect(PHASE_ORDER[0]).toBe("preparation");
    expect(PHASE_ORDER[PHASE_ORDER.length - 1]).toBe("closing");
  });
});

// ── createScheduleItem ──────────────────────────────────────────────────────

describe("createScheduleItem()", () => {
  it("returns item with required fields", () => {
    const item = createScheduleItem({ title: "Ceremony", startMinute: 600, durationMinutes: 45 });
    expect(item).toHaveProperty("id");
    expect(item.title).toBe("Ceremony");
    expect(item.startMinute).toBe(600);
    expect(item.durationMinutes).toBe(45);
    expect(item.endMinute).toBe(645);
  });

  it("defaults phase to reception", () => {
    const item = createScheduleItem({ title: "Toast", startMinute: 720, durationMinutes: 10 });
    expect(item.phase).toBe(WEDDING_PHASES.RECEPTION);
  });

  it("accepts custom phase", () => {
    const item = createScheduleItem({
      title: "First dance",
      startMinute: 780,
      durationMinutes: 5,
      phase: WEDDING_PHASES.DANCING,
    });
    expect(item.phase).toBe(WEDDING_PHASES.DANCING);
  });

  it("defaults optional string fields to empty string", () => {
    const item = createScheduleItem({ title: "X", startMinute: 0, durationMinutes: 1 });
    expect(item.location).toBe("");
    expect(item.notes).toBe("");
    expect(item.responsible).toBe("");
  });

  it("stores optional fields when provided", () => {
    const item = createScheduleItem({
      title: "Dinner",
      startMinute: 840,
      durationMinutes: 90,
      location: "Main Hall",
      notes: "3-course",
      responsible: "Caterer",
    });
    expect(item.location).toBe("Main Hall");
    expect(item.notes).toBe("3-course");
    expect(item.responsible).toBe("Caterer");
  });

  it("throws when title is missing", () => {
    expect(() =>
      createScheduleItem({ title: "", startMinute: 0, durationMinutes: 10 })
    ).toThrow();
  });

  it("throws when startMinute is negative", () => {
    expect(() =>
      createScheduleItem({ title: "X", startMinute: -1, durationMinutes: 10 })
    ).toThrow();
  });

  it("throws when durationMinutes is zero or negative", () => {
    expect(() =>
      createScheduleItem({ title: "X", startMinute: 0, durationMinutes: 0 })
    ).toThrow();
    expect(() =>
      createScheduleItem({ title: "X", startMinute: 0, durationMinutes: -5 })
    ).toThrow();
  });

  it("generates unique ids for successive calls", () => {
    const a = createScheduleItem({ title: "A", startMinute: 0, durationMinutes: 1 });
    const b = createScheduleItem({ title: "B", startMinute: 0, durationMinutes: 1 });
    expect(a.id).not.toBe(b.id);
  });
});

// ── sortByTime ──────────────────────────────────────────────────────────────

describe("sortByTime()", () => {
  it("sorts items by startMinute ascending", () => {
    const items = [
      createScheduleItem({ title: "C", startMinute: 720, durationMinutes: 30 }),
      createScheduleItem({ title: "A", startMinute: 600, durationMinutes: 30 }),
      createScheduleItem({ title: "B", startMinute: 660, durationMinutes: 30 }),
    ];
    const sorted = sortByTime(items);
    expect(sorted[0].title).toBe("A");
    expect(sorted[1].title).toBe("B");
    expect(sorted[2].title).toBe("C");
  });

  it("does not mutate input array", () => {
    const items = [
      createScheduleItem({ title: "B", startMinute: 60, durationMinutes: 10 }),
      createScheduleItem({ title: "A", startMinute: 0, durationMinutes: 10 }),
    ];
    const original = [...items];
    sortByTime(items);
    expect(items[0].title).toBe(original[0].title);
  });

  it("sub-sorts by endMinute when startMinutes are equal", () => {
    const a = createScheduleItem({ title: "Short", startMinute: 600, durationMinutes: 10 });
    const b = createScheduleItem({ title: "Long", startMinute: 600, durationMinutes: 30 });
    const sorted = sortByTime([b, a]);
    expect(sorted[0].title).toBe("Short");
  });

  it("returns empty array for empty input", () => {
    expect(sortByTime([])).toEqual([]);
  });
});

// ── getItemsByPhase ──────────────────────────────────────────────────────────

describe("getItemsByPhase()", () => {
  it("returns items matching the given phase", () => {
    const items = [
      createScheduleItem({ title: "Prep", startMinute: 480, durationMinutes: 60, phase: WEDDING_PHASES.PREPARATION }),
      createScheduleItem({ title: "Vows", startMinute: 600, durationMinutes: 45, phase: WEDDING_PHASES.CEREMONY }),
      createScheduleItem({ title: "Drinks", startMinute: 660, durationMinutes: 60, phase: WEDDING_PHASES.RECEPTION }),
    ];
    const ceremony = getItemsByPhase(items, WEDDING_PHASES.CEREMONY);
    expect(ceremony).toHaveLength(1);
    expect(ceremony[0].title).toBe("Vows");
  });

  it("returns empty array when no items match", () => {
    const items = [
      createScheduleItem({ title: "Prep", startMinute: 480, durationMinutes: 60, phase: WEDDING_PHASES.PREPARATION }),
    ];
    expect(getItemsByPhase(items, WEDDING_PHASES.DANCING)).toEqual([]);
  });
});

// ── groupByPhase ──────────────────────────────────────────────────────────────

describe("groupByPhase()", () => {
  it("returns a Map with all PHASE_ORDER keys", () => {
    const map = groupByPhase([]);
    for (const phase of PHASE_ORDER) {
      expect(map.has(phase)).toBe(true);
    }
  });

  it("groups items under correct phase keys", () => {
    const items = [
      createScheduleItem({ title: "A", startMinute: 0, durationMinutes: 10, phase: WEDDING_PHASES.CEREMONY }),
      createScheduleItem({ title: "B", startMinute: 0, durationMinutes: 10, phase: WEDDING_PHASES.CEREMONY }),
      createScheduleItem({ title: "C", startMinute: 0, durationMinutes: 10, phase: WEDDING_PHASES.DINNER }),
    ];
    const map = groupByPhase(items);
    expect(map.get(WEDDING_PHASES.CEREMONY)).toHaveLength(2);
    expect(map.get(WEDDING_PHASES.DINNER)).toHaveLength(1);
    expect(map.get(WEDDING_PHASES.DANCING)).toHaveLength(0);
  });

  it("handles items with non-standard phase keys", () => {
    const items = [
      createScheduleItem({ title: "X", startMinute: 0, durationMinutes: 5, phase: "custom" }),
    ];
    const map = groupByPhase(items);
    expect(map.get("custom")).toHaveLength(1);
  });
});

// ── estimateTotalDuration ─────────────────────────────────────────────────────

describe("estimateTotalDuration()", () => {
  it("returns 0 for empty array", () => {
    expect(estimateTotalDuration([])).toBe(0);
  });

  it("sums all durationMinutes", () => {
    const items = [
      createScheduleItem({ title: "A", startMinute: 0, durationMinutes: 30 }),
      createScheduleItem({ title: "B", startMinute: 30, durationMinutes: 45 }),
      createScheduleItem({ title: "C", startMinute: 75, durationMinutes: 60 }),
    ];
    expect(estimateTotalDuration(items)).toBe(135);
  });
});

// ── addBufferTime ─────────────────────────────────────────────────────────────

describe("addBufferTime()", () => {
  it("extends durationMinutes and endMinute by bufferMinutes", () => {
    const items = [
      createScheduleItem({ title: "A", startMinute: 600, durationMinutes: 30 }),
    ];
    const buffered = addBufferTime(items, 15);
    expect(buffered[0].durationMinutes).toBe(45);
    expect(buffered[0].endMinute).toBe(645);
  });

  it("uses 15 minute default buffer", () => {
    const items = [
      createScheduleItem({ title: "A", startMinute: 0, durationMinutes: 20 }),
    ];
    const buffered = addBufferTime(items);
    expect(buffered[0].durationMinutes).toBe(35);
  });

  it("does not mutate the input array", () => {
    const items = [
      createScheduleItem({ title: "A", startMinute: 0, durationMinutes: 20 }),
    ];
    const origDuration = items[0].durationMinutes;
    addBufferTime(items, 10);
    expect(items[0].durationMinutes).toBe(origDuration);
  });

  it("returns empty array for empty input", () => {
    expect(addBufferTime([], 10)).toEqual([]);
  });
});

// ── findConflicts ─────────────────────────────────────────────────────────────

describe("findConflicts()", () => {
  it("returns empty array when no items", () => {
    expect(findConflicts([])).toEqual([]);
  });

  it("returns empty array when no overlaps", () => {
    const items = [
      createScheduleItem({ title: "A", startMinute: 0, durationMinutes: 60 }),
      createScheduleItem({ title: "B", startMinute: 60, durationMinutes: 60 }),
    ];
    expect(findConflicts(items)).toEqual([]);
  });

  it("detects overlapping items", () => {
    const items = [
      createScheduleItem({ title: "A", startMinute: 600, durationMinutes: 60, location: "Hall" }),
      createScheduleItem({ title: "B", startMinute: 630, durationMinutes: 60, location: "Hall" }),
    ];
    const conflicts = findConflicts(items);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].sameLocation).toBe(true);
  });

  it("flags different-location conflicts with sameLocation=false", () => {
    const items = [
      createScheduleItem({ title: "A", startMinute: 600, durationMinutes: 60, location: "Hall A" }),
      createScheduleItem({ title: "B", startMinute: 630, durationMinutes: 60, location: "Hall B" }),
    ];
    const conflicts = findConflicts(items);
    expect(conflicts[0].sameLocation).toBe(false);
  });

  it("does not flag adjacent items as conflicts", () => {
    const items = [
      createScheduleItem({ title: "A", startMinute: 0, durationMinutes: 30 }),
      createScheduleItem({ title: "B", startMinute: 30, durationMinutes: 30 }),
    ];
    expect(findConflicts(items)).toHaveLength(0);
  });
});

// ── buildDaySchedule ──────────────────────────────────────────────────────────

describe("buildDaySchedule()", () => {
  it("returns expected structure", () => {
    const items = [
      createScheduleItem({ title: "Dinner", startMinute: 840, durationMinutes: 90, phase: WEDDING_PHASES.DINNER }),
      createScheduleItem({ title: "Ceremony", startMinute: 600, durationMinutes: 45, phase: WEDDING_PHASES.CEREMONY }),
    ];
    const schedule = buildDaySchedule(items);
    expect(schedule).toHaveProperty("items");
    expect(schedule).toHaveProperty("byPhase");
    expect(schedule).toHaveProperty("conflicts");
    expect(schedule).toHaveProperty("totalDurationMinutes");
    expect(schedule).toHaveProperty("startMinute");
    expect(schedule).toHaveProperty("endMinute");
  });

  it("items are sorted by startMinute", () => {
    const items = [
      createScheduleItem({ title: "B", startMinute: 840, durationMinutes: 30 }),
      createScheduleItem({ title: "A", startMinute: 600, durationMinutes: 30 }),
    ];
    const schedule = buildDaySchedule(items);
    expect(schedule.items[0].title).toBe("A");
  });

  it("reports correct startMinute and endMinute", () => {
    const items = [
      createScheduleItem({ title: "A", startMinute: 600, durationMinutes: 30 }),
      createScheduleItem({ title: "B", startMinute: 840, durationMinutes: 90 }),
    ];
    const schedule = buildDaySchedule(items);
    expect(schedule.startMinute).toBe(600);
    expect(schedule.endMinute).toBe(930);
  });

  it("returns zeros for empty input", () => {
    const schedule = buildDaySchedule([]);
    expect(schedule.startMinute).toBe(0);
    expect(schedule.endMinute).toBe(0);
    expect(schedule.totalDurationMinutes).toBe(0);
  });
});

// ── formatMinuteOffset ────────────────────────────────────────────────────────

describe("formatMinuteOffset()", () => {
  it("formats 0 as 00:00", () => {
    expect(formatMinuteOffset(0)).toBe("00:00");
  });

  it("formats 630 as 10:30", () => {
    expect(formatMinuteOffset(630)).toBe("10:30");
  });

  it("formats 75 as 01:15", () => {
    expect(formatMinuteOffset(75)).toBe("01:15");
  });

  it("formats 1439 as 23:59", () => {
    expect(formatMinuteOffset(1439)).toBe("23:59");
  });

  it("wraps at 24h boundary", () => {
    expect(formatMinuteOffset(1440)).toBe("00:00");
  });

  it("zero-pads single-digit hours and minutes", () => {
    expect(formatMinuteOffset(65)).toBe("01:05");
  });
});

// ── parseTimeToMinutes ────────────────────────────────────────────────────────

describe("parseTimeToMinutes()", () => {
  it("parses 10:30 as 630", () => {
    expect(parseTimeToMinutes("10:30")).toBe(630);
  });

  it("parses 00:00 as 0", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
  });

  it("parses 23:59 as 1439", () => {
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("throws for invalid input", () => {
    expect(() => parseTimeToMinutes("invalid")).toThrow();
  });

  it("round-trips with formatMinuteOffset", () => {
    const original = 780;
    expect(parseTimeToMinutes(formatMinuteOffset(original))).toBe(original);
  });
});
