/**
 * src/utils/metrics.js — Front-end metrics collection (Sprint 210)
 *
 * Collects counters, timings, and error events in memory.
 * Export and reset for telemetry or debugging—no external deps.
 *
 * Zero dependencies.
 */

/** @typedef {{ name: string, value: number, timestamp: number, tags?: Record<string, string> }} MetricEntry */

/** @type {MetricEntry[]} */
let _store = [];

/**
 * Record a counter increment.
 * @param {string} name
 * @param {number} [delta]
 * @param {Record<string, string>} [tags]
 */
export function count(name, delta = 1, tags) {
  _store.push({ name, value: delta, timestamp: Date.now(), ...(tags ? { tags } : {}) });
}

/**
 * Record a timing (ms).
 * @param {string} name
 * @param {number} ms
 * @param {Record<string, string>} [tags]
 */
export function timing(name, ms, tags) {
  _store.push({ name, value: ms, timestamp: Date.now(), ...(tags ? { tags } : {}) });
}

/**
 * Start a timer; returns a `stop()` that records elapsed ms.
 * @param {string} name
 * @param {Record<string, string>} [tags]
 * @returns {{ stop: () => number }}
 */
export function startTimer(name, tags) {
  const start = Date.now();
  return {
    stop() {
      const ms = Date.now() - start;
      timing(name, ms, tags);
      return ms;
    },
  };
}

/**
 * Record an error event.
 * @param {string} name
 * @param {Error|string} err
 * @param {Record<string, string>} [tags]
 */
export function recordError(name, err, tags) {
  const msg = err instanceof Error ? err.message : String(err);
  _store.push({
    name,
    value: 1,
    timestamp: Date.now(),
    ...(tags ? { tags: { ...tags, error: msg } } : { tags: { error: msg } }),
  });
}

/**
 * Get all recorded metric entries.
 * @returns {MetricEntry[]}
 */
export function getAll() {
  return [..._store];
}

/**
 * Get entries matching a name (exact match).
 * @param {string} name
 * @returns {MetricEntry[]}
 */
export function getByName(name) {
  return _store.filter((e) => e.name === name);
}

/**
 * Sum values for a given metric name.
 * @param {string} name
 * @returns {number}
 */
export function sum(name) {
  return getByName(name).reduce((acc, e) => acc + e.value, 0);
}

/**
 * Average value for a given metric name.
 * @param {string} name
 * @returns {number}
 */
export function avg(name) {
  const entries = getByName(name);
  if (entries.length === 0) return 0;
  return entries.reduce((acc, e) => acc + e.value, 0) / entries.length;
}

/**
 * Reset all stored metrics.
 */
export function reset() {
  _store = [];
}

/**
 * Export a snapshot of all metrics as a plain object.
 * @returns {{ entries: MetricEntry[], timestamp: string }}
 */
export function exportSnapshot() {
  return {
    entries: [..._store],
    timestamp: new Date().toISOString(),
  };
}
