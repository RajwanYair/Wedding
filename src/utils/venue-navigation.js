/**
 * src/utils/venue-navigation.js — Sprint 26 (Phase 4.4 Integrations)
 *
 * Build deep-link URLs for venue navigation via Waze and Google Maps.
 * Designed for use in guest RSVP confirmation pages and invitation cards.
 *
 * On mobile:
 *   waze://  → opens Waze app (falls back to waze.com in a browser)
 *   comgooglemaps:// → opens Google Maps app
 * On desktop: both URLs open in the browser (web versions).
 *
 * No DOM side-effects, no external deps, pure functions.
 *
 * Usage:
 *   import { buildWazeLink, buildGoogleMapsLink, buildNavLinks } from "../utils/venue-navigation.js";
 */

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   address?: string,
 *   lat?: number,
 *   lng?: number,
 * }} VenueLocation
 *
 * Provide either `address` or `lat`+`lng` (or both).
 * Coordinates take precedence for Waze deep links.
 */

/**
 * @typedef {{ waze: string, googleMaps: string }} NavLinks
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Return the best query string for a navigation service.
 * Prefers lat/lng when both are provided; falls back to address string.
 * @param {VenueLocation} venue
 * @returns {string}  URL-encoded query
 */
function _venueQuery(venue) {
  if (
    typeof venue.lat === "number" &&
    typeof venue.lng === "number"
  ) {
    return `${venue.lat},${venue.lng}`;
  }
  return venue.address ?? "";
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Build a Waze navigation deep-link.
 *
 * Mobile: opens Waze app directly.
 * Desktop / fallback: opens waze.com in the browser.
 *
 * @param {VenueLocation} venue
 * @returns {string}  Waze URL
 * @throws {Error} if neither address nor coordinates are provided
 */
export function buildWazeLink(venue) {
  const q = _venueQuery(venue);
  if (!q) throw new Error("buildWazeLink: venue must have address or lat+lng");

  const hasCoords = typeof venue.lat === "number" && typeof venue.lng === "number";
  if (hasCoords) {
    // Navigate to exact coordinates
    return `https://waze.com/ul?ll=${venue.lat},${venue.lng}&navigate=yes`;
  }
  // Navigate by address query
  return `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;
}

/**
 * Build a Google Maps navigation deep-link.
 *
 * Opens Google Maps (app on mobile if installed, browser otherwise).
 * Uses `maps.google.com` which handles both app-link forwarding and web.
 *
 * @param {VenueLocation} venue
 * @param {{ label?: string }} [opts]  Optional map pin label
 * @returns {string}  Google Maps URL
 * @throws {Error} if neither address nor coordinates are provided
 */
export function buildGoogleMapsLink(venue, opts = {}) {
  const q = _venueQuery(venue);
  if (!q) throw new Error("buildGoogleMapsLink: venue must have address or lat+lng");

  const params = new URLSearchParams({ q });
  if (opts.label) params.set("query_place_id", opts.label);

  return `https://maps.google.com/?${params.toString()}`;
}

/**
 * Build both Waze and Google Maps links in one call.
 *
 * @param {VenueLocation} venue
 * @param {{ label?: string }} [opts]
 * @returns {NavLinks}
 * @throws {Error} if neither address nor coordinates are provided
 */
export function buildNavLinks(venue, opts = {}) {
  return {
    waze:       buildWazeLink(venue),
    googleMaps: buildGoogleMapsLink(venue, opts),
  };
}
