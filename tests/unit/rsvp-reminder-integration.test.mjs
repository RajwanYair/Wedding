/**
 * S617 RSVP reminder wiring smoke test.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initStore, storeSet } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(() => Promise.resolve()),
  appendToRsvpLog: vi.fn(() => Promise.resolve()),
}));

const SECTION = readFileSync("src/sections/rsvp.js", "utf8");

describe("S617 RSVP reminder wiring", () => {
  beforeEach(() => {
    initStore({ weddingInfo: { value: {} }, guests: { value: [] } });
  });

  it("imports planReminders + nextDueWave from utils/rsvp-reminder.js", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/rsvp-reminder\.js"/);
  });

  it("getReminderPlan returns empty array without event date", async () => {
    const { getReminderPlan } = await import("../../src/sections/rsvp.js");
    expect(getReminderPlan()).toEqual([]);
  });

  it("getReminderPlan emits 3 waves at 30/14/3 days before event", async () => {
    storeSet("weddingInfo", { weddingDate: "2030-06-01" });
    storeSet("guests", [{ id: "g1", phone: "+972500000000", status: "pending" }]);
    const { getReminderPlan } = await import("../../src/sections/rsvp.js");
    const plan = getReminderPlan();
    expect(plan).toHaveLength(3);
    expect(plan.map((w) => w.daysBefore)).toEqual([30, 14, 3]);
    expect(plan[0].targets).toHaveLength(1);
  });

  it("getNextDueReminder picks wave whose sendOn has passed", async () => {
    storeSet("weddingInfo", { weddingDate: "2030-06-01" });
    storeSet("guests", [{ id: "g1", phone: "+972500000000", status: "pending" }]);
    const { getNextDueReminder } = await import("../../src/sections/rsvp.js");
    const due = getNextDueReminder("2030-05-25"); // 7 days before, both 30 and 14 due
    expect(due?.daysBefore).toBe(30);
  });

  it("getNextDueReminder returns null after event passed", async () => {
    storeSet("weddingInfo", { weddingDate: "2020-01-01" });
    storeSet("guests", [{ id: "g1", phone: "+972500000000", status: "pending" }]);
    const { getNextDueReminder } = await import("../../src/sections/rsvp.js");
    expect(getNextDueReminder("2030-01-01")).toBeNull();
  });
});
