/**
 * tests/unit/venue-links.test.mjs — S116 venue/navigation/calendar URL builders.
 */
import { describe, it, expect } from "vitest";
import {
  buildOsmEmbedUrl,
  buildWazeUrl,
  buildGoogleMapsUrl,
  buildGoogleCalendarUrl,
  buildIcsContent,
} from "../../src/utils/venue-links.js";

describe("S116 — venue-links", () => {
  it("buildOsmEmbedUrl emits bbox and marker", () => {
    const u = buildOsmEmbedUrl(32.0853, 34.7818);
    expect(u).toContain("openstreetmap.org/export/embed.html");
    expect(u).toContain("bbox=");
    expect(u).toContain("marker=32.0853%2C34.7818");
  });

  it("buildOsmEmbedUrl clamps lat / wraps lon", () => {
    expect(buildOsmEmbedUrl(95, 200)).toContain("marker=90%2C-160");
  });

  it("buildOsmEmbedUrl rejects NaN", () => {
    expect(() => buildOsmEmbedUrl(NaN, 0)).toThrow();
  });

  it("buildWazeUrl includes ll & navigate=yes by default", () => {
    const u = buildWazeUrl(32.0853, 34.7818);
    expect(u).toContain("waze.com/ul?");
    expect(u).toContain("ll=32.0853%2C34.7818");
    expect(u).toContain("navigate=yes");
  });

  it("buildGoogleMapsUrl builds directions URL", () => {
    expect(buildGoogleMapsUrl(32.0853, 34.7818)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=32.0853,34.7818",
    );
  });

  it("buildGoogleCalendarUrl emits dates and title", () => {
    const u = buildGoogleCalendarUrl({
      title: "Yair & Bride",
      start: new Date(Date.UTC(2026, 5, 1, 18, 0, 0)),
      end: new Date(Date.UTC(2026, 5, 2, 1, 0, 0)),
      location: "Tel Aviv",
    });
    expect(u).toContain("calendar.google.com");
    expect(u).toContain("dates=20260601T180000Z%2F20260602T010000Z");
    expect(u).toContain("text=Yair+%26+Bride");
    expect(u).toContain("location=Tel+Aviv");
  });

  it("buildGoogleCalendarUrl rejects bad input", () => {
    expect(() =>
      buildGoogleCalendarUrl({
        title: "x",
        start: new Date(2026, 0, 2),
        end: new Date(2026, 0, 1),
      }),
    ).toThrow();
    expect(() =>
      buildGoogleCalendarUrl({ title: "", start: new Date(), end: new Date() }),
    ).toThrow();
  });

  it("buildIcsContent emits a valid VCALENDAR body", () => {
    const ics = buildIcsContent({
      title: "Wedding; Party",
      start: new Date(Date.UTC(2026, 5, 1, 18, 0, 0)),
      end: new Date(Date.UTC(2026, 5, 2, 1, 0, 0)),
      location: "Tel, Aviv",
      uid: "fixed-uid",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("DTSTART:20260601T180000Z");
    expect(ics).toContain("UID:fixed-uid");
    // Comma + semicolon must be escaped per RFC 5545
    expect(ics).toContain("SUMMARY:Wedding\\; Party");
    expect(ics).toContain("LOCATION:Tel\\, Aviv");
  });
});
