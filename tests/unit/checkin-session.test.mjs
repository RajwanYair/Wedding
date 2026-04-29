/**
 * tests/unit/checkin-session.test.mjs — Sprint 116
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  startSession, endSession, getSession,
  checkIn, isCheckedIn, getSessionStats,
} = await import("../../src/services/security.js");

function seed() {
  initStore({
    checkinSessions: { value: [] },
    guests:          { value: [] },
    weddingInfo:     { value: {} },
  });
}

beforeEach(seed);

describe("startSession", () => {
  it("returns a session id", () => {
    const id = startSession();
    expect(typeof id).toBe("string");
    expect(id).toMatch(/^ci_/);
  });

  it("session is active", () => {
    const id = startSession();
    expect(getSession(id)?.active).toBe(true);
  });

  it("uses provided eventId", () => {
    const id = startSession({ eventId: "evt_1" });
    expect(getSession(id)?.eventId).toBe("evt_1");
  });
});

describe("endSession", () => {
  it("marks session inactive", () => {
    const id = startSession();
    endSession(id);
    expect(getSession(id)?.active).toBe(false);
  });

  it("returns false for unknown session", () => {
    expect(endSession("unknown")).toBe(false);
  });

  it("returns false for already-ended session", () => {
    const id = startSession();
    endSession(id);
    expect(endSession(id)).toBe(false);
  });
});

describe("checkIn", () => {
  it("returns ok for valid check-in", () => {
    const sid = startSession();
    expect(checkIn(sid, "g1")).toBe("ok");
  });

  it("records party size", () => {
    const sid = startSession();
    checkIn(sid, "g1", 4);
    expect(getSession(sid)?.checkIns["g1"]?.partySize).toBe(4);
  });

  it("returns already_checked_in on duplicate", () => {
    const sid = startSession();
    checkIn(sid, "g1");
    expect(checkIn(sid, "g1")).toBe("already_checked_in");
  });

  it("returns session_ended when session is closed", () => {
    const sid = startSession();
    endSession(sid);
    expect(checkIn(sid, "g1")).toBe("session_ended");
  });

  it("returns session_not_found for unknown session", () => {
    expect(checkIn("unknown", "g1")).toBe("session_not_found");
  });
});

describe("isCheckedIn", () => {
  it("returns true after check-in", () => {
    const sid = startSession();
    checkIn(sid, "g1");
    expect(isCheckedIn(sid, "g1")).toBe(true);
  });

  it("returns false before check-in", () => {
    const sid = startSession();
    expect(isCheckedIn(sid, "g99")).toBe(false);
  });
});

describe("getSessionStats", () => {
  it("reflects correct count and party size", () => {
    const sid = startSession();
    checkIn(sid, "g1", 2);
    checkIn(sid, "g2", 3);
    const stats = getSessionStats(sid);
    expect(stats?.guestCount).toBe(2);
    expect(stats?.partySize).toBe(5);
  });

  it("reflects isActive status", () => {
    const sid = startSession();
    expect(getSessionStats(sid)?.isActive).toBe(true);
    endSession(sid);
    expect(getSessionStats(sid)?.isActive).toBe(false);
  });

  it("returns null for unknown session", () => {
    expect(getSessionStats("unknown")).toBeNull();
  });
});
