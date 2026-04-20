/**
 * tests/unit/calendar-link.test.mjs — Sprint 25 (Phase 4.4 Integrations)
 *
 * Tests for src/utils/calendar-link.js
 * buildGoogleCalendarLink · buildIcsContent · buildIcsDataUrl
 */

import { describe, it, expect } from "vitest";
import {
  buildGoogleCalendarLink,
  buildIcsContent,
  buildIcsDataUrl,
} from "../../src/utils/calendar-link.js";

const BASIC = {
  title: "Our Wedding",
  startDate: "2025-09-20",
};

const FULL = {
  title: "Our Wedding",
  startDate: "2025-09-20",
  endDate: "2025-09-20",
  startTime: "18:00",
  endTime: "23:00",
  location: "The Grand Hall, Tel Aviv",
  description: "Please RSVP by September 1st.",
};

// ── buildGoogleCalendarLink ────────────────────────────────────────────────
describe("buildGoogleCalendarLink()", () => {
  it("returns a Google Calendar URL", () => {
    const url = buildGoogleCalendarLink(BASIC);
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
  });

  it("includes the event title", () => {
    const url = buildGoogleCalendarLink(BASIC);
    expect(url.replace(/\+/g, " ")).toContain("Our Wedding");
  });

  it("includes the start date", () => {
    const url = buildGoogleCalendarLink(BASIC);
    expect(url).toContain("20250920");
  });

  it("includes location when provided", () => {
    const url = buildGoogleCalendarLink(FULL);
    expect(url.replace(/\+/g, " ")).toContain("The Grand Hall");
  });

  it("includes description when provided", () => {
    const url = buildGoogleCalendarLink(FULL);
    expect(url.replace(/\+/g, " ")).toContain("RSVP");
  });

  it("encodes timed events correctly", () => {
    const url = buildGoogleCalendarLink(FULL);
    expect(url).toContain("20250920T180000");
    expect(url).toContain("20250920T230000");
  });

  it("produces an all-day range for events without time", () => {
    const url = buildGoogleCalendarLink(BASIC);
    // Should not contain a time component
    expect(url).not.toMatch(/T\d{6}/);
  });
});

// ── buildIcsContent ────────────────────────────────────────────────────────
describe("buildIcsContent()", () => {
  it("starts with VCALENDAR header", () => {
    const ics = buildIcsContent(BASIC);
    expect(ics).toMatch(/^BEGIN:VCALENDAR/);
  });

  it("ends with VCALENDAR footer", () => {
    const ics = buildIcsContent(BASIC);
    expect(ics.trim()).toMatch(/END:VCALENDAR$/);
  });

  it("includes VEVENT block", () => {
    const ics = buildIcsContent(BASIC);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("includes the event title as SUMMARY", () => {
    const ics = buildIcsContent(BASIC);
    expect(ics).toContain("SUMMARY:Our Wedding");
  });

  it("includes DTSTART for all-day event with VALUE=DATE", () => {
    const ics = buildIcsContent(BASIC);
    expect(ics).toContain("DTSTART;VALUE=DATE:20250920");
  });

  it("includes DTSTART for timed event without VALUE=DATE", () => {
    const ics = buildIcsContent(FULL);
    expect(ics).toContain("DTSTART:20250920T180000");
    expect(ics).toContain("DTEND:20250920T230000");
  });

  it("includes LOCATION when provided", () => {
    const ics = buildIcsContent(FULL);
    expect(ics).toContain("LOCATION:The Grand Hall\\, Tel Aviv");
  });

  it("includes DESCRIPTION when provided", () => {
    const ics = buildIcsContent(FULL);
    expect(ics).toContain("DESCRIPTION:Please RSVP by September 1st.");
  });

  it("has consistent CRLF line endings", () => {
    const ics = buildIcsContent(BASIC);
    expect(ics).toMatch(/\r\n/);
  });
});

// ── buildIcsDataUrl ────────────────────────────────────────────────────────
describe("buildIcsDataUrl()", () => {
  it("returns a data: URI", () => {
    const url = buildIcsDataUrl(BASIC);
    expect(url).toMatch(/^data:text\/calendar/);
  });

  it("URI-encodes the ICS content", () => {
    const url = buildIcsDataUrl(BASIC);
    expect(url).toContain("VCALENDAR");
  });

  it("decoded content matches buildIcsContent output", () => {
    const raw = buildIcsContent(BASIC);
    const dataUrl = buildIcsDataUrl(BASIC);
    const encoded = dataUrl.replace("data:text/calendar;charset=utf-8,", "");
    expect(decodeURIComponent(encoded)).toBe(raw);
  });
});


