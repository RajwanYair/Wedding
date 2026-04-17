/**
 * tests/unit/rsvp-deadline.test.mjs — Sprint 124
 */

import { describe, it, expect } from "vitest";
import {
  getCountdown, isOverdue, msUntilDeadline,
  getReminderSchedule, getOverdueGuests, getDeadlineSummary,
} from "../../src/utils/rsvp-deadline.js";

const now    = new Date();
const FUTURE = new Date(now.getTime() + 10 * 86_400_000); // 10 days ahead
const PAST   = new Date(now.getTime() - 2  * 86_400_000); // 2 days ago

describe("getCountdown", () => {
  it("future deadline: isPast is false", () => {
    expect(getCountdown(FUTURE, now).isPast).toBe(false);
  });

  it("past deadline: isPast is true", () => {
    expect(getCountdown(PAST, now).isPast).toBe(true);
  });

  it("days is correct for 10-day future", () => {
    expect(getCountdown(FUTURE, now).days).toBe(10);
  });
});

describe("isOverdue", () => {
  it("returns false for future deadline", () => {
    expect(isOverdue(FUTURE, now)).toBe(false);
  });

  it("returns true for past deadline", () => {
    expect(isOverdue(PAST, now)).toBe(true);
  });

  it("accepts Date object", () => {
    expect(isOverdue(FUTURE, now)).toBe(false);
  });
});

describe("msUntilDeadline", () => {
  it("returns positive for future", () => {
    expect(msUntilDeadline(FUTURE, now)).toBeGreaterThan(0);
  });

  it("returns negative for past", () => {
    expect(msUntilDeadline(PAST, now)).toBeLessThan(0);
  });
});

describe("getReminderSchedule", () => {
  it("returns sorted future reminders only", () => {
    const schedule = getReminderSchedule(FUTURE, [14, 7, 3, 1], now);
    // FUTURE is 10 days ahead so 14-day and 7-day reminders may or may not be future
    expect(Array.isArray(schedule)).toBe(true);
    for (const r of schedule) {
      expect(r.sendAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it("excludes reminders that have already passed", () => {
    // deadline is 5 days away; 7-day and 14-day reminders are already past
    const deadline = new Date(Date.now() + 5 * 86_400_000);
    const schedule = getReminderSchedule(deadline, [14, 7, 3, 1], now);
    const labels = schedule.map((r) => r.daysBeforeDeadline);
    expect(labels).not.toContain(14);
    expect(labels).not.toContain(7);
    expect(labels).toContain(3);
    expect(labels).toContain(1);
  });

  it("returns empty for overdue deadline", () => {
    expect(getReminderSchedule(PAST, [14, 7, 3, 1], now)).toHaveLength(0);
  });
});

describe("getOverdueGuests", () => {
  const guests = [
    { id: "g1", status: "pending" },
    { id: "g2", status: "confirmed" },
    { id: "g3", status: "maybe" },
    { id: "g4", status: "declined" },
  ];

  it("returns pending + maybe after deadline passed", () => {
    const overdueGuests = getOverdueGuests(guests, PAST, now);
    expect(overdueGuests.map((g) => g.id)).toEqual(["g1", "g3"]);
  });

  it("returns empty before deadline", () => {
    expect(getOverdueGuests(guests, FUTURE, now)).toHaveLength(0);
  });
});

describe("getDeadlineSummary", () => {
  const guests = [
    { id: "g1", status: "pending" },
    { id: "g2", status: "confirmed" },
    { id: "g3", status: "declined" },
  ];

  it("reflects isOverdue correctly", () => {
    expect(getDeadlineSummary(guests, FUTURE, now).isOverdue).toBe(false);
    expect(getDeadlineSummary(guests, PAST, now).isOverdue).toBe(true);
  });

  it("respondedCount counts confirmed + declined", () => {
    expect(getDeadlineSummary(guests, FUTURE, now).respondedCount).toBe(2);
  });

  it("pendingCount is correct", () => {
    expect(getDeadlineSummary(guests, FUTURE, now).pendingCount).toBe(1);
  });
});
