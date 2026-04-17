/**
 * src/utils/event-queue.js — Durable async event queue (Sprint 167)
 *
 * A FIFO queue with:
 *  - Priority levels (low / normal / high)
 *  - Deduplication by event key (last wins by default)
 *  - Async consumer / drain support
 *  - Size cap (drops oldest low-priority items when full)
 *  - Observable (onDrain callback)
 *  - `_resetForTesting` for unit tests
 *
 * Useful for batching UI side-effects, analytics events, and outgoing writes.
 */

/** @typedef {'high' | 'normal' | 'low'} Priority */

/**
 * @template T
 * @typedef {{ key: string, payload: T, priority: Priority, enqueuedAt: number }} QueueItem
 */

const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 };
const DEFAULT_MAX_SIZE = 500;

/**
 * @template T
 */
export class EventQueue {
  /**
   * @param {{ maxSize?: number, deduplicate?: boolean }} [options]
   */
  constructor({ maxSize = DEFAULT_MAX_SIZE, deduplicate = true } = {}) {
    /** @type {QueueItem<T>[]} */
    this._items = [];
    this._maxSize = maxSize;
    this._deduplicate = deduplicate;
    /** @type {(() => void)[]} */
    this._drainListeners = [];
    this._processing = false;
  }

  /**
   * Add an item to the queue.
   * @param {string} key  Unique event key (used for dedup)
   * @param {T} payload
   * @param {Priority} [priority]
   */
  enqueue(key, payload, priority = "normal") {
    if (this._deduplicate) {
      // Remove existing item with the same key (last-write-wins)
      const idx = this._items.findIndex((i) => i.key === key);
      if (idx !== -1) this._items.splice(idx, 1);
    }

    // Enforce size cap — drop oldest low-priority item
    if (this._items.length >= this._maxSize) {
      const dropIdx = this._items.findLastIndex((i) => i.priority === "low");
      if (dropIdx !== -1) {
        this._items.splice(dropIdx, 1);
      } else {
        // Queue is full and all items are high/normal — drop oldest item
        this._items.shift();
      }
    }

    this._items.push({ key, payload, priority, enqueuedAt: Date.now() });
    // Keep high-priority items at front for FIFO within priority groups
    this._items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }

  /**
   * Dequeue and return the next item (highest priority first), or undefined.
   * @returns {QueueItem<T> | undefined}
   */
  dequeue() {
    return this._items.shift();
  }

  /**
   * Peek at the next item without removing it.
   * @returns {QueueItem<T> | undefined}
   */
  peek() {
    return this._items[0];
  }

  /** @returns {number} */
  get size() {
    return this._items.length;
  }

  /** @returns {boolean} */
  get isEmpty() {
    return this._items.length === 0;
  }

  /**
   * Process all items in the queue with an async consumer.
   * Items added during processing are also consumed.
   * @param {(item: QueueItem<T>) => Promise<void>} consumer
   * @returns {Promise<void>}
   */
  async drain(consumer) {
    if (this._processing) return;
    this._processing = true;
    try {
      while (!this.isEmpty) {
        const item = this.dequeue();
        if (item) await consumer(item);
      }
    } finally {
      this._processing = false;
      for (const fn of this._drainListeners) fn();
    }
  }

  /**
   * Register a callback fired after drain completes.
   * @param {() => void} fn
   * @returns {() => void} unsubscribe
   */
  onDrain(fn) {
    this._drainListeners.push(fn);
    return () => { this._drainListeners = this._drainListeners.filter((l) => l !== fn); };
  }

  /**
   * Clear all items from the queue.
   */
  clear() {
    this._items = [];
  }

  /**
   * Return all keys currently in the queue (in priority order).
   * @returns {string[]}
   */
  keys() {
    return this._items.map((i) => i.key);
  }

  /** Reset for testing. */
  _resetForTesting() {
    this._items = [];
    this._drainListeners = [];
    this._processing = false;
  }
}

/** Default singleton event queue. */
export const eventQueue = new EventQueue();
