import { describe, it, expect, beforeEach } from "vitest";
import {
  createEvent,
  activateEvent,
  archiveEvent,
  switchActiveEvent,
  getActiveEvent,
  mergeGuestLists,
  createFromTemplate,
  eventSummary,
  duplicateEvent,
  resetEventCounter,
} from "../../src/utils/multi-event.js";

describe("multi-event-workspace", () => {
  beforeEach(() => resetEventCounter());

  describe("createEvent", () => {
    it("creates an event with sequential ID", () => {
      const e = createEvent("Wedding A", { date: "2026-09-01", venue: "Grand Hall" });
      expect(e.id).toBe("evt_1");
      expect(e.name).toBe("Wedding A");
      expect(e.date).toBe("2026-09-01");
      expect(e.venue).toBe("Grand Hall");
      expect(e.status).toBe("draft");
      expect(e.guestCount).toBe(0);
    });

    it("increments IDs", () => {
      createEvent("A");
      expect(createEvent("B").id).toBe("evt_2");
    });
  });

  describe("activateEvent / archiveEvent", () => {
    it("activateEvent sets status to active", () => {
      const e = createEvent("Test");
      expect(activateEvent(e).status).toBe("active");
    });

    it("archiveEvent sets status to archived", () => {
      const e = createEvent("Test");
      expect(archiveEvent(e).status).toBe("archived");
    });

    it("handles null gracefully", () => {
      expect(activateEvent(null)).toBeNull();
      expect(archiveEvent(null)).toBeNull();
    });
  });

  describe("switchActiveEvent", () => {
    it("activates target and deactivates others", () => {
      const events = [
        { ...createEvent("A"), status: "active" },
        createEvent("B"),
        createEvent("C"),
      ];
      const switched = switchActiveEvent(events, events[1].id);
      expect(switched.find((e) => e.id === events[1].id).status).toBe("active");
      expect(switched.find((e) => e.id === events[0].id).status).toBe("draft");
    });

    it("returns empty for non-array", () => {
      expect(switchActiveEvent(null, "x")).toEqual([]);
    });
  });

  describe("getActiveEvent", () => {
    it("returns the active event", () => {
      const events = [createEvent("A"), activateEvent(createEvent("B"))];
      expect(getActiveEvent(events).name).toBe("B");
    });

    it("returns null when none active", () => {
      expect(getActiveEvent([createEvent("A")])).toBeNull();
    });

    it("returns null for non-array", () => {
      expect(getActiveEvent(null)).toBeNull();
    });
  });

  describe("mergeGuestLists", () => {
    it("merges and deduplicates guests by name", () => {
      const list1 = [{ name: "Alice" }, { name: "Bob" }];
      const list2 = [{ name: "alice" }, { name: "Charlie" }];
      const merged = mergeGuestLists([list1, list2]);
      expect(merged).toHaveLength(3);
      const alice = merged.find((g) => g.name.toLowerCase() === "alice");
      expect(alice.sourceEvents).toBe(2);
    });

    it("returns empty for non-array", () => {
      expect(mergeGuestLists(null)).toEqual([]);
    });
  });

  describe("createFromTemplate", () => {
    it("creates event from traditional template", () => {
      const e = createFromTemplate("traditional", "Big Wedding");
      expect(e.venue).toBe("Banquet Hall");
      expect(e.guestCount).toBe(300);
      expect(e.name).toBe("Big Wedding");
    });

    it("creates event from intimate template", () => {
      const e = createFromTemplate("intimate", "Small Wedding");
      expect(e.venue).toBe("Restaurant");
      expect(e.guestCount).toBe(50);
    });

    it("falls back to traditional for unknown template", () => {
      const e = createFromTemplate("unknown", "Fallback");
      expect(e.venue).toBe("Banquet Hall");
    });
  });

  describe("eventSummary", () => {
    it("counts events by status", () => {
      const events = [
        activateEvent(createEvent("A")),
        createEvent("B"),
        archiveEvent(createEvent("C")),
        createEvent("D"),
      ];
      const summary = eventSummary(events);
      expect(summary).toEqual({ total: 4, active: 1, draft: 2, archived: 1 });
    });

    it("returns zeros for non-array", () => {
      expect(eventSummary(null)).toEqual({ total: 0, active: 0, draft: 0, archived: 0 });
    });
  });

  describe("duplicateEvent", () => {
    it("duplicates with new ID and draft status", () => {
      const original = activateEvent(createEvent("Original"));
      const copy = duplicateEvent(original);
      expect(copy.id).not.toBe(original.id);
      expect(copy.name).toBe("Original (copy)");
      expect(copy.status).toBe("draft");
    });

    it("uses custom name when provided", () => {
      const copy = duplicateEvent(createEvent("A"), "Custom Name");
      expect(copy.name).toBe("Custom Name");
    });

    it("handles null event", () => {
      const e = duplicateEvent(null, "New");
      expect(e.name).toBe("New");
      expect(e.status).toBe("draft");
    });
  });
});
