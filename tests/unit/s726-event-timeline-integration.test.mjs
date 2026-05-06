/**
 * S726 integration tests — Event timeline + multi-event wired into timeline.js
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn() }));
vi.mock("../../src/services/schedule.js", () => ({
  getRunOfShow: vi.fn(() => []),
  getNextItem: vi.fn(() => null),
  formatTimeUntil: vi.fn(() => ""),
}));

beforeEach(() => {
  initStore({});
});

import {
  sortTimelineItems,
  findTimelineConflicts,
  getTimelineTotalSpan,
  insertTimelineItemWithShift,
  createMultiEvent,
  activateMultiEvent,
  archiveMultiEvent,
  switchActiveMultiEvent,
  getActiveMultiEvent,
  mergeMultiEventGuests,
  getMultiEventSummary,
  duplicateMultiEvent,
  resetMultiEventCounter,
} from "../../src/sections/timeline.js";

beforeEach(() => {
  resetMultiEventCounter();
});

// ── Event timeline ────────────────────────────────────────────────────────

describe("S726 -- sortTimelineItems", () => {
  it("sorts items by startMinute ascending", () => {
    const items = [
      { id: "b", title: "B", startMinute: 60, duration: 30 },
      { id: "a", title: "A", startMinute: 0, duration: 20 },
    ];
    const sorted = sortTimelineItems(items);
    expect(sorted[0].id).toBe("a");
    expect(sorted[1].id).toBe("b");
  });
});

describe("S726 -- findTimelineConflicts", () => {
  it("returns empty array for non-overlapping items", () => {
    const items = [
      { id: "a", title: "A", startMinute: 0, duration: 30 },
      { id: "b", title: "B", startMinute: 40, duration: 20 },
    ];
    expect(findTimelineConflicts(items).length).toBe(0);
  });

  it("detects overlapping items", () => {
    const items = [
      { id: "a", title: "A", startMinute: 0, duration: 60 },
      { id: "b", title: "B", startMinute: 30, duration: 30 },
    ];
    const conflicts = findTimelineConflicts(items);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].kind).toBe("overlap");
  });

  it("detects duplicate ids", () => {
    const items = [
      { id: "dup", title: "A", startMinute: 0, duration: 10 },
      { id: "dup", title: "B", startMinute: 20, duration: 10 },
    ];
    const conflicts = findTimelineConflicts(items);
    expect(conflicts.some((c) => c.kind === "duplicate-id")).toBe(true);
  });
});

describe("S726 -- getTimelineTotalSpan", () => {
  it("returns 0 for empty array", () => {
    expect(getTimelineTotalSpan([])).toBe(0);
  });

  it("returns span from earliest start to latest end", () => {
    const items = [
      { id: "a", title: "A", startMinute: 10, duration: 20 },
      { id: "b", title: "B", startMinute: 50, duration: 30 },
    ];
    expect(getTimelineTotalSpan(items)).toBe(70); // 80 - 10
  });
});

describe("S726 -- insertTimelineItemWithShift", () => {
  it("inserts a new item and shifts later ones", () => {
    const existing = [{ id: "a", title: "A", startMinute: 30, duration: 20 }];
    const newItem = { id: "b", title: "B", startMinute: 25, duration: 20 };
    const result = insertTimelineItemWithShift(existing, newItem);
    const ids = result.map((i) => i.id);
    expect(ids).toContain("a");
    expect(ids).toContain("b");
    // b starts at 25, a should be shifted to 45
    const aItem = result.find((i) => i.id === "a");
    expect(aItem.startMinute).toBe(45);
  });
});

// ── Multi-event ────────────────────────────────────────────────────────────

describe("S726 -- createMultiEvent", () => {
  it("creates an event with name and id", () => {
    const ev = createMultiEvent("Reception");
    expect(ev.name).toBe("Reception");
    expect(ev).toHaveProperty("id");
    expect(ev.status).toBe("draft");
  });

  it("accepts optional date", () => {
    const ev = createMultiEvent("Ceremony", { date: "2026-06-01" });
    expect(ev.date).toBe("2026-06-01");
  });
});

describe("S726 -- activateMultiEvent / archiveMultiEvent", () => {
  it("activates a draft event", () => {
    const ev = createMultiEvent("Party");
    const active = activateMultiEvent(ev);
    expect(active.status).toBe("active");
  });

  it("archives an active event", () => {
    const ev = activateMultiEvent(createMultiEvent("Party"));
    const archived = archiveMultiEvent(ev);
    expect(archived.status).toBe("archived");
  });
});

describe("S726 -- switchActiveMultiEvent / getActiveMultiEvent", () => {
  it("switches active event", () => {
    const ev1 = activateMultiEvent(createMultiEvent("A"));
    const ev2 = createMultiEvent("B");
    const updated = switchActiveMultiEvent([ev1, ev2], ev2.id);
    const active = getActiveMultiEvent(updated);
    expect(active.id).toBe(ev2.id);
    expect(active.status).toBe("active");
  });

  it("getActiveMultiEvent returns null when none active", () => {
    const events = [createMultiEvent("A"), createMultiEvent("B")];
    expect(getActiveMultiEvent(events)).toBeNull();
  });
});

describe("S726 -- mergeMultiEventGuests", () => {
  it("merges two guest lists deduplicating by phone", () => {
    const list1 = [{ id: "g1", phone: "0541234567", name: "Alice" }];
    const list2 = [
      { id: "g1", phone: "0541234567", name: "Alice" },
      { id: "g2", phone: "0549999999", name: "Bob" },
    ];
    const merged = mergeMultiEventGuests([list1, list2]);
    expect(merged.length).toBe(2);
  });
});

describe("S726 -- getMultiEventSummary", () => {
  it("returns summary with total count", () => {
    const events = [createMultiEvent("A"), activateMultiEvent(createMultiEvent("B"))];
    const summary = getMultiEventSummary(events);
    expect(summary.total).toBe(2);
    expect(summary.active).toBe(1);
  });
});

describe("S726 -- duplicateMultiEvent", () => {
  it("duplicates event under new name", () => {
    const original = createMultiEvent("Henna Night");
    const copy = duplicateMultiEvent(original, "Henna Night Copy");
    expect(copy.name).toBe("Henna Night Copy");
    expect(copy.id).not.toBe(original.id);
  });
});
