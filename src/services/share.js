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
