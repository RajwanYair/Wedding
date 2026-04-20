/**
 * tests/unit/spotify-embed.test.mjs — Sprint 34
 *
 * Tests for src/utils/spotify-embed.js —
 *   extractSpotifyResource, buildSpotifyEmbedUrl, buildSpotifyIframeAttrs, isSpotifyUrl
 */

import { describe, it, expect } from "vitest";
import {
  extractSpotifyResource,
  buildSpotifyEmbedUrl,
  buildSpotifyIframeAttrs,
  isSpotifyUrl,
} from "../../src/utils/spotify-embed.js";

const PLAYLIST_URL = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M";
const TRACK_URL    = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT";
const ALBUM_URL    = "https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy";
const EMBED_URL    = "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M";

// ── extractSpotifyResource ─────────────────────────────────────────────

describe("extractSpotifyResource()", () => {
  it("extracts playlist type and id", () => {
    const r = extractSpotifyResource(PLAYLIST_URL);
    expect(r).toEqual({ type: "playlist", id: "37i9dQZF1DXcBWIGoYBM5M" });
  });

  it("extracts track type and id", () => {
    const r = extractSpotifyResource(TRACK_URL);
    expect(r?.type).toBe("track");
    expect(r?.id).toBe("4cOdK2wGLETKBW3PvgPWqT");
  });

  it("returns null for non-Spotify URL", () => {
    expect(extractSpotifyResource("https://www.youtube.com/watch?v=abc")).toBeNull();
  });

  it("returns null for invalid string", () => {
    expect(extractSpotifyResource("not-a-url")).toBeNull();
  });

  it("strips /embed/ prefix from already-embed URLs", () => {
    const r = extractSpotifyResource(EMBED_URL);
    expect(r?.type).toBe("playlist");
    expect(r?.id).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  it("returns null for unknown resource type", () => {
    expect(extractSpotifyResource("https://open.spotify.com/user/abc123")).toBeNull();
  });
});

// ── buildSpotifyEmbedUrl ───────────────────────────────────────────────

describe("buildSpotifyEmbedUrl()", () => {
  it("converts a playlist URL to embed format", () => {
    const u = buildSpotifyEmbedUrl(PLAYLIST_URL);
    expect(u).toBe("https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M");
  });

  it("works for track URLs", () => {
    const u = buildSpotifyEmbedUrl(TRACK_URL);
    expect(u).toContain("/embed/track/");
  });

  it("returns null for non-Spotify URL", () => {
    expect(buildSpotifyEmbedUrl("https://example.com/foo")).toBeNull();
  });

  it("strips the ?si= tracking parameter", () => {
    const u = buildSpotifyEmbedUrl(`${PLAYLIST_URL}?si=abc123`);
    expect(u).not.toContain("si=");
  });

  it("strips utm_ params by default", () => {
    const u = buildSpotifyEmbedUrl(`${PLAYLIST_URL}?utm_source=copy-link`);
    expect(u).not.toContain("utm_source");
  });

  it("preserves utm_ params when opts.utm=true", () => {
    const u = buildSpotifyEmbedUrl(`${PLAYLIST_URL}?utm_source=copy-link`, { utm: true });
    expect(u).toContain("utm_source=copy-link");
  });
});

// ── buildSpotifyIframeAttrs ────────────────────────────────────────────

describe("buildSpotifyIframeAttrs()", () => {
  it("returns an object with src, width, height for valid URL", () => {
    const attrs = buildSpotifyIframeAttrs(PLAYLIST_URL);
    expect(attrs).not.toBeNull();
    expect(attrs?.src).toContain("/embed/playlist/");
    expect(attrs?.width).toBe("380");
    expect(attrs?.height).toBe("152");
  });

  it("respects custom width and height options", () => {
    const attrs = buildSpotifyIframeAttrs(ALBUM_URL, { width: 500, height: 300 });
    expect(attrs?.width).toBe("500");
    expect(attrs?.height).toBe("300");
  });

  it("includes loading=lazy attribute", () => {
    expect(buildSpotifyIframeAttrs(PLAYLIST_URL)?.loading).toBe("lazy");
  });

  it("returns null for invalid URL", () => {
    expect(buildSpotifyIframeAttrs("not-a-url")).toBeNull();
  });
});

// ── isSpotifyUrl ───────────────────────────────────────────────────────

describe("isSpotifyUrl()", () => {
  it("returns true for a playlist URL", () => {
    expect(isSpotifyUrl(PLAYLIST_URL)).toBe(true);
  });

  it("returns false for a non-Spotify URL", () => {
    expect(isSpotifyUrl("https://music.apple.com/playlist/123")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isSpotifyUrl("")).toBe(false);
  });
});
