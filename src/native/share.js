/**
 * @file Share-sheet bridge — Capacitor `@capacitor/share` on native,
 * `navigator.share` (Web Share API) fallback on web. Returns `false`
 * if neither is available so callers can fall back to copy-to-clipboard.
 *
 * @owner native-bridge
 */

import { isNative } from "./platform.js";

/**
 * @typedef {object} ShareOptions
 * @property {string} [title]
 * @property {string} [text]
 * @property {string} [url]
 * @property {string} [dialogTitle]
 */

/**
 * @param {ShareOptions} opts
 * @returns {Promise<boolean>} true when a share sheet was shown
 */
export async function share(opts) {
  if (!opts || (!opts.text && !opts.url)) {
    throw new TypeError("share: requires at least { text } or { url }");
  }
  if (isNative()) {
    try {
      const { Share } = await import(/* @vite-ignore */ "@capacitor/share");
      const can = await Share.canShare();
      if (!can?.value) return false;
      await Share.share(opts);
      return true;
    } catch {
      return false;
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return true;
    } catch (err) {
      // User cancelled — treat as success-ish (no fallback)
      if (err?.name === "AbortError") return true;
      return false;
    }
  }
  return false;
}

/** @returns {Promise<boolean>} true if a share API is available */
export async function canShare() {
  if (isNative()) {
    try {
      const { Share } = await import(/* @vite-ignore */ "@capacitor/share");
      const can = await Share.canShare();
      return Boolean(can?.value);
    } catch {
      return false;
    }
  }
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
