import { describe, it, expect } from "vitest";
import {
  LIFECYCLE_STAGES,
  TERMINAL_STAGES,
  ALLOWED_TRANSITIONS,
  canTransition,
  transitionGuest,
  forceStage,
  stageOrdinal,
  isLaterStage,
  isTerminal,
  isCheckedIn,
  isConfirmed,
  groupByStage,
  buildLifecycleSummary,
  guestsBeforeStage,
} from "../../src/utils/guest-lifecycle.js";

const GUEST = { id: "g1", name: "Alice", stage: "invited" };

// ── Constants ─────────────────────────────────────────────────────────────

describe("LIFECYCLE_STAGES", () => {
  it("is frozen", () => expect(Object.isFrozen(LIFECYCLE_STAGES)).toBe(true));
  it("starts with new", () => expect(LIFECYCLE_STAGES[0]).toBe("new"));
  it("ends with checked_in", () => expect(LIFECYCLE_STAGES[LIFECYCLE_STAGES.length - 1]).toBe("checked_in"));
});

describe("TERMINAL_STAGES", () => {
  it("is frozen", () => expect(Object.isFrozen(TERMINAL_STAGES)).toBe(true));
  it("contains confirmed, declined, checked_in", () => {
    expect(TERMINAL_STAGES).toContain("confirmed");
    expect(TERMINAL_STAGES).toContain("declined");
    expect(TERMINAL_STAGES).toContain("checked_in");
  });
});

describe("ALLOWED_TRANSITIONS", () => {
  it("is frozen", () => expect(Object.isFrozen(ALLOWED_TRANSITIONS)).toBe(true));
  it("new can transition to invited", () => expect(ALLOWED_TRANSITIONS.new).toContain("invited"));
  it("checked_in has no transitions", () => expect(ALLOWED_TRANSITIONS.checked_in).toHaveLength(0));
});

// ── canTransition ─────────────────────────────────────────────────────────

describe("canTransition()", () => {
  it("allows valid transition", () => expect(canTransition("invited", "rsvp_sent")).toBe(true));
  it("blocks invalid transition", () => expect(canTransition("new", "checked_in")).toBe(false));
  it("allows confirmed -> checked_in", () => expect(canTransition("confirmed", "checked_in")).toBe(true));
  it("returns false for unknown from", () => expect(canTransition("unknown_stage", "confirmed")).toBe(false));
});

// ── transitionGuest ───────────────────────────────────────────────────────

describe("transitionGuest()", () => {
  it("returns null for invalid transition", () => {
    expect(transitionGuest(GUEST, "checked_in")).toBeNull();
  });
  it("returns null for null guest", () => expect(transitionGuest(null, "invited")).toBeNull());
  it("returns updated guest for valid transition", () => {
    const result = transitionGuest(GUEST, "rsvp_sent");
    expect(result.stage).toBe("rsvp_sent");
    expect(result.id).toBe("g1");
  });
  it("does not mutate original", () => {
    transitionGuest(GUEST, "rsvp_sent");
    expect(GUEST.stage).toBe("invited");
  });
  it("appends to stageHistory", () => {
    const result = transitionGuest(GUEST, "rsvp_sent");
    expect(result.stageHistory).toHaveLength(1);
    expect(result.stageHistory[0].from).toBe("invited");
    expect(result.stageHistory[0].to).toBe("rsvp_sent");
  });
  it("preserves existing stageHistory", () => {
    const guest = { ...GUEST, stageHistory: [{ from: "new", to: "invited", at: "t" }] };
    const result = transitionGuest(guest, "rsvp_sent");
    expect(result.stageHistory).toHaveLength(2);
  });
  it("merges meta into result", () => {
    const result = transitionGuest(GUEST, "rsvp_sent", { checkinTime: "2025-07-13T10:00:00Z" });
    expect(result.checkinTime).toBe("2025-07-13T10:00:00Z");
  });
  it("defaults stage to new when guest has no stage", () => {
    const noStageGuest = { id: "g2" };
    const result = transitionGuest(noStageGuest, "invited");
    expect(result.stage).toBe("invited");
  });
});

// ── forceStage ────────────────────────────────────────────────────────────

describe("forceStage()", () => {
  it("sets stage bypassing transition rules", () => {
    const result = forceStage(GUEST, "checked_in");
    expect(result.stage).toBe("checked_in");
  });
  it("marks history entry as forced", () => {
    const result = forceStage(GUEST, "checked_in");
    expect(result.stageHistory[result.stageHistory.length - 1].forced).toBe(true);
  });
  it("handles null guest", () => {
    const result = forceStage(null, "confirmed");
    expect(result.stage).toBe("confirmed");
  });
});

// ── stageOrdinal ──────────────────────────────────────────────────────────

describe("stageOrdinal()", () => {
  it("returns 0 for new", () => expect(stageOrdinal("new")).toBe(0));
  it("returns -1 for unknown", () => expect(stageOrdinal("unknown")).toBe(-1));
  it("checked_in is last", () => expect(stageOrdinal("checked_in")).toBe(LIFECYCLE_STAGES.length - 1));
});

// ── isLaterStage ──────────────────────────────────────────────────────────

describe("isLaterStage()", () => {
  it("confirmed is later than invited", () => expect(isLaterStage("confirmed", "invited")).toBe(true));
  it("new is not later than invited", () => expect(isLaterStage("new", "invited")).toBe(false));
  it("same stage is not later", () => expect(isLaterStage("invited", "invited")).toBe(false));
});

// ── isTerminal / isCheckedIn / isConfirmed ────────────────────────────────

describe("isTerminal()", () => {
  it("confirmed is terminal", () => expect(isTerminal({ stage: "confirmed" })).toBe(true));
  it("invited is not terminal", () => expect(isTerminal({ stage: "invited" })).toBe(false));
  it("handles null", () => expect(isTerminal(null)).toBe(false));
});

describe("isCheckedIn()", () => {
  it("returns true for checked_in stage", () => expect(isCheckedIn({ stage: "checked_in" })).toBe(true));
  it("returns false for confirmed", () => expect(isCheckedIn({ stage: "confirmed" })).toBe(false));
});

describe("isConfirmed()", () => {
  it("returns true for confirmed", () => expect(isConfirmed({ stage: "confirmed" })).toBe(true));
  it("returns true for checked_in (super-confirmed)", () => expect(isConfirmed({ stage: "checked_in" })).toBe(true));
  it("returns false for invited", () => expect(isConfirmed({ stage: "invited" })).toBe(false));
});

// ── groupByStage ──────────────────────────────────────────────────────────

describe("groupByStage()", () => {
  it("groups guests correctly", () => {
    const guests = [
      { id: "g1", stage: "invited" },
      { id: "g2", stage: "confirmed" },
      { id: "g3", stage: "invited" },
    ];
    const groups = groupByStage(guests);
    expect(groups.invited).toHaveLength(2);
    expect(groups.confirmed).toHaveLength(1);
  });
  it("defaults stage to new when missing", () => {
    const groups = groupByStage([{ id: "g1" }]);
    expect(groups.new).toHaveLength(1);
  });
  it("returns empty object for null", () => expect(groupByStage(null)).toEqual({}));
});

// ── buildLifecycleSummary ─────────────────────────────────────────────────

describe("buildLifecycleSummary()", () => {
  it("returns zero totals for empty array", () => {
    const s = buildLifecycleSummary([]);
    expect(s.total).toBe(0);
    expect(s.confirmedRate).toBe(0);
  });
  it("calculates confirmedRate", () => {
    const guests = [
      { stage: "confirmed" },
      { stage: "confirmed" },
      { stage: "invited" },
      { stage: "invited" },
    ];
    const s = buildLifecycleSummary(guests);
    expect(s.confirmedRate).toBe(0.5);
  });
  it("includes checked_in in confirmedRate", () => {
    const guests = [{ stage: "checked_in" }, { stage: "invited" }];
    const s = buildLifecycleSummary(guests);
    expect(s.confirmedRate).toBe(0.5);
    expect(s.checkinRate).toBe(0.5);
  });
  it("returns empty stats for null", () => {
    const s = buildLifecycleSummary(null);
    expect(s.total).toBe(0);
  });
});

// ── guestsBeforeStage ─────────────────────────────────────────────────────

describe("guestsBeforeStage()", () => {
  const guests = [
    { id: "g1", stage: "new" },
    { id: "g2", stage: "invited" },
    { id: "g3", stage: "confirmed" },
    { id: "g4", stage: "checked_in" },
  ];
  it("returns guests before rsvp_sent", () => {
    const result = guestsBeforeStage(guests, "rsvp_sent");
    const ids = result.map((g) => g.id);
    expect(ids).toContain("g1");
    expect(ids).toContain("g2");
    expect(ids).not.toContain("g3");
  });
  it("returns empty for null", () => expect(guestsBeforeStage(null, "confirmed")).toEqual([]));
});
