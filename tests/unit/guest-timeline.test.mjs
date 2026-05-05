import { describe, it, expect, beforeEach } from "vitest";
import {
  resetEntryCounter,
  addEntry,
  rsvpEntry,
  tableAssignEntry,
  checkinEntry,
  mealEntry,
  milestoneEntry,
  getGuestTimeline,
  latestEntry,
  filterByType,
  timelineSummary,
  hasEvent,
} from "../../src/utils/guest-timeline.js";

describe("guest-timeline", () => {
  beforeEach(() => resetEntryCounter());

  describe("addEntry", () => {
    it("creates an entry with incremented ID", () => {
      const e1 = addEntry("g1", "note", "Test note");
      const e2 = addEntry("g1", "note", "Another");
      expect(e1.id).toBe("tle_1");
      expect(e2.id).toBe("tle_2");
      expect(e1.guestId).toBe("g1");
      expect(e1.type).toBe("note");
      expect(e1.timestamp).toBeTruthy();
    });

    it("handles null inputs gracefully", () => {
      const e = addEntry(null, null, null);
      expect(e.guestId).toBe("");
      expect(e.type).toBe("note");
      expect(e.description).toBe("");
    });
  });

  describe("typed entries", () => {
    it("rsvpEntry creates RSVP entry", () => {
      const e = rsvpEntry("g1", "confirmed");
      expect(e.type).toBe("rsvp");
      expect(e.metadata.status).toBe("confirmed");
    });

    it("tableAssignEntry creates table entry", () => {
      const e = tableAssignEntry("g1", 5);
      expect(e.type).toBe("table");
      expect(e.metadata.tableId).toBe(5);
    });

    it("checkinEntry creates checkin entry", () => {
      const e = checkinEntry("g1", "qr");
      expect(e.type).toBe("checkin");
      expect(e.metadata.method).toBe("qr");
    });

    it("checkinEntry defaults to manual", () => {
      expect(checkinEntry("g1").metadata.method).toBe("manual");
    });

    it("mealEntry creates meal entry", () => {
      const e = mealEntry("g1", "fish");
      expect(e.type).toBe("meal");
      expect(e.metadata.meal).toBe("fish");
    });

    it("milestoneEntry creates milestone entry", () => {
      const e = milestoneEntry("g1", "Invited to rehearsal");
      expect(e.type).toBe("milestone");
      expect(e.description).toBe("Invited to rehearsal");
    });
  });

  describe("getGuestTimeline", () => {
    it("returns entries for a specific guest sorted by timestamp", () => {
      const entries = [
        { ...addEntry("g2", "note", "B"), timestamp: "2025-01-02" },
        { ...addEntry("g1", "note", "A"), timestamp: "2025-01-01" },
        { ...addEntry("g1", "rsvp", "C"), timestamp: "2025-01-03" },
      ];
      const tl = getGuestTimeline(entries, "g1");
      expect(tl).toHaveLength(2);
      expect(tl[0].description).toBe("A");
    });

    it("returns empty for non-array", () => {
      expect(getGuestTimeline(null, "g1")).toEqual([]);
    });
  });

  describe("latestEntry", () => {
    it("returns the most recent entry for a guest", () => {
      const entries = [
        { ...addEntry("g1", "rsvp", "First"), timestamp: "2025-01-01" },
        { ...addEntry("g1", "checkin", "Last"), timestamp: "2025-06-01" },
      ];
      expect(latestEntry(entries, "g1").description).toBe("Last");
    });

    it("returns null for no entries", () => {
      expect(latestEntry([], "g1")).toBeNull();
    });
  });

  describe("filterByType", () => {
    it("filters entries by type", () => {
      const entries = [
        rsvpEntry("g1", "confirmed"),
        checkinEntry("g1", "qr"),
        rsvpEntry("g2", "declined"),
      ];
      expect(filterByType(entries, "rsvp")).toHaveLength(2);
    });

    it("returns empty for non-array", () => {
      expect(filterByType(null, "rsvp")).toEqual([]);
    });
  });

  describe("timelineSummary", () => {
    it("summarizes guest activity", () => {
      const entries = [
        { ...rsvpEntry("g1", "confirmed"), timestamp: "2025-01-01" },
        { ...checkinEntry("g1", "qr"), timestamp: "2025-06-01" },
        { ...mealEntry("g1", "chicken"), timestamp: "2025-06-02" },
      ];
      const summary = timelineSummary(entries, "g1");
      expect(summary.total).toBe(3);
      expect(summary.types.rsvp).toBe(1);
      expect(summary.types.checkin).toBe(1);
      expect(summary.firstActivity).toBe("2025-01-01");
      expect(summary.lastActivity).toBe("2025-06-02");
    });

    it("returns zeros for unknown guest", () => {
      expect(timelineSummary([], "unknown")).toEqual({
        total: 0, types: {}, firstActivity: null, lastActivity: null,
      });
    });
  });

  describe("hasEvent", () => {
    it("returns true when guest has event type", () => {
      const entries = [rsvpEntry("g1", "confirmed")];
      expect(hasEvent(entries, "g1", "rsvp")).toBe(true);
    });

    it("returns false when guest lacks event type", () => {
      const entries = [rsvpEntry("g1", "confirmed")];
      expect(hasEvent(entries, "g1", "checkin")).toBe(false);
    });

    it("returns false for non-array", () => {
      expect(hasEvent(null, "g1", "rsvp")).toBe(false);
    });
  });
});
