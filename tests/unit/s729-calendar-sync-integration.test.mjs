/**
 * S729 integration tests — Calendar sync wired into timeline.js
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";

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

import {
  milestoneToCalendarEvent,
  gcalEventToLocal,
  localEventToGcal,
  diffCalendarEvents,
  resolveCalendarConflictByLatest,
  resolveCalendarConflictPreferLocal,
  getCalendarSyncSummary,
} from "../../src/sections/timeline.js";

describe("S729 -- milestoneToCalendarEvent", () => {
  it("converts a milestone to a calendar event", () => {
    const milestone = { id: "m1", title: "Ceremony", date: "2026-06-01", time: "18:00" };
    const event = milestoneToCalendarEvent(milestone);
    expect(event.id).toBe("m1");
    expect(event.title).toBe("Ceremony");
    expect(event.source).toBe("local");
    expect(event).toHaveProperty("start");
    expect(event).toHaveProperty("end");
  });

  it("handles milestones without time", () => {
    const milestone = { id: "m2", title: "Photos", date: "2026-06-01" };
    const event = milestoneToCalendarEvent(milestone);
    expect(event.start).toContain("2026-06-01");
  });
});

describe("S729 -- gcalEventToLocal", () => {
  it("converts GCal format to local format", () => {
    const gcal = {
      id: "gcal_1",
      summary: "Reception",
      start: { dateTime: "2026-06-01T19:00:00Z" },
      end: { dateTime: "2026-06-01T23:00:00Z" },
      updated: "2026-05-01T12:00:00Z",
    };
    const local = gcalEventToLocal(gcal);
    expect(local.id).toBe("gcal_1");
    expect(local.title).toBe("Reception");
    expect(local.source).toBe("remote");
  });
});

describe("S729 -- localEventToGcal", () => {
  it("converts local format to GCal payload", () => {
    const local = {
      id: "e1",
      title: "Dinner",
      start: "2026-06-01T20:00:00Z",
      end: "2026-06-01T22:00:00Z",
      source: "local",
      updatedAt: "2026-05-01T00:00:00Z",
    };
    const gcal = localEventToGcal(local);
    expect(gcal.summary).toBe("Dinner");
    expect(gcal.start).toHaveProperty("dateTime");
    expect(gcal.end).toHaveProperty("dateTime");
  });
});

describe("S729 -- diffCalendarEvents", () => {
  const makeEvent = (id, title, updatedAt = "2026-01-01T00:00:00Z") => ({
    id, title, start: "2026-06-01T18:00:00Z", end: "2026-06-01T22:00:00Z",
    source: "local", updatedAt,
  });

  it("returns events to upload for local-only items", () => {
    const local = [makeEvent("a", "Ceremony")];
    const remote = [];
    const diff = diffCalendarEvents(local, remote);
    expect(diff.toUpload.some((e) => e.id === "a")).toBe(true);
  });

  it("returns events to download for remote-only items", () => {
    const local = [];
    const remote = [{ ...makeEvent("b", "Party"), source: "remote" }];
    const diff = diffCalendarEvents(local, remote);
    expect(diff.toDownload.some((e) => e.id === "b")).toBe(true);
  });

  it("identifies conflicts when same id exists in both with different data", () => {
    const localEv = makeEvent("c", "Ceremony", "2026-01-01T00:00:00Z");
    const remoteEv = { ...makeEvent("c", "Ceremony Modified", "2026-02-01T00:00:00Z"), source: "remote" };
    const diff = diffCalendarEvents([localEv], [remoteEv]);
    expect(diff.conflicts.length).toBeGreaterThan(0);
  });
});

describe("S729 -- resolveCalendarConflictByLatest", () => {
  it("picks the more recently updated event", () => {
    const local = { id: "x", title: "Local", source: "local", updatedAt: "2026-01-01T00:00:00Z" };
    const remote = { id: "x", title: "Remote", source: "remote", updatedAt: "2026-03-01T00:00:00Z" };
    const resolved = resolveCalendarConflictByLatest(local, remote);
    expect(resolved.title).toBe("Remote");
  });
});

describe("S729 -- resolveCalendarConflictPreferLocal", () => {
  it("always returns local event", () => {
    const local = { id: "y", title: "My Event", source: "local", updatedAt: "2026-01-01T00:00:00Z" };
    const resolved = resolveCalendarConflictPreferLocal(local);
    expect(resolved.title).toBe("My Event");
  });
});

describe("S729 -- getCalendarSyncSummary", () => {
  it("returns counts for a sync result", () => {
    const result = {
      toUpload: [{ id: "a" }],
      toDownload: [{ id: "b" }, { id: "c" }],
      conflicts: [],
    };
    const summary = getCalendarSyncSummary(result);
    expect(summary.uploads).toBe(1);
    expect(summary.downloads).toBe(2);
    expect(summary.conflicts).toBe(0);
    expect(summary.total).toBe(3);
  });
});
