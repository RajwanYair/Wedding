/**
 * tests/unit/event-schedule.test.mjs — Sprint 51 / B6
 * Unit tests for src/services/event-schedule.js
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const { getRunOfShow, getNextItem, formatTimeUntil } =
  await import("../../src/services/event-schedule.js");

// Use a fixed "today" so tests are deterministic
const TODAY = "2026-06-15";
const NOW = new Date(`${TODAY}T14:00:00`);

const ITEMS = [
  { id: "e1", time: "12:00", title: "Ceremony", icon: "💍", note: "Main hall" },
  { id: "e2", time: "14:30", title: "Dinner", icon: "🍽️", note: "" },
  { id: "e3", time: "17:00", title: "First Dance", icon: "💃", note: "DJ set" },
];

function seed(items = ITEMS, date = TODAY) {
  initStore({
    timeline: { value: items },
    weddingInfo: { value: { date } },
  });
}

beforeEach(() => seed());

describe("getRunOfShow", () => {
  it("returns all items with a time", () => {
    const show = getRunOfShow(NOW);
    expect(show).toHaveLength(3);
  });

  it("sorts events by time", () => {
    const show = getRunOfShow(NOW);
    expect(show[0].time).toBe("12:00");
    expect(show[1].time).toBe("14:30");
    expect(show[2].time).toBe("17:00");
  });

  it("marks past events correctly", () => {
    const show = getRunOfShow(NOW);
    // NOW is 14:00; 12:00 is past
    expect(show[0].isPast).toBe(true);
    expect(show[1].isPast).toBe(false);
    expect(show[2].isPast).toBe(false);
  });

  it("marks only the first upcoming event as isNext", () => {
    const show = getRunOfShow(NOW);
    expect(show[0].isNext).toBe(false);
    expect(show[1].isNext).toBe(true); // 14:30 is the next upcoming
    expect(show[2].isNext).toBe(false);
  });

  it("uses default icon when item icon is missing", () => {
    seed([{ id: "e1", time: "12:00", title: "Test" }]);
    const show = getRunOfShow(NOW);
    expect(show[0].icon).toBe("📅");
  });

  it("returns empty array when no items", () => {
    seed([]);
    expect(getRunOfShow(NOW)).toHaveLength(0);
  });

  it("returns empty array when no wedding date", () => {
    initStore({ timeline: { value: ITEMS }, weddingInfo: { value: {} } });
    expect(getRunOfShow(NOW)).toHaveLength(0);
  });

  it("filters items without a time field", () => {
    seed([...ITEMS, { id: "e4", title: "No time" }]);
    expect(getRunOfShow(NOW)).toHaveLength(3);
  });

  it("computes minutesDelta correctly", () => {
    const show = getRunOfShow(NOW);
    // 14:30 is 30 min after NOW (14:00)
    expect(show[1].minutesDelta).toBe(30);
  });
});

describe("getNextItem", () => {
  it("returns the next upcoming event", () => {
    const next = getNextItem(NOW);
    expect(next).not.toBeNull();
    expect(next.title).toBe("Dinner");
  });

  it("returns null when all events are in the past", () => {
    const lateNow = new Date(`${TODAY}T23:00:00`);
    expect(getNextItem(lateNow)).toBeNull();
  });

  it("returns null when no items", () => {
    seed([]);
    expect(getNextItem(NOW)).toBeNull();
  });
});

describe("formatTimeUntil", () => {
  it("formats future minutes", () => {
    expect(formatTimeUntil(30)).toBe("בעוד 30ד׳");
  });

  it("formats past minutes", () => {
    expect(formatTimeUntil(-15)).toBe("לפני 15ד׳");
  });

  it("formats hours and minutes", () => {
    const result = formatTimeUntil(90);
    expect(result).toContain("1ש׳");
    expect(result).toContain("30ד׳");
    expect(result.startsWith("בעוד")).toBe(true);
  });

  it("formats exact hours (zero minutes)", () => {
    const result = formatTimeUntil(120);
    expect(result).toContain("2ש׳");
    // 0 minutes not shown when hours > 0 and minutes == 0
    expect(result).not.toContain("0ד׳");
  });

  it("formats zero delta", () => {
    const result = formatTimeUntil(0);
    expect(result).toBe("בעוד 0ד׳");
  });
});
