/**
 * tests/unit/multi-event.test.mjs — Sprint 114
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  createEvent, getEvent, listEvents, updateEvent,
  deleteEvent, setActiveEvent, getActiveEvent, clearActiveEvent,
} = await import("../../src/services/multi-event.js");

function seed() {
  initStore({
    events:        { value: [] },
    activeEventId: { value: null },
    guests:        { value: [] },
    weddingInfo:   { value: {} },
  });
}

beforeEach(seed);

describe("createEvent", () => {
  it("returns a string id", () => {
    const id = createEvent({ name: "Ceremony" });
    expect(typeof id).toBe("string");
    expect(id).toMatch(/^evt_/);
  });

  it("throws for empty name", () => {
    expect(() => createEvent({ name: "" })).toThrow("name");
  });

  it("stores the event", () => {
    const id = createEvent({ name: "Reception" });
    expect(getEvent(id)?.name).toBe("Reception");
  });
});

describe("listEvents", () => {
  it("sorts by date ascending", () => {
    createEvent({ name: "B", date: "2025-09-10" });
    createEvent({ name: "A", date: "2025-09-09" });
    const list = listEvents();
    expect(list[0].name).toBe("A");
  });

  it("places undated events last", () => {
    createEvent({ name: "Dated",   date: "2025-09-01" });
    createEvent({ name: "Undated" });
    const list = listEvents();
    expect(list[0].name).toBe("Dated");
    expect(list[1].name).toBe("Undated");
  });
});

describe("updateEvent", () => {
  it("updates fields", () => {
    const id = createEvent({ name: "Old" });
    updateEvent(id, { name: "New" });
    expect(getEvent(id)?.name).toBe("New");
  });

  it("returns false for unknown id", () => {
    expect(updateEvent("unknown", { name: "X" })).toBe(false);
  });
});

describe("deleteEvent", () => {
  it("removes the event", () => {
    const id = createEvent({ name: "Temp" });
    deleteEvent(id);
    expect(getEvent(id)).toBeNull();
  });

  it("clears activeEventId when active event is deleted", () => {
    const id = createEvent({ name: "Active" });
    setActiveEvent(id);
    deleteEvent(id);
    expect(getActiveEvent()).toBeNull();
  });
});

describe("setActiveEvent / getActiveEvent", () => {
  it("sets and gets active event", () => {
    const id = createEvent({ name: "Main" });
    setActiveEvent(id);
    expect(getActiveEvent()?.id).toBe(id);
  });

  it("returns false for unknown event id", () => {
    expect(setActiveEvent("unknown")).toBe(false);
  });

  it("clearActiveEvent sets it to null", () => {
    const id = createEvent({ name: "E" });
    setActiveEvent(id);
    clearActiveEvent();
    expect(getActiveEvent()).toBeNull();
  });
});
