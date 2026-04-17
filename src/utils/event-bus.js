/**
 * src/utils/event-bus.js — Sprint 145
 *
 * Lightweight in-process event bus (pub/sub) for cross-module communication.
 * An alternative to data-action delegation for programmatic events.
 */

/**
 * @typedef {(payload: unknown) => void} EventHandler
 */

/** @type {Map<string, Set<EventHandler>>} */
const _handlers = new Map();

/**
 * Subscribe to an event.
 * @param {string} event
 * @param {EventHandler} handler
 * @returns {() => void} Unsubscribe function
 */
export function on(event, handler) {
  if (!_handlers.has(event)) _handlers.set(event, new Set());
  _handlers.get(event).add(handler);
  return () => off(event, handler);
}

/**
 * Subscribe to an event exactly once.
 * @param {string} event
 * @param {EventHandler} handler
 * @returns {() => void} Unsubscribe function
 */
export function once(event, handler) {
  const wrapper = /** @type {EventHandler} */ ((payload) => {
    off(event, wrapper);
    handler(payload);
  });
  return on(event, wrapper);
}

/**
 * Unsubscribe a handler.
 * @param {string} event
 * @param {EventHandler} handler
 */
export function off(event, handler) {
  _handlers.get(event)?.delete(handler);
}

/**
 * Emit an event to all subscribers.
 * @param {string} event
 * @param {unknown} [payload]
 */
export function emit(event, payload) {
  for (const handler of (_handlers.get(event) ?? new Set())) {
    try { handler(payload); } catch {}
  }
}

/**
 * Number of handlers subscribed to an event.
 * @param {string} event
 * @returns {number}
 */
export function listenerCount(event) {
  return _handlers.get(event)?.size ?? 0;
}

/**
 * Remove all handlers for all events.
 */
export function clearAll() {
  _handlers.clear();
}

/**
 * List all event names with at least one handler.
 * @returns {string[]}
 */
export function activeEvents() {
  return [..._handlers.entries()]
    .filter(([, handlers]) => handlers.size > 0)
    .map(([event]) => event);
}
