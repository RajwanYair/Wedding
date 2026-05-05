// tests/unit/calendar-sync.test.mjs — S644 Calendar two-way sync
import { describe, it, expect } from "vitest";
import {
  milestoneToEvent,
  gcalToEvent,
  eventToGcal,
  diffEvents,
  resolveByLatest,
  resolvePreferLocal,
  syncSummary,
} from "../../src/utils/calendar-sync.js";

describe("calendar-sync", () => {
  describe("milestoneToEvent", () => {
    it("maps milestone with time", () => {
      const e = milestoneToEvent({ id: "m1", title: "Ceremony", date: "2026-09-15", time: "17:00:00", duration: 90, location: "Haifa" });
      expect(e.id).toBe("m1");
      expect(e.start).toBe("2026-09-15T17:00:00");
      expect(e.source).toBe("local");
      expect(e.location).toBe("Haifa");
    });
    it("defaults duration to 60 min", () => {
      const e = milestoneToEvent({ id: "m2", title: "Setup", date: "2026-09-15" });
      const endTime = new Date(e.end).getTime() - new Date(e.start).getTime();
      expect(endTime).toBe(60 * 60_000);
    });
  });

  describe("gcalToEvent", () => {
    it("maps Google Calendar event", () => {
      const e = gcalToEvent({
        id: "gc1",
        summary: "Wedding Dinner",
        start: { dateTime: "2026-09-15T19:00:00+03:00" },
        end: { dateTime: "2026-09-15T23:00:00+03:00" },
        location: "Tel Aviv",
        updated: "2026-01-01T00:00:00Z",
      });
      expect(e.title).toBe("Wedding Dinner");
      expect(e.source).toBe("remote");
    });
    it("handles all-day events", () => {
      const e = gcalToEvent({ id: "gc2", start: { date: "2026-09-15" }, end: { date: "2026-09-16" } });
      expect(e.start).toBe("2026-09-15");
    });
  });

  describe("eventToGcal", () => {
    it("maps to gcal payload", () => {
      const payload = eventToGcal({ id: "e1", title: "Toast", start: "2026-09-15T20:00:00", end: "2026-09-15T20:30:00", source: "local", updatedAt: "" });
      expect(payload.summary).toBe("Toast");
      expect(payload.start.dateTime).toBe("2026-09-15T20:00:00");
    });
  });

  describe("diffEvents", () => {
    it("finds uploads, downloads, and conflicts", () => {
      const local = [
        { id: "e1", title: "A", start: "T1", end: "T2", source: "local", updatedAt: "2026-01-01" },
        { id: "e2", title: "B-local", start: "T1", end: "T2", source: "local", updatedAt: "2026-01-01" },
      ];
      const remote = [
        { id: "e2", title: "B-remote", start: "T1", end: "T2", source: "remote", updatedAt: "2026-01-02" },
        { id: "e3", title: "C", start: "T1", end: "T2", source: "remote", updatedAt: "2026-01-01" },
      ];
      const diff = diffEvents(local, remote);
      expect(diff.toUpload).toHaveLength(1);
      expect(diff.toUpload[0].id).toBe("e1");
      expect(diff.toDownload).toHaveLength(1);
      expect(diff.toDownload[0].id).toBe("e3");
      expect(diff.conflicts).toHaveLength(1);
      expect(diff.conflicts[0].local.title).toBe("B-local");
    });
    it("handles empty arrays", () => {
      const diff = diffEvents([], []);
      expect(diff.toUpload).toHaveLength(0);
      expect(diff.conflicts).toHaveLength(0);
    });
  });

  describe("resolveByLatest", () => {
    it("picks remote when more recent", () => {
      const local = { id: "e1", title: "Old", start: "", end: "", source: "local", updatedAt: "2026-01-01T00:00:00Z" };
      const remote = { id: "e1", title: "New", start: "", end: "", source: "remote", updatedAt: "2026-06-01T00:00:00Z" };
      expect(resolveByLatest(local, remote).title).toBe("New");
    });
    it("picks local when more recent", () => {
      const local = { id: "e1", title: "Fresh", start: "", end: "", source: "local", updatedAt: "2026-06-01T00:00:00Z" };
      const remote = { id: "e1", title: "Stale", start: "", end: "", source: "remote", updatedAt: "2026-01-01T00:00:00Z" };
      expect(resolveByLatest(local, remote).title).toBe("Fresh");
    });
  });

  describe("resolvePreferLocal", () => {
    it("always returns local copy", () => {
      const local = { id: "e1", title: "Local", start: "", end: "", source: "local", updatedAt: "" };
      expect(resolvePreferLocal(local).title).toBe("Local");
    });
  });

  describe("syncSummary", () => {
    it("summarizes diff", () => {
      const s = syncSummary({ toUpload: [1], toDownload: [2, 3], conflicts: [] });
      expect(s.uploads).toBe(1);
      expect(s.downloads).toBe(2);
      expect(s.total).toBe(3);
    });
    it("handles null", () => {
      expect(syncSummary(null).total).toBe(0);
    });
  });
});
