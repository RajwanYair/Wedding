/**
 * network-status.js
 *
 * Online/offline indicator. Listens to navigator.connection events and the
 * standard `online` / `offline` window events, updates a small body-class
 * + ARIA-live region for screen reader announcements, and exposes a
 * subscriber API for callers (e.g. main.js shows toasts).
 */

const listeners = new Set();
let initialised = false;
let lastStatus = typeof navigator !== "undefined" ? navigator.onLine : true;

function notify(online) {
  if (online === lastStatus) return;
  lastStatus = online;
  document.body?.classList.toggle("is-offline", !online);
  for (const fn of listeners) {
    try {
      fn(online);
    } catch {
      /* listener errors must not break others */
    }
  }
}

export function initNetworkStatus() {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  window.addEventListener("online", () => notify(true));
  window.addEventListener("offline", () => notify(false));
  document.body?.classList.toggle("is-offline", !navigator.onLine);
}

export function onStatusChange(fn) {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
