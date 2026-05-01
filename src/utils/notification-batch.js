/**
 * Notification batch queue — priority-ordered notification scheduling.
 *
 * Pure data structure operations. Higher priority numbers drain first;
 * within the same priority, FIFO is preserved (stable sort).
 *
 * @typedef {object} Notification
 * @property {string} id
 * @property {string} message
 * @property {number} [priority]   Default 0; higher drains first.
 * @property {string} [category]   Free-form grouping label.
 * @property {string} [createdAt]  ISO timestamp; defaults to now.
 *
 * @typedef {object} BatchOptions
 * @property {number} [size=10]            Max items per batch.
 * @property {string} [category]           Restrict to a single category.
 * @property {number} [minPriority]        Drop items below this priority.
 * @owner shared
 */

/**
 * Push a notification onto the queue, attaching defaults.
 *
 * @param {ReadonlyArray<Notification>} queue
 * @param {Notification} item
 * @returns {Notification[]}
 */
export function enqueue(queue, item) {
  if (!item || typeof item.id !== "string") {
    throw new TypeError("notification requires an id");
  }
  const filled = {
    priority: 0,
    createdAt: new Date().toISOString(),
    ...item,
  };
  return [...queue, filled];
}

/**
 * Drain the next batch from the queue. Returns the batch and the remaining queue.
 *
 * @param {ReadonlyArray<Notification>} queue
 * @param {BatchOptions} [opts]
 * @returns {{ batch: Notification[], remaining: Notification[] }}
 */
export function takeBatch(queue, opts = {}) {
  const size = Math.max(1, Number(opts.size) || 10);
  const category = opts.category;
  const minPriority = Number.isFinite(opts.minPriority)
    ? Number(opts.minPriority)
    : -Infinity;

  // Stable sort by descending priority, then by insertion order.
  const indexed = queue.map((n, i) => ({ n, i }));
  indexed.sort((a, b) => {
    const pa = Number(a.n.priority) || 0;
    const pb = Number(b.n.priority) || 0;
    if (pa !== pb) return pb - pa;
    return a.i - b.i;
  });

  /** @type {Notification[]} */
  const batch = [];
  /** @type {Set<number>} */
  const taken = new Set();
  for (const { n, i } of indexed) {
    if (batch.length >= size) break;
    const p = Number(n.priority) || 0;
    if (p < minPriority) continue;
    if (category && n.category !== category) continue;
    batch.push(n);
    taken.add(i);
  }

  /** @type {Notification[]} */
  const remaining = [];
  for (let i = 0; i < queue.length; i += 1) {
    if (!taken.has(i)) remaining.push(queue[i]);
  }
  return { batch, remaining };
}

/**
 * Group queued notifications by category.
 *
 * @param {ReadonlyArray<Notification>} queue
 * @returns {Map<string, Notification[]>}
 */
export function groupByCategory(queue) {
  /** @type {Map<string, Notification[]>} */
  const map = new Map();
  for (const n of queue) {
    const key = n.category ?? "_uncategorised";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(n);
  }
  return map;
}

/**
 * Drop notifications older than `maxAgeMs`.
 *
 * @param {ReadonlyArray<Notification>} queue
 * @param {number} maxAgeMs
 * @param {number} [now=Date.now()]
 * @returns {Notification[]}
 */
export function pruneOlderThan(queue, maxAgeMs, now = Date.now()) {
  if (!Number.isFinite(maxAgeMs) || maxAgeMs < 0) return [...queue];
  return queue.filter((n) => {
    if (!n.createdAt) return true;
    const t = Date.parse(n.createdAt);
    if (!Number.isFinite(t)) return true;
    return now - t <= maxAgeMs;
  });
}
