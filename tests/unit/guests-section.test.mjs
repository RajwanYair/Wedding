/**
 * tests/unit/guests-section.test.mjs — S347: data helpers in src/sections/guests.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Store ─────────────────────────────────────────────────────────────────

const _store = new Map();

vi.mock("../../src/core/store.js", () => ({
  storeGet: (k) => _store.get(k) ?? null,
  storeSet: vi.fn((k, v) => _store.set(k, v)),
  storeSubscribe: vi.fn(() => () => {}),
  storeSubscribeScoped: vi.fn(() => () => {}),
  cleanupScope: vi.fn(),
}));

// ── Deps ──────────────────────────────────────────────────────────────────

vi.mock("../../src/core/i18n.js", () => ({ t: (k) => k }));
vi.mock("../../src/core/dom.js", () => ({ el: new Proxy({}, { get: () => null }) }));
vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/utils/misc.js", () => ({ uid: () => "uid-guest-001" }));
vi.mock("../../src/utils/sanitize.js", () => ({
  sanitize: (data, _schema) => ({ value: data, errors: [] }),
}));
vi.mock("../../src/utils/phone.js", () => ({
  cleanPhone: (p) => p,
  isValidPhone: () => true,
}));
vi.mock("../../src/utils/guest-search.js", () => ({
  guestMatchesQuery: vi.fn(() => true),
}));
vi.mock("../../src/utils/undo.js", () => ({ pushUndo: vi.fn() }));
vi.mock("../../src/core/section-base.js", () => ({
  BaseSection: class {
    constructor(_name) {}
    subscribe() {}
  },
  fromSection: (_s) => ({ mount: vi.fn(), unmount: vi.fn(), capabilities: [] }),
}));
vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));

vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock"),
  revokeObjectURL: vi.fn(),
});
vi.stubGlobal("print", vi.fn());

afterEach(() => vi.unstubAllGlobals());

import {
  saveGuest,
  deleteGuest,
  setFilter,
  setSortField,
  setSearchQuery,
  setSideFilter,
  getGuestStats,
  filterGuestsByStatus,
  getGuestsByGroup,
  getGuestsNeedingFollowup,
  getSeatingGaps,
  getGuestResponseTimeline,
  getDuplicateGuests,
  getPlusOneStats,
} from "../../src/sections/guests.js";

// ── Helpers ───────────────────────────────────────────────────────────────

const mkGuest = (overrides = {}) => ({
  id: "g1",
  firstName: "Yair",
  lastName: "Test",
  phone: "0541234567",
  status: "pending",
  count: 1,
  children: 0,
  side: "groom",
  group: "family",
  meal: "regular",
  tableId: null,
  vip: false,
  ...overrides,
});

beforeEach(() => {
  _store.clear();
  vi.clearAllMocks();
});

// ── saveGuest ─────────────────────────────────────────────────────────────

describe("saveGuest", () => {
  it("adds a new guest to the store", () => {
    _store.set("guests", []);
    const result = saveGuest({ firstName: "Avi", count: 1 });
    expect(result.ok).toBe(true);
    expect(_store.get("guests")).toHaveLength(1);
    expect(_store.get("guests")[0].firstName).toBe("Avi");
  });

  it("updates an existing guest when existingId is provided", () => {
    _store.set("guests", [mkGuest({ id: "g1", firstName: "Old" })]);
    saveGuest({ firstName: "New", count: 1 }, "g1");
    expect(_store.get("guests")[0].firstName).toBe("New");
  });

  it("returns ok:false for non-existent existingId", () => {
    _store.set("guests", []);
    const result = saveGuest({ firstName: "X" }, "nonexistent");
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate phone", () => {
    _store.set("guests", [mkGuest({ id: "g1", phone: "0541234567" })]);
    const result = saveGuest({ firstName: "Dupe", phone: "0541234567" });
    expect(result.ok).toBe(false);
  });
});

// ── deleteGuest ───────────────────────────────────────────────────────────

describe("deleteGuest", () => {
  it("removes the guest with the given id", () => {
    _store.set("guests", [mkGuest({ id: "g1" }), mkGuest({ id: "g2" })]);
    deleteGuest("g1");
    expect(_store.get("guests")).toHaveLength(1);
    expect(_store.get("guests")[0].id).toBe("g2");
  });

  it("does nothing for unknown id", () => {
    _store.set("guests", [mkGuest({ id: "g1" })]);
    deleteGuest("unknown");
    expect(_store.get("guests")).toHaveLength(1);
  });
});

// ── setFilter / setSortField / setSearchQuery / setSideFilter ─────────────

describe("UI state setters", () => {
  it("setFilter does not throw", () => {
    expect(() => setFilter("confirmed")).not.toThrow();
    expect(() => setFilter("all")).not.toThrow();
  });

  it("setSortField does not throw", () => {
    expect(() => setSortField("firstName")).not.toThrow();
  });

  it("setSearchQuery does not throw", () => {
    expect(() => setSearchQuery("yair")).not.toThrow();
    expect(() => setSearchQuery("")).not.toThrow();
  });

  it("setSideFilter does not throw", () => {
    expect(() => setSideFilter("groom")).not.toThrow();
    expect(() => setSideFilter("all")).not.toThrow();
  });
});

// ── getGuestStats ─────────────────────────────────────────────────────────

describe("getGuestStats", () => {
  it("returns zeros for empty store", () => {
    _store.set("guests", []);
    const s = getGuestStats();
    expect(s.total).toBe(0);
    expect(s.confirmed).toBe(0);
    expect(s.pending).toBe(0);
  });

  it("counts confirmed and pending separately", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", status: "confirmed", count: 2 }),
      mkGuest({ id: "g2", status: "pending", count: 1 }),
      mkGuest({ id: "g3", status: "declined", count: 1 }),
    ]);
    const s = getGuestStats();
    expect(s.total).toBe(3);
    expect(s.confirmed).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.declined).toBe(1);
    expect(s.confirmedSeats).toBe(2);
    expect(s.totalSeats).toBe(4);
  });

  it("counts sides correctly", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", side: "groom" }),
      mkGuest({ id: "g2", side: "bride" }),
      mkGuest({ id: "g3", side: "mutual" }),
    ]);
    const s = getGuestStats();
    expect(s.groom).toBe(1);
    expect(s.bride).toBe(1);
    expect(s.mutual).toBe(1);
  });

  it("counts seated vs unseated", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: "t1" }),
      mkGuest({ id: "g2", tableId: null }),
    ]);
    const s = getGuestStats();
    expect(s.seated).toBe(1);
    expect(s.unseated).toBe(1);
  });
});

// ── filterGuestsByStatus ──────────────────────────────────────────────────

describe("filterGuestsByStatus", () => {
  beforeEach(() => {
    _store.set("guests", [
      mkGuest({ id: "g1", status: "confirmed" }),
      mkGuest({ id: "g2", status: "pending" }),
      mkGuest({ id: "g3", status: "declined" }),
    ]);
  });

  it("returns all guests for status=all", () => {
    expect(filterGuestsByStatus("all")).toHaveLength(3);
  });

  it("returns all guests when no status provided", () => {
    expect(filterGuestsByStatus()).toHaveLength(3);
  });

  it("filters by confirmed", () => {
    const result = filterGuestsByStatus("confirmed");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });
});

// ── getGuestsByGroup ──────────────────────────────────────────────────────

describe("getGuestsByGroup", () => {
  it("groups guests by group field", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", group: "family" }),
      mkGuest({ id: "g2", group: "friends" }),
      mkGuest({ id: "g3", group: "family" }),
    ]);
    const groups = getGuestsByGroup();
    expect(groups.family).toHaveLength(2);
    expect(groups.friends).toHaveLength(1);
    expect(groups.work).toHaveLength(0);
  });
});

// ── getGuestsNeedingFollowup ──────────────────────────────────────────────

describe("getGuestsNeedingFollowup", () => {
  it("returns empty when no rsvpDeadline", () => {
    _store.set("weddingInfo", {});
    _store.set("guests", [mkGuest({ status: "pending", phone: "054" })]);
    expect(getGuestsNeedingFollowup()).toHaveLength(0);
  });

  it("returns empty when deadline is in the future", () => {
    _store.set("weddingInfo", { rsvpDeadline: "2099-01-01" });
    _store.set("guests", [mkGuest({ status: "pending", phone: "054" })]);
    expect(getGuestsNeedingFollowup()).toHaveLength(0);
  });

  it("returns pending guests with phone when deadline has passed", () => {
    _store.set("weddingInfo", { rsvpDeadline: "2000-01-01" });
    _store.set("guests", [
      mkGuest({ id: "g1", status: "pending", phone: "054" }),
      mkGuest({ id: "g2", status: "confirmed", phone: "055" }),
      mkGuest({ id: "g3", status: "pending", phone: "" }),
    ]);
    const result = getGuestsNeedingFollowup();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("g1");
  });
});

// ── getSeatingGaps ────────────────────────────────────────────────────────

describe("getSeatingGaps", () => {
  it("returns tables with remaining capacity", () => {
    _store.set("tables", [
      { id: "t1", name: "T1", capacity: 10 },
      { id: "t2", name: "T2", capacity: 5 },
    ]);
    _store.set("guests", [
      mkGuest({ id: "g1", tableId: "t1", count: 10 }), // fills t1
    ]);
    const gaps = getSeatingGaps();
    expect(gaps.some((g) => g.table.id === "t2")).toBe(true);
    expect(gaps.some((g) => g.table.id === "t1" && g.remaining === 0)).toBe(false);
  });
});

// ── getGuestResponseTimeline ──────────────────────────────────────────────

describe("getGuestResponseTimeline", () => {
  it("returns empty for guests with no rsvpDate", () => {
    _store.set("guests", [mkGuest({ rsvpDate: null })]);
    expect(getGuestResponseTimeline()).toHaveLength(0);
  });

  it("groups by date and counts", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", rsvpDate: "2024-01-01" }),
      mkGuest({ id: "g2", rsvpDate: "2024-01-01" }),
      mkGuest({ id: "g3", rsvpDate: "2024-01-02" }),
    ]);
    const timeline = getGuestResponseTimeline();
    expect(timeline).toHaveLength(2);
    expect(timeline.find((t) => t.date === "2024-01-01")?.count).toBe(2);
  });
});

// ── getDuplicateGuests ────────────────────────────────────────────────────

describe("getDuplicateGuests", () => {
  it("returns empty when no duplicates", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", phone: "054", firstName: "Avi", lastName: "A" }),
      mkGuest({ id: "g2", phone: "055", firstName: "Bob", lastName: "B" }),
    ]);
    expect(getDuplicateGuests()).toHaveLength(0);
  });

  it("detects duplicate phones", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", phone: "054", firstName: "Avi" }),
      mkGuest({ id: "g2", phone: "054", firstName: "Avi2" }),
    ]);
    const dupes = getDuplicateGuests();
    const byPhone = dupes.filter((d) => d.reason === "phone");
    expect(byPhone).toHaveLength(1);
  });

  it("detects duplicate names", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", phone: "054", firstName: "Avi", lastName: "Cohen" }),
      mkGuest({ id: "g2", phone: "055", firstName: "Avi", lastName: "Cohen" }),
    ]);
    const dupes = getDuplicateGuests();
    const byName = dupes.filter((d) => d.reason === "name");
    expect(byName).toHaveLength(1);
  });
});

// ── getPlusOneStats ───────────────────────────────────────────────────────

describe("getPlusOneStats", () => {
  it("returns zeros for empty guests", () => {
    _store.set("guests", []);
    const s = getPlusOneStats();
    expect(s.totalGuests).toBe(0);
    expect(s.totalHeads).toBe(0);
    expect(s.avgPartySize).toBe(0);
    expect(s.largestParty).toBe(0);
  });

  it("computes stats for confirmed guests only", () => {
    _store.set("guests", [
      mkGuest({ id: "g1", status: "confirmed", count: 3 }),
      mkGuest({ id: "g2", status: "confirmed", count: 1 }),
      mkGuest({ id: "g3", status: "pending", count: 5 }), // not counted
    ]);
    const s = getPlusOneStats();
    expect(s.totalGuests).toBe(2);
    expect(s.totalHeads).toBe(4);
    expect(s.largestParty).toBe(3);
    expect(s.avgPartySize).toBe(2);
  });
});
