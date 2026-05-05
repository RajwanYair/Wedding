/**
 * src/utils/plugin-hooks.js — S659 Plugin event hooks system
 *
 * Lightweight hook registry for sandboxed plugin event dispatching.
 * Plugins register named hooks with callbacks; the host app fires them.
 *
 * @module plugin-hooks
 * @owner plugin
 */

/** @type {Map<string, Array<{ pluginId: string, cb: Function, priority: number }>>} */
const hooks = new Map();

/**
 * Valid hook names for the wedding app plugin system.
 * @type {ReadonlyArray<string>}
 */
export const HOOK_NAMES = Object.freeze([
  "guest:added",
  "guest:updated",
  "guest:removed",
  "rsvp:submitted",
  "rsvp:updated",
  "table:assigned",
  "table:cleared",
  "vendor:added",
  "vendor:paid",
  "expense:added",
  "checkin:scanned",
  "section:mounted",
  "section:unmounted",
  "theme:changed",
  "language:changed",
]);

/**
 * Register a hook listener.
 *
 * @param {string} hookName
 * @param {string} pluginId
 * @param {Function} cb
 * @param {number} [priority=10] Lower = earlier
 * @returns {boolean}
 */
export function registerHook(hookName, pluginId, cb, priority = 10) {
  if (!hookName || typeof cb !== "function" || !pluginId) return false;

  if (!hooks.has(hookName)) hooks.set(hookName, []);
  const list = hooks.get(hookName);

  // Prevent duplicate registration
  // @ts-ignore
  if (list.some((h) => h.pluginId === pluginId && h.cb === cb)) return false;

  // @ts-ignore
  list.push({ pluginId, cb, priority });
  // @ts-ignore
  list.sort((a, b) => a.priority - b.priority);
  return true;
}

/**
 * Unregister a specific hook listener.
 *
 * @param {string} hookName
 * @param {string} pluginId
 * @param {Function} cb
 * @returns {boolean}
 */
export function unregisterHook(hookName, pluginId, cb) {
  if (!hooks.has(hookName)) return false;
  const list = hooks.get(hookName);
  // @ts-ignore
  const idx = list.findIndex((h) => h.pluginId === pluginId && h.cb === cb);
  if (idx === -1) return false;
  // @ts-ignore
  list.splice(idx, 1);
  // @ts-ignore
  if (list.length === 0) hooks.delete(hookName);
  return true;
}

/**
 * Unregister all hooks for a plugin.
 *
 * @param {string} pluginId
 * @returns {number} Number of hooks removed
 */
export function unregisterAllForPlugin(pluginId) {
  let count = 0;
  for (const [hookName, list] of hooks) {
    const before = list.length;
    const filtered = list.filter((h) => h.pluginId !== pluginId);
    if (filtered.length < before) {
      count += before - filtered.length;
      if (filtered.length === 0) {
        hooks.delete(hookName);
      } else {
        hooks.set(hookName, filtered);
      }
    }
  }
  return count;
}

/**
 * Fire a hook — calls all registered listeners in priority order.
 *
 * @param {string} hookName
 * @param {unknown} [payload]
 * @returns {Array<{ pluginId: string, result: unknown, error?: string }>}
 */
export function fireHook(hookName, payload) {
  if (!hooks.has(hookName)) return [];

  /** @type {Array<{ pluginId: string, result: unknown, error?: string }>} */
  const results = [];
  // @ts-ignore
  for (const { pluginId, cb } of hooks.get(hookName)) {
    try {
      results.push({ pluginId, result: cb(payload) });
    } catch (err) {
      // @ts-ignore
      results.push({ pluginId, result: undefined, error: err.message });
    }
  }
  return results;
}

/**
 * Check if any listeners are registered for a hook.
 *
 * @param {string} hookName
 * @returns {boolean}
 */
export function hasListeners(hookName) {
  // @ts-ignore
  return hooks.has(hookName) && hooks.get(hookName).length > 0;
}

/**
 * Get listener count for a hook.
 *
 * @param {string} hookName
 * @returns {number}
 */
export function listenerCount(hookName) {
  // @ts-ignore
  return hooks.has(hookName) ? hooks.get(hookName).length : 0;
}

/**
 * List all hooks that have listeners.
 *
 * @returns {string[]}
 */
export function activeHooks() {
  return [...hooks.keys()];
}

/**
 * Clear all hooks — used in tests and plugin teardown.
 */
export function clearAllHooks() {
  hooks.clear();
}
