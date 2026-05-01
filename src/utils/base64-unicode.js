/**
 * Unicode-safe base64 encoder/decoder using `btoa`/`atob` over UTF-8 bytes.
 * Also exports a base64url variant for URL-safe payloads.
 * @owner shared
 */

/**
 * Encode a string to base64 (UTF-8 safe).
 *
 * @param {string} input
 * @returns {string}
 */
export function encode(input) {
  const text = typeof input === "string" ? input : "";
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode a base64 string to UTF-8 text.
 *
 * @param {string} input
 * @returns {string}
 */
export function decode(input) {
  if (typeof input !== "string" || input.length === 0) return "";
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Encode to base64url (URL/filename-safe, no padding).
 *
 * @param {string} input
 * @returns {string}
 */
export function encodeUrl(input) {
  return encode(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode from base64url, restoring padding.
 *
 * @param {string} input
 * @returns {string}
 */
export function decodeUrl(input) {
  if (typeof input !== "string" || input.length === 0) return "";
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad === 1) throw new Error("base64url: invalid length");
  return decode(s);
}
