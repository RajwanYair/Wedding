/**
 * tests/unit/smart-automation.test.mjs — Unit tests for smart-automation.js
 */
import { describe, it, expect } from "vitest";
import {
  smartFollowUp,
  summarizeFollowUp,
  buildDayOfPlaybook,
  scoreSeatingCandidate,
} from "../../src/utils/smart-automation.js";

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeGuest(overrides = {}) {
  return {
    id: "g1",
    firstName: "Test",
    lastName: "Guest",
    phone: "0541234567",
    email: "",
    status: "pending",
    side: "groom",
    group: "friends",
    meal: "regular",
    tableId: null,
    sent: false,
    rsvpDate: null,
    checkedIn: false,
    count: 1,
    vip: false,
    ...overrides,
  };
}

function makeTable(overrides = {}) {
  return { id: "t1", name: "Table 1", capacity: 8, shape: "round", ...overrides };
}

const DAYS_AGO = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

// ── smartFollowUp ─────────────────────────────────────────────────────────

describe("smartFollowUp", () => {
  it("returns empty array when all guests confirmed", () => {
    const guests = [makeGuest({ status: "confirmed" }), makeGuest({ id: "g2", status: "declined" })];
    expect(smartFollowUp(guests)).toHaveLength(0);
  });

  it("flags pending guest with invite not sent as low priority", () => {
    const guests = [makeGuest({ sent: false, status: "pending" })];
    const result = smartFollowUp(guests);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe("low");
    expect(result[0].reason).toBe("invitation_not_sent");
  });

  it("flags pending guest 7+ days no response as high priority", () => {
    const guests = [makeGuest({ sent: true, status: "pending", rsvpDate: DAYS_AGO(9) })];
    const result = smartFollowUp(guests);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe("high");
    expect(result[0].daysSinceSent).toBeGreaterThanOrEqual(9);
  });

  it("flags pending guest 3–6 days as medium priority", () => {
    const guests = [makeGuest({ sent: true, status: "pending", rsvpDate: DAYS_AGO(4) })];
    const result = smartFollowUp(guests);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe("medium");
  });

  it("flags maybe response 5+ days as medium priority", () => {
    const guests = [makeGuest({ status: "maybe", sent: true, rsvpDate: DAYS_AGO(6) })];
    const result = smartFollowUp(guests);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe("medium");
    expect(result[0].reason).toBe("maybe_response_needs_confirmation");
  });

  it("does not flag checked-in guests", () => {
    const guests = [makeGuest({ checkedIn: true, status: "pending", sent: false })];
    expect(smartFollowUp(guests)).toHaveLength(0);
  });

  it("sorts high priority before medium", () => {
    const guests = [
      makeGuest({ id: "g1", sent: true, status: "pending", rsvpDate: DAYS_AGO(4) }), // medium
      makeGuest({ id: "g2", sent: true, status: "pending", rsvpDate: DAYS_AGO(10) }), // high
    ];
    const result = smartFollowUp(guests);
    expect(result[0].priority).toBe("high");
    expect(result[1].priority).toBe("medium");
  });

  it("VIP with 3-day pending gets high priority", () => {
    const guests = [makeGuest({ sent: true, status: "pending", rsvpDate: DAYS_AGO(4), vip: true })];
    const result = smartFollowUp(guests);
    expect(result[0].priority).toBe("high");
  });
});

// ── summarizeFollowUp ─────────────────────────────────────────────────────

describe("summarizeFollowUp", () => {
  it("counts by priority correctly", () => {
    const candidates = [
      { priority: "high" }, { priority: "high" }, { priority: "medium" }, { priority: "low" },
    ];
    const summary = summarizeFollowUp(/** @type {any} */ (candidates));
    expect(summary).toEqual({ high: 2, medium: 1, low: 1, total: 4 });
  });

  it("returns zeros for empty array", () => {
    expect(summarizeFollowUp([])).toEqual({ high: 0, medium: 0, low: 0, total: 0 });
  });
});

// ── buildDayOfPlaybook ────────────────────────────────────────────────────

describe("buildDayOfPlaybook", () => {
  it("returns sorted steps from timeline", () => {
    const timeline = [
      { id: "1", title: "קבלת פנים", time: "17:00", category: "reception" },
      { id: "2", title: "טקס", time: "18:30", category: "ceremony" },
    ];
    const steps = buildDayOfPlaybook(timeline, []);
    // Should be sorted chronologically; buffer steps before ceremony
    const times = steps.map((s) => s.time);
    expect(times).toEqual([...times].sort());
  });

  it("adds vendor check-in step for catering vendor", () => {
    const vendors = [{ id: "v1", name: "Catering Inc.", category: "catering", phone: "0521234567" }];
    const steps = buildDayOfPlaybook([], vendors);
    const cateringStep = steps.find((s) => s.vendorName === "Catering Inc.");
    expect(cateringStep).toBeTruthy();
    expect(cateringStep?.time).toBe("10:00");
  });

  it("adds pre-event buffer step for critical milestones", () => {
    const timeline = [{ id: "1", title: "טקס", time: "18:00", category: "ceremony" }];
    const steps = buildDayOfPlaybook(timeline, []);
    const bufferStep = steps.find((s) => s.title.includes("הכנה"));
    expect(bufferStep).toBeTruthy();
    expect(bufferStep?.time).toBe("17:30"); // 30 min before 18:00
  });

  it("classifies ceremony as critical", () => {
    const timeline = [{ id: "1", title: "טקס", time: "18:00", category: "ceremony" }];
    const steps = buildDayOfPlaybook(timeline, []);
    const ceremonyStep = steps.find((s) => s.title === "טקס");
    expect(ceremonyStep?.priority).toBe("critical");
  });

  it("returns empty array for empty inputs", () => {
    expect(buildDayOfPlaybook([], [])).toHaveLength(0);
  });
});

// ── scoreSeatingCandidate ─────────────────────────────────────────────────

describe("scoreSeatingCandidate", () => {
  it("returns 0 when table is at capacity", () => {
    const table = makeTable({ capacity: 2 });
    const seated = [makeGuest({ id: "g1", count: 2 })];
    const candidate = makeGuest({ id: "g2" });
    expect(scoreSeatingCandidate(candidate, table, seated)).toBe(0);
  });

  it("returns max score for empty table", () => {
    const score = scoreSeatingCandidate(makeGuest(), makeTable(), []);
    expect(score).toBe(100);
  });

  it("penalizes mismatched side", () => {
    const table = makeTable();
    const seated = [makeGuest({ id: "g1", side: "bride" })];
    const candidate = makeGuest({ id: "g2", side: "groom" });
    const score = scoreSeatingCandidate(candidate, table, seated);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("gives higher score for matching side + group + meal", () => {
    const table = makeTable();
    const seated = [makeGuest({ id: "g1", side: "groom", group: "friends", meal: "regular" })];
    const matchCandidate = makeGuest({ id: "g2", side: "groom", group: "friends", meal: "regular" });
    const mismatch = makeGuest({ id: "g3", side: "bride", group: "family", meal: "vegan" });
    const matchScore = scoreSeatingCandidate(matchCandidate, table, seated);
    const mismatchScore = scoreSeatingCandidate(mismatch, table, seated);
    expect(matchScore).toBeGreaterThan(mismatchScore);
  });
});
