/**
 * src/services/share-service.js — Sprint 132
 *
 * Web Share API wrapper with clipboard fallback.
 * Pure logic extracted from DOM for testability.
 */

/**
 * @typedef {{ title?: string, text?: string, url?: string }} ShareData
 * @typedef {{ method: "native"|"clipboard"|"none", success: boolean, error?: string }} ShareResult
 */

/**
 * Check if native Web Share API is available.
 * @returns {boolean}
 */
export function isNativeShareSupported() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Attempt to share data using Web Share API with clipboard fallback.
 * @param {ShareData} data
 * @param {{
 *   nativeShare?: (data: ShareData) => Promise<void>,
 *   clipboardWrite?: (text: string) => Promise<void>,
 * }} [overrides]  Injectable overrides for testability
 * @returns {Promise<ShareResult>}
 */
export async function share(data, overrides = {}) {
  const nativeShare =
    overrides.nativeShare ?? (typeof navigator !== "undefined" && navigator.share?.bind(navigator));
  const clipWrite =
    overrides.clipboardWrite ??
    (typeof navigator !== "undefined" && navigator.clipboard?.writeText?.bind(navigator.clipboard));

  // Try native share
  if (nativeShare) {
    try {
      await nativeShare(data);
      return { method: "native", success: true };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { method: "native", success: false, error: "AbortError" };
      }
      // fall through to clipboard
    }
  }

  // Clipboard fallback
  const text = [data.title, data.text, data.url].filter(Boolean).join("\n");
  if (clipWrite) {
    try {
      await clipWrite(text);
      return { method: "clipboard", success: true };
    } catch (err) {
      return { method: "clipboard", success: false, error: String(err) };
    }
  }

  return { method: "none", success: false, error: "No share API available" };
}

/**
 * Build a share URL for a wedding RSVP page.
 * @param {string} baseUrl
 * @param {{ eventId?: string }} [opts]
 * @returns {string}
 */
export function buildShareUrl(baseUrl, { eventId } = {}) {
  const url = new URL(baseUrl);
  if (eventId) url.searchParams.set("event", eventId);
  return url.toString();
}
