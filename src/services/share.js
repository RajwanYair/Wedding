/**
 * src/services/share.js — Web Share API wrapper (S23f)
 *
 * Wraps the Web Share API for sharing RSVP links, check-in codes and app
 * invitations. Safe to import everywhere — `isShareSupported()` guards all
 * actual browser API calls.
 *
 * Usage:
 *   if (isShareSupported()) {
 *     await share({ title: "Wedding RSVP", url: rsvpUrl });
 *   }
 *
 * No window.* side-effects. ESM. Zero runtime deps.
 */

// ── Feature detection ─────────────────────────────────────────────────────

/**
 * True when the Web Share API (`navigator.share`) is available.
 * Available in Chrome/Safari on HTTPS. Desktop Chrome 89+, iOS Safari 12.4+.
 * @returns {boolean}
 */
export function isShareSupported() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * True when the browser can share files via `navigator.canShare`.
 * @param {File[]} files
 * @returns {boolean}
 */
export function canShareFiles(files) {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
    return false;
  }
  return navigator.canShare({ files });
}

// ── Core share API ────────────────────────────────────────────────────────

/**
 * @typedef {{ title?: string, text?: string, url?: string, files?: File[] }} ShareData
 */

/**
 * Invoke the native Web Share sheet.
 * Resolves `true` on success, `false` if user cancelled.
 * Rejects only on unsupported or unexpected errors.
 *
 * @param {ShareData} data
 * @returns {Promise<boolean>}
 * @throws {Error} if share API is not supported
 */
export async function share(data) {
  if (!isShareSupported()) {
    throw new Error("Web Share API not supported on this device");
  }
  try {
    await navigator.share(data);
    return true;
  } catch (err) {
    // AbortError = user dismissed the share sheet — not a real error
    if (err instanceof Error && err.name === "AbortError") {
      return false;
    }
    throw err;
  }
}

/**
 * Build and share a per-guest RSVP link.
 * Falls back gracefully when the API is unavailable.
 *
 * @param {{ firstName: string, lastName?: string, id?: string }} guest
 * @param {{ title?: string, text?: string }} [options]
 * @returns {Promise<boolean>} true if shared, false if cancelled or unsupported
 */
export async function shareGuestRsvpLink(guest, options = {}) {
  const name = `${guest.firstName}${guest.lastName ? ` ${guest.lastName}` : ""}`;
  const baseUrl = globalThis.location?.href?.split("?")[0] ?? "";
  const params = guest.id ? `?guestId=${encodeURIComponent(guest.id)}` : "";
  const url = `${baseUrl}${params}`;

  if (!isShareSupported()) {
    return false;
  }

  return share({
    title: options.title ?? `RSVP — ${name}`,
    text: options.text ?? `${name} — Wedding RSVP`,
    url,
  });
}

// ── Share with clipboard fallback (S86 — merged from share-service.js) ────
//
// `shareWithFallback` differs from `share()` above: it never throws, returns a
// structured ShareResult, and falls back to clipboard when Web Share is
// unavailable. Useful for invitations/links where best-effort is acceptable.

/**
 * @typedef {{ method: "native"|"clipboard"|"none", success: boolean, error?: string }} ShareResult
 */

/** Alias for {@link isShareSupported} kept for API compatibility. */
export const isNativeShareSupported = isShareSupported;

/**
 * Attempt to share data using Web Share API with clipboard fallback.
 * @param {ShareData} data
 * @param {{
 *   nativeShare?: ((data: ShareData) => Promise<void>) | null,
 *   clipboardWrite?: ((text: string) => Promise<void>) | null,
 * }} [overrides]  Injectable overrides for testability
 * @returns {Promise<ShareResult>}
 */
export async function shareWithFallback(data, overrides = {}) {
  const nativeShare =
    overrides.nativeShare !== undefined
      ? overrides.nativeShare
      : (typeof navigator !== "undefined" && navigator.share?.bind(navigator)) || null;
  const clipWrite =
    overrides.clipboardWrite !== undefined
      ? overrides.clipboardWrite
      : (typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText?.bind(navigator.clipboard)) ||
        null;

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
