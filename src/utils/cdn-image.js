/**
 * src/utils/cdn-image.js — S127 Cloudflare CDN image URL helpers.
 *
 * Builds Cloudflare Images / Image Resizing URLs and srcset strings:
 *
 *   /cdn-cgi/image/<options>/<source>
 *
 * Pure functions — no fetch, no DOM. All inputs are validated and the
 * helpers fall back to the original URL when no CDN host is configured.
 */

const ALLOWED_FITS = new Set(["scale-down", "contain", "cover", "crop", "pad"]);
const ALLOWED_FORMATS = new Set(["auto", "webp", "avif", "json"]);
const ALLOWED_GRAVITY = new Set(["auto", "left", "right", "top", "bottom", "center"]);

/** @typedef {{ width?: number, height?: number, fit?: string, format?: string, quality?: number, gravity?: string }} ImageOpts */

/**
 * Build a CDN-rewritten URL. When `cdnHost` is empty, returns `source`.
 *
 * @param {string} source — absolute or root-relative URL of the source image
 * @param {ImageOpts} opts
 * @param {string} [cdnHost] — e.g. "https://cdn.example.com"
 * @returns {string}
 */
export function buildCdnImageUrl(source, opts = {}, cdnHost = "") {
  if (typeof source !== "string" || source.length === 0) return "";
  if (!cdnHost) return source;
  const parts = [];
  if (Number.isFinite(opts.width)  && opts.width  > 0) parts.push(`w=${Math.round(opts.width)}`);
  if (Number.isFinite(opts.height) && opts.height > 0) parts.push(`h=${Math.round(opts.height)}`);
  if (opts.fit && ALLOWED_FITS.has(opts.fit)) parts.push(`fit=${opts.fit}`);
  if (opts.format && ALLOWED_FORMATS.has(opts.format)) parts.push(`f=${opts.format}`);
  if (Number.isFinite(opts.quality) && opts.quality > 0 && opts.quality <= 100) {
    parts.push(`q=${Math.round(opts.quality)}`);
  }
  if (opts.gravity && ALLOWED_GRAVITY.has(opts.gravity)) parts.push(`gravity=${opts.gravity}`);
  const segment = parts.length > 0 ? parts.join(",") : "f=auto";
  const cleanHost = cdnHost.replace(/\/+$/, "");
  const cleanSource = source.startsWith("/") ? source.slice(1) : source;
  return `${cleanHost}/cdn-cgi/image/${segment}/${cleanSource}`;
}

/**
 * Build a `srcset` string for responsive images at the given widths.
 *
 * @param {string} source
 * @param {number[]} widths
 * @param {ImageOpts} [baseOpts]
 * @param {string} [cdnHost]
 */
export function buildSrcset(source, widths, baseOpts = {}, cdnHost = "") {
  if (!Array.isArray(widths) || widths.length === 0) return "";
  return widths
    .filter((w) => Number.isFinite(w) && w > 0)
    .map((w) => `${buildCdnImageUrl(source, { ...baseOpts, width: w }, cdnHost)} ${Math.round(w)}w`)
    .join(", ");
}

/**
 * Standard `sizes` attribute for responsive grid (mobile / tablet / desktop).
 * @param {{ mobile?: string, tablet?: string, desktop?: string }} [bp]
 */
export function defaultSizes(bp = {}) {
  const m = bp.mobile  ?? "(max-width: 480px) 100vw";
  const t = bp.tablet  ?? "(max-width: 1024px) 50vw";
  const d = bp.desktop ?? "33vw";
  return `${m}, ${t}, ${d}`;
}
