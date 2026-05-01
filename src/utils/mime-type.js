/**
 * Tiny MIME-type lookup table for the file types the wedding app touches:
 * images, audio, common documents, and import/export formats.
 */

/** @type {Readonly<Record<string, string>>} */
const EXT_TO_MIME = Object.freeze({
  // Text
  txt: "text/plain",
  md: "text/markdown",
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  csv: "text/csv",
  ics: "text/calendar",
  // Application
  json: "application/json",
  xml: "application/xml",
  pdf: "application/pdf",
  zip: "application/zip",
  js: "application/javascript",
  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  avif: "image/avif",
  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  // Video
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
});

/**
 * Look up the MIME type for a filename or extension.
 *
 * @param {string} input
 * @returns {string | null}
 */
export function mimeFromExt(input) {
  if (typeof input !== "string" || input.length === 0) return null;
  const trimmed = input.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf(".");
  const ext = lastDot >= 0 ? trimmed.slice(lastDot + 1) : trimmed;
  return EXT_TO_MIME[ext] ?? null;
}

/**
 * Reverse lookup — first matching extension for the given MIME type.
 *
 * @param {string} mime
 * @returns {string | null}
 */
export function extFromMime(mime) {
  if (typeof mime !== "string") return null;
  const lower = mime.trim().toLowerCase();
  for (const [ext, m] of Object.entries(EXT_TO_MIME)) {
    if (m === lower) return ext;
  }
  return null;
}

/**
 * Coarse type bucket — `"image" | "audio" | "video" | "text" | "app" | null`.
 *
 * @param {string} mime
 * @returns {"image" | "audio" | "video" | "text" | "app" | null}
 */
export function mimeBucket(mime) {
  if (typeof mime !== "string") return null;
  const top = mime.split("/")[0]?.toLowerCase();
  if (top === "image" || top === "audio" || top === "video" || top === "text") {
    return top;
  }
  if (top === "application") return "app";
  return null;
}
