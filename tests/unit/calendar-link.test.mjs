/**
 * tests/unit/calendar-link.test.mjs
 */

import { describe, it, expect } from "vitest";
import {
  buildGoogleCalendarLink,
  buildIcsContent,
  buildIcsDataUrl,
} from "../../src/utils/calendar-link.js";

const baseEvent = {
  title: "Wedding of Yair & Co",
  start: "2026-09-01T17:00:00Z",
  end: "2026-09-01T23:00:00Z",
  location: "Tel Aviv, Israel",
  description: "Ceremony, dinner, dancing.",
};

describe("buildGoogleCalendarLink", () => {
  it("includes action, text, and dates parameters", () => {
    const url = buildGoogleCalendarLink(baseEvent);
    expect(url).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render\?/);
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("text=Wedding+of+Yair+%26+Co");
    expect(url).toContain("dates=20260901T170000Z%2F20260901T230000Z");
    expect(url).toContain("location=Tel+Aviv%2C+Israel");
  });

  it("defaults to 3-hour duration when no end provided", () => {
    const url = buildGoogleCalendarLink({ title: "x", start: "2026-09-01T17:00:00Z" });
    expect(url).toContain("dates=20260901T170000Z%2F20260901T200000Z");
  });

  it("throws on missing title", () => {
    // @ts-expect-error testing invalid input
    expect(() => buildGoogleCalendarLink({ start: "2026-01-01" })).toThrow();
  });

  it("throws on invalid date", () => {
    expect(() => buildGoogleCalendarLink({ title: "x", start: "not-a-date" })).toThrow();
  });
});

describe("buildIcsContent", () => {
  it("emits CRLF-delimited VCALENDAR/VEVENT", () => {
    const ics = buildIcsContent(baseEvent);
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toMatch(/\r\nEND:VCALENDAR$/);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("DTSTART:20260901T170000Z");
    expect(ics).toContain("DTEND:20260901T230000Z");
    expect(ics).toContain("SUMMARY:Wedding of Yair & Co");
    expect(ics).toContain("LOCATION:Tel Aviv\\, Israel");
  });

  it("escapes special chars per RFC 5545", () => {
    const ics = buildIcsContent({
      title: "Line; one,\ntwo",
      start: "2026-01-01T00:00:00Z",
    });
    expect(ics).toContain("SUMMARY:Line\\; one\\,\\ntwo");
  });

  it("includes URL when provided", () => {
    const ics = buildIcsContent({ ...baseEvent, url: "https://example.com/rsvp" });
    expect(ics).toContain("URL:https://example.com/rsvp");
  });
});

describe("buildIcsDataUrl", () => {
  it("returns a text/calendar data URL", () => {
    const url = buildIcsDataUrl(baseEvent);
    expect(url).toMatch(/^data:text\/calendar;charset=utf-8,/);
    expect(url).toContain(encodeURIComponent("BEGIN:VCALENDAR"));
  });
});
