/**
 * src/utils/spotify-embed.js — Spotify playlist / track oEmbed helpers (Sprint 34)
 *
 * Converts Spotify share URLs into embed URLs safe for use in an <iframe>.
 * Returns plain strings — callers decide how to insert into the DOM
 * (never via innerHTML with unsanitised data).
 *
 * Supported URL formats:
 *   https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
 *   https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc
 *   https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
 *   https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy
 *   https://spotify.link/…   (NOT supported — returns null)
 *
 * Roadmap ref: Phase 4.4 — Entertainment integrations
 */

const SPOTIFY_ORIGIN = "https://open.spotify.com";
const SPOTIFY_EMBED_ORIGIN = "https://open.spotify.com/embed";

// Allowed Spotify resource types for embed
const ALLOWED_TYPES = new Set(["playlist", "track", "album", "episode", "show"]);

/**
 * Extract the Spotify resource type and ID from an open.spotify.com URL.
 *
 * @param {string} url
 * @returns {{ type: string, id: string } | null}
 */
export function extractSpotifyResource(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname !== "open.spotify.com") return null;

  // Pathname: /playlist/37i9dQZF1DXcBWIGoYBM5M  or  /embed/playlist/…
  const parts = parsed.pathname.replace(/^\/embed/, "").split("/").filter(Boolean);
  // parts[0] = type, parts[1] = id
  if (parts.length < 2) return null;

  const [type, id] = parts;
  if (!ALLOWED_TYPES.has(type)) return null;
  if (!/^[A-Za-z0-9]+$/.test(id)) return null;

  return { type, id };
}

/**
 * Convert an open.spotify.com share URL into an embed URL.
 * Returns `null` when the input is not a recognised Spotify resource URL.
 *
 * @param {string} url  e.g. "https://open.spotify.com/playlist/ID"
 * @param {object} [opts]
 * @param {boolean} [opts.utm=false]   Strip utm_* params from query string
 * @returns {string | null}
 */
export function buildSpotifyEmbedUrl(url, opts = {}) {
  const resource = extractSpotifyResource(url);
  if (!resource) return null;

  const embedUrl = new URL(`${SPOTIFY_EMBED_ORIGIN}/${resource.type}/${resource.id}`);

  // Preserve only safe query params (exclude utm_* by default)
  try {
    const original = new URL(url);
    for (const [k, v] of original.searchParams) {
      if (opts.utm !== true && k.startsWith("utm_")) continue;
      if (k === "si") continue; // strip session-tracking param
      embedUrl.searchParams.set(k, v);
    }
  } catch {
    // ignore malformed
  }

  return embedUrl.toString();
}

/**
 * Build the attributes for a Spotify <iframe> embed.
 * Returns an object with `src`, `width`, `height`, `frameBorder`, `allow`,
 * and `loading` that callers can apply via DOM property assignment or
 * `Element.setAttribute()`.  Never returns raw HTML.
 *
 * @param {string} url     Spotify share URL
 * @param {object} [opts]
 * @param {number} [opts.width=380]   iframe width in px
 * @param {number} [opts.height=152]  iframe height in px (152 = compact player)
 * @returns {{
 *   src:         string,
 *   width:       string,
 *   height:      string,
 *   frameBorder: string,
 *   allow:       string,
 *   loading:     string,
 *   title:       string,
 * } | null}
 */
export function buildSpotifyIframeAttrs(url, opts = {}) {
  const embedUrl = buildSpotifyEmbedUrl(url);
  if (!embedUrl) return null;

  const resource = extractSpotifyResource(url);
  return {
    src:         embedUrl,
    width:       String(opts.width  ?? 380),
    height:      String(opts.height ?? 152),
    frameBorder: "0",
    allow:       "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
    loading:     "lazy",
    title:       `Spotify ${resource?.type ?? "embed"}`,
  };
}

/**
 * Check whether a string looks like a Spotify share URL.
 * @param {string} url
 * @returns {boolean}
 */
export function isSpotifyUrl(url) {
  return extractSpotifyResource(url) !== null;
}

// Re-export the embed origin constant for consumers that build UI
export { SPOTIFY_ORIGIN };
