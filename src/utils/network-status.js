/**
 * src/utils/network-status.js — Online/offline status monitor (Sprint 204)
 *
 * Wraps the browser navigator.onLine and online/offline events with a
 * subscriber-based API. Can be used in Node/test environments via stubbing.
 *
 * Zero dependencies.
 */

/** @type {Set<(online: boolean) => void>} */
const _listeners = new Set();

let _online = typeof navigator !== "undefined" ? navigator.onLine : true;

/**
 * Get the current online status.
 * @returns {boolean}
 */
export function isOnline() {
  return _online;
}

/**
 * Subscribe to online/offline changes.
 * @param {(online: boolean) => void} fn  Called whenever status changes.
 * @returns {() => void}  Unsubscribe function.
 */
export function onStatusChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/**
 * Manually set the network status (used by event handlers & tests).
 * @param {boolean} online
 */
export function _setStatus(online) {
  if (online === _online) return;
  _online = online;
  _listeners.forEach((fn) => fn(_online));
}

/**
 * Attach browser event listeners (call once at app boot).
 * @returns {() => void}  Cleanup function.
 */
export function initNetworkStatus() {
  if (typeof window === "undefined") return () => {};
  const handleOnline = () => _setStatus(true);
  const handleOffline = () => _setStatus(false);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Returns a Promise that resolves when the app goes back online.
 * Resolves immediately if already online.
 * @param {{ timeout?: number }} [opts]  Optional timeout in ms (rejects on timeout).
 * @returns {Promise<void>}
 */
export function waitForOnline(opts = {}) {
  if (_online) return Promise.resolve();
  const { timeout } = opts;
  return new Promise((resolve, reject) => {
    let timer;
    const unsub = onStatusChange((online) => {
      if (online) {
        clearTimeout(timer);
        unsub();
        resolve();
      }
    });
    if (timeout) {
      timer = setTimeout(() => {
        unsub();
        reject(new Error("waitForOnline: timed out"));
      }, timeout);
    }
  });
}

/**
 * Run `fn` when online. If currently offline, waits until back online.
 * @param {() => void} fn
 * @returns {Promise<void>}
 */
export async function whenOnline(fn) {
  await waitForOnline();
  fn();
}
