import { describe, it, expect } from "vitest";
import {
  escapeText,
  formatDateTime,
  foldLine,
  buildIcs,
} from "../../src/utils/ical-export.js";

describe("ical-export", () => {
  it("escapeText escapes commas, semicolons, backslashes, newlines", () => {
    expect(escapeText("a,b;c\\d\nrow")).toBe("a\\,b\\;c\\\\d\\nrow");
  });

  it("escapeText handles null/undefined", () => {
    expect(escapeText(null)).toBe("");
    expect(escapeText(undefined)).toBe("");
  });

  it("formatDateTime converts ISO string to UTC YYYYMMDDTHHMMSSZ", () => {
    expect(formatDateTime("2026-09-12T18:00:00Z")).toBe("20260912T180000Z");
  });

  it("formatDateTime accepts Date objects", () => {
    expect(formatDateTime(new Date("2026-01-01T00:00:00Z"))).toBe(
      "20260101T000000Z",
    );
  });

  it("formatDateTime throws on invalid date", () => {
    expect(() => formatDateTime("not a date")).toThrow(RangeError);
  });

  it("foldLine returns short lines unchanged", () => {
    expect(foldLine("short")).toBe("short");
  });

  it("foldLine folds long lines at 75 octets", () => {
    const long = "x".repeat(160);
    const folded = foldLine(long);
    const parts = folded.split("\r\n");
    expect(parts[0]).toHaveLength(75);
    expect(parts[1].startsWith(" ")).toBe(true);
  });

  it("buildIcs emits VCALENDAR + VEVENT envelope", () => {
    const ics = buildIcs([
      {
        uid: "abc-123",
        title: "Wedding",
        start: "2026-09-12T18:00:00Z",
        end: "2026-09-13T00:00:00Z",
      },
    ]);
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain("UID:abc-123\r\n");
    expect(ics).toContain("DTSTART:20260912T180000Z\r\n");
    expect(ics).toContain("DTEND:20260913T000000Z\r\n");
    expect(ics).toContain("SUMMARY:Wedding\r\n");
    expect(ics).toMatch(/END:VCALENDAR\r\n$/);
  });

  it("buildIcs defaults end to start + 4h when omitted", () => {
    const ics = buildIcs([
      { uid: "a", title: "T", start: "2026-09-12T18:00:00Z" },
    ]);
    expect(ics).toContain("DTSTART:20260912T180000Z");
    expect(ics).toContain("DTEND:20260912T220000Z");
  });

  it("buildIcs includes optional fields", () => {
    const ics = buildIcs([
      {
        uid: "u1",
        title: "T",
        start: "2026-09-12T18:00:00Z",
        location: "Tel Aviv, Israel",
        description: "Reception",
        url: "https://example.com",
        organizer: "host@example.com",
      },
    ]);
    expect(ics).toContain("LOCATION:Tel Aviv\\, Israel");
    expect(ics).toContain("DESCRIPTION:Reception");
    expect(ics).toContain("URL:https://example.com");
    expect(ics).toContain("ORGANIZER:mailto:host@example.com");
  });

  it("buildIcs throws on missing required fields", () => {
    expect(() => buildIcs([{ title: "x", start: "2026-01-01T00:00:00Z" }])).toThrow(
      TypeError,
    );
    expect(() => buildIcs([{ uid: "x", start: "2026-01-01T00:00:00Z" }])).toThrow(
      TypeError,
    );
    expect(() => buildIcs([{ uid: "x", title: "y" }])).toThrow(TypeError);
  });

  it("buildIcs supports multiple events", () => {
    const ics = buildIcs([
      { uid: "a", title: "Ceremony", start: "2026-09-12T17:00:00Z" },
      { uid: "b", title: "Reception", start: "2026-09-12T19:00:00Z" },
    ]);
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(2);
  });
});
