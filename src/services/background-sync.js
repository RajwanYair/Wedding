/**
 * src/services/background-sync.js — Background Sync API wrapper (S89)
 *
 * Registers a Service Worker `sync` tag so the browser can flush the offline
 * write queue once connectivity returns, even if the page is closed.
 *
 * Falls back to a no-op + immediate online listener on browsers without
 * Background Sync (Safari, Firefox).
 */

/** Default tag used by the SW to trigger a queue flush. */
export const BACKGROUND_SYNC_TAG = "write-sync";

/**
 * Returns true when the SyncManager API is available in the current browser.
 * @returns {boolean}
 */
export function isBackgroundSyncSupported() {
  if (typeof navigator === "undefined") return false;
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    typeof window.SyncManager !== "undefined" &&
    typeof navigator.serviceWorker.ready?.then === "function"
  );
}

/**
 * Register a Background Sync tag with the active Service Worker registration.
 * No-op when the API is unavailable; resolves to `false` instead of throwing.
 * @param {string} [tag=BACKGROUND_SYNC_TAG]
 * @returns {Promise<boolean>} `true` when registration succeeded
 */
export async function registerBackgroundSync(tag = BACKGROUND_SYNC_TAG) {
  if (!isBackgroundSyncSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    /** @type {{ sync?: { register: (tag: string) => Promise<void> } }} */
    const swr = /** @type {any} */ (reg);
    if (!swr.sync || typeof swr.sync.register !== "function") return false;
    await swr.sync.register(tag);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convenience helper: register Background Sync if supported, otherwise wire a
 * one-shot `online` listener that calls the supplied callback once.
 * @param {() => void} onTrigger
 * @param {string} [tag=BACKGROUND_SYNC_TAG]
 * @returns {Promise<"registered" | "fallback" | "noop">}
 */
export async function ensureBackgroundFlush(onTrigger, tag = BACKGROUND_SYNC_TAG) {
  const ok = await registerBackgroundSync(tag);
  if (ok) return "registered";
  if (typeof window === "undefined") return "noop";
  const handler = () => {
    window.removeEventListener("online", handler);
    try {
      onTrigger();
    } catch {
      /* never bubble */
    }
  };
  window.addEventListener("online", handler, { once: true });
  return "fallback";
}
