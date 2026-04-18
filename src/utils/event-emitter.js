/**
 * src/utils/event-emitter.js — Typed event emitter (Sprint 211)
 *
 * Minimal pub/sub event emitter with once(), off(), wildcard (*), and
 * error-isolated emit (one bad listener never blocks others).
 *
 * Zero dependencies.
 */

/**
 * @template {string} T
 */
export class EventEmitter {
  constructor() {
    /** @type {Map<string, Array<{ fn: Function, once: boolean }>>} */
    this._handlers = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {Function} fn
   * @returns {this}
   */
  on(event, fn) {
    this._add(event, fn, false);
    return this;
  }

  /**
   * Subscribe to an event once — auto-unsubscribed after first call.
   * @param {string} event
   * @param {Function} fn
   * @returns {this}
   */
  once(event, fn) {
    this._add(event, fn, true);
    return this;
  }

  /**
   * Unsubscribe a handler from an event.
   * @param {string} event
   * @param {Function} fn
   * @returns {this}
   */
  off(event, fn) {
    const list = this._handlers.get(event);
    if (!list) return this;
    const filtered = list.filter((h) => h.fn !== fn);
    if (filtered.length) this._handlers.set(event, filtered);
    else this._handlers.delete(event);
    return this;
  }

  /**
   * Emit an event, calling all registered listeners.
   * Exceptions in listeners are caught and re-emitted as "error" events.
   * @param {string} event
   * @param {...unknown} args
   * @returns {number} Number of listeners called
   */
  emit(event, ...args) {
    let called = 0;
    for (const name of [event, "*"]) {
      const list = this._handlers.get(name);
      if (!list) continue;
      const toCall = [...list];
      for (const h of toCall) {
        if (h.once) this.off(name, h.fn);
        try {
          h.fn(...args, ...(name === "*" ? [event] : []));
          called++;
        } catch (err) {
          if (event !== "error") this.emit("error", err, event);
        }
      }
    }
    return called;
  }

  /**
   * Remove all listeners for a specific event (or all events).
   * @param {string} [event]
   * @returns {this}
   */
  removeAll(event) {
    if (event) this._handlers.delete(event);
    else this._handlers.clear();
    return this;
  }

  /**
   * Return the count of listeners registered for an event.
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    return (this._handlers.get(event) ?? []).length;
  }

  /**
   * Return all event names with registered listeners.
   * @returns {string[]}
   */
  eventNames() {
    return [...this._handlers.keys()];
  }

  /**
   * @param {string} event
   * @param {Function} fn
   * @param {boolean} isOnce
   */
  _add(event, fn, isOnce) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event)?.push({ fn, once: isOnce });
  }
}

/**
 * Factory convenience.
 * @returns {EventEmitter<string>}
 */
export function createEmitter() {
  return new EventEmitter();
}
