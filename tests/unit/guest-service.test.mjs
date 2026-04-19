/**
 * tests/unit/guest-service.test.mjs — Unit tests for guest domain service (Phase 1)
 *
 * Run: npm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import { makeGuest } from "./helpers.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  confirmGuest,
  declineGuest,
  tentativeGuest,
  resetGuestStatus,
  assignToTable,
  unassignFromTable,
  bulkSetStatus,
  importGuests,
  getGuestStats,
  findFollowUpCandidates,
  searchGuests,
} = await import("../../src/services/guest-service.js");

function seed(guests = []) {
  initStore({
    guests: { value: guests },
    tables: { value: [] },
    vendors: { value: [] },
    expenses: { value: [] },
    timeline: { value: [] },
    timelineDone: { value: {} },
    rsvp_log: { value: [] },
    weddingInfo: { value: {} },
  });
}

// ── confirmGuest ───────────────────────────────────────────────────────────

describe("confirmGuest", () => {
  beforeEach(() => seed([makeGuest({ id: "g1", status: "pending" })]));

  it("sets status to confirmed", async () => {
    await confirmGuest("g1");
    expect(storeGet("guests")[0].status).toBe("confirmed");
  });

  it("sets rsvpDate", async () => {
    await confirmGuest("g1");
    expect(storeGet("guests")[0].rsvpDate).toBeTruthy();
  });

  it("accepts optional count, meal, notes", async () => {
    await confirmGuest("g1", { count: 3, meal: "vegan", notes: "no nuts" });
    const g = storeGet("guests")[0];
    expect(g.count).toBe(3);
    expect(g.meal).toBe("vegan");
    expect(g.notes).toBe("no nuts");
  });

  it("throws for unknown guest", async () => {
    await expect(confirmGuest("zzz")).rejects.toThrow("Guest not found");
  });
});

// ── declineGuest ──────────────────────────────────────────────────────────

describe("declineGuest", () => {
  beforeEach(() => seed([makeGuest({ id: "g1", status: "pending" })]));

  it("sets status to declined", async () => {
    await declineGuest("g1");
    expect(storeGet("guests")[0].status).toBe("declined");
  });

  it("sets rsvpDate", async () => {
    await declineGuest("g1");
    expect(storeGet("guests")[0].rsvpDate).toBeTruthy();
  });

  it("stores notes when provided", async () => {
    await declineGuest("g1", "travelling abroad");
    expect(storeGet("guests")[0].notes).toBe("travelling abroad");
  });
});

// ── tentativeGuest ────────────────────────────────────────────────────────

describe("tentativeGuest", () => {
  beforeEach(() => seed([makeGuest({ id: "g1" })]));

  it("sets status to maybe", async () => {
    await tentativeGuest("g1");
    expect(storeGet("guests")[0].status).toBe("maybe");
  });
});

// ── resetGuestStatus ──────────────────────────────────────────────────────

describe("resetGuestStatus", () => {
  beforeEach(() =>
    seed([makeGuest({ id: "g1", status: "confirmed", rsvpDate: "2024-01-01T00:00:00Z" })]),
  );

  it("resets to pending", async () => {
    await resetGuestStatus("g1");
    expect(storeGet("guests")[0].status).toBe("pending");
  });

  it("clears rsvpDate", async () => {
    await resetGuestStatus("g1");
    expect(storeGet("guests")[0].rsvpDate).toBeNull();
  });
});

// ── assignToTable / unassignFromTable ─────────────────────────────────────

describe("assignToTable + unassignFromTable", () => {
  beforeEach(() => seed([makeGuest({ id: "g1", tableId: null })]));

  it("assigns guest to table", async () => {
    await assignToTable("g1", "t42");
    expect(storeGet("guests")[0].tableId).toBe("t42");
  });

  it("unassigns guest from table", async () => {
    storeSet("guests", [makeGuest({ id: "g1", tableId: "t42" })]);
    await unassignFromTable("g1");
    expect(storeGet("guests")[0].tableId).toBeNull();
  });
});

// ── bulkSetStatus ─────────────────────────────────────────────────────────

describe("bulkSetStatus", () => {
  beforeEach(() =>
    seed([
      makeGuest({ id: "g1", status: "pending" }),
      makeGuest({ id: "g2", status: "pending" }),
      makeGuest({ id: "g3", status: "confirmed" }),
    ]),
  );

  it("sets status for matched guests only", async () => {
    await bulkSetStatus(["g1", "g2"], "confirmed");
    const guests = storeGet("guests");
    expect(guests.find((g) => g.id === "g1").status).toBe("confirmed");
    expect(guests.find((g) => g.id === "g2").status).toBe("confirmed");
  });

  it("does not affect unmatched guests", async () => {
    await bulkSetStatus(["g1"], "declined");
    expect(storeGet("guests").find((g) => g.id === "g3").status).toBe("confirmed");
  });
});

// ── importGuests ──────────────────────────────────────────────────────────

describe("importGuests", () => {
  beforeEach(() => seed());

  it("creates guests from valid rows", async () => {
    const result = await importGuests([
      { firstName: "Alice", lastName: "Smith", phone: "0501234567", side: "groom" },
      { firstName: "Bob", lastName: "Jones", phone: "0507654321", side: "bride" },
    ]);
    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);
    expect(storeGet("guests")).toHaveLength(2);
  });

  it("skips rows with no firstName or lastName", async () => {
    const result = await importGuests([{ phone: "0501234567" }]);
    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
  });

  it("falls back to safe defaults for unknown enums", async () => {
    await importGuests([{ firstName: "X", side: "unknown", group: "xyz", meal: "bizarre" }]);
    const g = storeGet("guests")[0];
    expect(g.side).toBe("mutual");
    expect(g.group).toBe("other");
    expect(g.meal).toBe("regular");
  });
});

// ── getGuestStats ─────────────────────────────────────────────────────────

describe("getGuestStats", () => {
  beforeEach(() =>
    seed([
      makeGuest({ id: "g1", status: "confirmed", count: 2, meal: "regular", side: "groom", checkedIn: true }),
      makeGuest({ id: "g2", status: "confirmed", count: 1, meal: "vegan", side: "bride", tableId: "t1" }),
      makeGuest({ id: "g3", status: "pending", count: 1, meal: "regular", side: "bride" }),
      makeGuest({ id: "g4", status: "declined", count: 1, meal: "regular", side: "groom" }),
    ]),
  );

  it("counts total, confirmed, pending, declined", async () => {
    const s = await getGuestStats();
    expect(s.total).toBe(4);
    expect(s.confirmed).toBe(2);
    expect(s.pending).toBe(1);
    expect(s.declined).toBe(1);
  });

  it("counts seated and checkedIn guests", async () => {
    const s = await getGuestStats();
    expect(s.seated).toBe(1);
    expect(s.checkedIn).toBe(1);
  });

  it("computes confirmedGuests (sum of counts)", async () => {
    const s = await getGuestStats();
    expect(s.confirmedGuests).toBe(3); // g1.count=2 + g2.count=1
  });

  it("breaks down by meal", async () => {
    const s = await getGuestStats();
    expect(s.byMeal.regular).toBeGreaterThanOrEqual(1);
    expect(s.byMeal.vegan).toBe(1);
  });

  it("breaks down by side", async () => {
    const s = await getGuestStats();
    expect(s.bySide.groom).toBeGreaterThanOrEqual(1);
    expect(s.bySide.bride).toBeGreaterThanOrEqual(1);
  });
});

// ── findFollowUpCandidates ────────────────────────────────────────────────

describe("findFollowUpCandidates", () => {
  it("returns pending guests older than threshold", async () => {
    const old = makeGuest({ id: "g1", status: "pending", createdAt: "2024-01-01T00:00:00Z" });
    const fresh = makeGuest({ id: "g2", status: "pending", createdAt: new Date().toISOString() });
    seed([old, fresh]);
    const results = await findFollowUpCandidates(7);
    expect(results.some((g) => g.id === "g1")).toBe(true);
    expect(results.some((g) => g.id === "g2")).toBe(false);
  });

  it("excludes confirmed guests", async () => {
    seed([makeGuest({ id: "g1", status: "confirmed", createdAt: "2024-01-01T00:00:00Z" })]);
    const results = await findFollowUpCandidates(7);
    expect(results).toHaveLength(0);
  });
});

// ── searchGuests ─────────────────────────────────────────────────────────

describe("searchGuests", () => {
  beforeEach(() =>
    seed([
      makeGuest({ id: "g1", firstName: "Alice", lastName: "Smith", phone: "0501111111", email: "alice@test.com" }),
      makeGuest({ id: "g2", firstName: "Bob", lastName: "Jones", phone: "0502222222", email: "bob@test.com" }),
    ]),
  );

  it("finds by firstName (case insensitive)", async () => {
    const r = await searchGuests("alice");
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("g1");
  });

  it("finds by lastName", async () => {
    const r = await searchGuests("jones");
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("g2");
  });

  it("finds by phone", async () => {
    expect(await searchGuests("1111")).toHaveLength(1);
  });

  it("finds by email", async () => {
    expect(await searchGuests("bob@test")).toHaveLength(1);
  });

  it("returns all active guests for empty query", async () => {
    expect(await searchGuests("")).toHaveLength(2);
  });

  it("returns empty for no match", async () => {
    expect(await searchGuests("zzznomatch")).toHaveLength(0);
  });
});
