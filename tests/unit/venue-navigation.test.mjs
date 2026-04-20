/**
 * tests/unit/venue-navigation.test.mjs — Sprint 26 (Phase 4.4 Integrations)
 *
 * Tests for src/utils/venue-navigation.js
 * buildWazeLink · buildGoogleMapsLink · buildNavLinks
 */

import { describe, it, expect } from "vitest";
import {
  buildWazeLink,
  buildGoogleMapsLink,
  buildNavLinks,
} from "../../src/utils/venue-navigation.js";

const ADDR_VENUE  = { address: "אולם הגן, רחוב הגנים 5, תל אביב" };
const COORD_VENUE = { lat: 32.0853, lng: 34.7818 };
const FULL_VENUE  = { address: "The Grand Hall", lat: 32.0853, lng: 34.7818 };

// ── buildWazeLink ─────────────────────────────────────────────────────────
describe("buildWazeLink()", () => {
  it("returns a waze.com URL for address", () => {
    const url = buildWazeLink(ADDR_VENUE);
    expect(url).toContain("waze.com");
  });

  it("URL-encodes the address", () => {
    const url = buildWazeLink(ADDR_VENUE);
    expect(url).not.toContain(" ");
  });

  it("uses ll param when coordinates provided", () => {
    const url = buildWazeLink(COORD_VENUE);
    expect(url).toContain("ll=32.0853,34.7818");
  });

  it("includes navigate=yes param", () => {
    const url = buildWazeLink(ADDR_VENUE);
    expect(url).toContain("navigate=yes");
  });

  it("throws when venue has no address or coords", () => {
    expect(() => buildWazeLink({})).toThrow();
  });

  it("prefers coordinates over address when both provided", () => {
    const url = buildWazeLink(FULL_VENUE);
    expect(url).toContain("ll=");
    expect(url).not.toContain(encodeURIComponent("The Grand Hall"));
  });
});

// ── buildGoogleMapsLink ───────────────────────────────────────────────────
describe("buildGoogleMapsLink()", () => {
  it("returns a maps.google.com URL for address", () => {
    const url = buildGoogleMapsLink(ADDR_VENUE);
    expect(url).toContain("maps.google.com");
  });

  it("URL-encodes the address in q param", () => {
    const url = buildGoogleMapsLink({ address: "Tel Aviv" });
    expect(url).toContain("q=Tel+Aviv");
  });

  it("uses coordinates as q param when provided", () => {
    const url = buildGoogleMapsLink(COORD_VENUE);
    expect(url).toContain("q=32.0853%2C34.7818");
  });

  it("throws when venue has no address or coords", () => {
    expect(() => buildGoogleMapsLink({})).toThrow();
  });

  it("includes query_place_id when label option provided", () => {
    const url = buildGoogleMapsLink(ADDR_VENUE, { label: "our-wedding-venue" });
    expect(url).toContain("query_place_id=our-wedding-venue");
  });
});

// ── buildNavLinks ─────────────────────────────────────────────────────────
describe("buildNavLinks()", () => {
  it("returns both waze and googleMaps links", () => {
    const links = buildNavLinks(ADDR_VENUE);
    expect(links).toHaveProperty("waze");
    expect(links).toHaveProperty("googleMaps");
  });

  it("waze link is a valid waze.com URL", () => {
    const { waze } = buildNavLinks(COORD_VENUE);
    expect(waze).toMatch(/^https:\/\/waze\.com/);
  });

  it("googleMaps link is a valid maps.google.com URL", () => {
    const { googleMaps } = buildNavLinks(COORD_VENUE);
    expect(googleMaps).toMatch(/^https:\/\/maps\.google\.com/);
  });

  it("throws when venue is empty", () => {
    expect(() => buildNavLinks({})).toThrow();
  });
});
