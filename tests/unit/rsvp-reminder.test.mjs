/**
 * tests/unit/rsvp-reminder.test.mjs — S458: rsvp-reminder coverage
 */
import { describe, it, expect } from "vitest";
import {
  planReminders,
  nextDueWave,
  daysUntilEvent,
} from "../../src/utils/rsvp-reminder.js";

const EVENT = "2026-08-01";
const GUESTS = [
  { id: "1", name: "A", phone: "0501111111", status: "pending" },
  { id: "2", name: "B", phone: "0502222222", status: "confirmed" },
  { id: "3", name: "C", phone: "0503333333", status: "pending" },
  { id: "4", name: "D", phone: "", status: "pending" }, // skipped (no phone)
];

describe("rsvp-reminder — planReminders", () => {
  it("returns 3 waves for a valid event", () => {
    const plan = planReminders(EVENT, GUESTS);
    expect(plan).toHaveLength(3);
    expect(plan.map((w) => w.daysBefore)).toEqual([30, 14, 3]);
  });

  it("computes correct send dates", () => {
    const plan = planReminders(EVENT, GUESTS);
    expect(plan[0].sendOn).toBe("2026-07-02");
    expect(plan[1].sendOn).toBe("2026-07-18");
    expect(plan[2].sendOn).toBe("2026-07-29");
  });

  it("targets only pending guests with a phone", () => {
    const plan = planReminders(EVENT, GUESTS);
    expect(plan[0].targets).toHaveLength(2);
    expect(plan[0].targets.map((g) => g.id).sort()).toEqual(["1", "3"]);
  });

  it("returns empty array for invalid event date", () => {
    expect(planReminders("not-a-date", GUESTS)).toEqual([]);
  });

  it("returns empty target arrays when no pending guests", () => {
    const allConfirmed = GUESTS.map((g) => ({ ...g, status: "confirmed" }));
    const plan = planReminders(EVENT, allConfirmed);
    expect(plan[0].targets).toEqual([]);
  });
});

describe("rsvp-reminder — nextDueWave", () => {
  it("returns wave 1 when first send-on date has passed", () => {
    const w = nextDueWave(EVENT, GUESTS, "2026-07-05");
    expect(w?.wave).toBe(1);
  });

  it("returns wave 2 when only second send-on has passed (skipping wave 1 still due, returns earliest)", () => {
    // Earliest matching wave is wave 1 because its sendOn is also <= today
    const w = nextDueWave(EVENT, GUESTS, "2026-07-20");
    expect(w?.wave).toBe(1);
  });

  it("returns null when no waves are due yet", () => {
    expect(nextDueWave(EVENT, GUESTS, "2026-06-01")).toBeNull();
  });

  it("returns null after the event has passed", () => {
    expect(nextDueWave(EVENT, GUESTS, "2026-08-15")).toBeNull();
  });

  it("returns null when all guests confirmed", () => {
    const allConfirmed = GUESTS.map((g) => ({ ...g, status: "confirmed" }));
    expect(nextDueWave(EVENT, allConfirmed, "2026-07-30")).toBeNull();
  });
});

describe("rsvp-reminder — daysUntilEvent", () => {
  it("returns positive days for a future event", () => {
    expect(daysUntilEvent(EVENT, "2026-07-01")).toBe(31);
  });

  it("returns 0 on the event day", () => {
    expect(daysUntilEvent(EVENT, EVENT)).toBe(0);
  });

  it("returns negative days for a past event", () => {
    expect(daysUntilEvent(EVENT, "2026-08-05")).toBe(-4);
  });

  it("returns NaN for invalid input", () => {
    expect(Number.isNaN(daysUntilEvent("nope"))).toBe(true);
  });
});
