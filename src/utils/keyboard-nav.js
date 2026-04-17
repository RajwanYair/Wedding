/**
 * src/utils/keyboard-nav.js — Keyboard navigation helpers (Sprint 202)
 *
 * Pure utility functions for keyboard-driven list and grid navigation.
 * DOM-agnostic index arithmetic; separate helpers for attaching listeners.
 *
 * Zero dependencies.
 */

/**
 * Move an index up by one step within a bounded list.
 * Wraps to the last item if already at index 0 when `wrap` is true.
 *
 * @param {number} current   Current focused index (0-based).
 * @param {number} total     Total number of items.
 * @param {{ wrap?: boolean }} [opts]
 * @returns {number}
 */
export function prevIndex(current, total, opts = {}) {
  if (total <= 0) return -1;
  const { wrap = true } = opts;
  if (current <= 0) return wrap ? total - 1 : 0;
  return current - 1;
}

/**
 * Move an index down by one step within a bounded list.
 * Wraps to 0 if already at the last item when `wrap` is true.
 *
 * @param {number} current
 * @param {number} total
 * @param {{ wrap?: boolean }} [opts]
 * @returns {number}
 */
export function nextIndex(current, total, opts = {}) {
  if (total <= 0) return -1;
  const { wrap = true } = opts;
  if (current >= total - 1) return wrap ? 0 : total - 1;
  return current + 1;
}

/**
 * Jump to the first index of a list.
 * @param {number} total
 * @returns {number}
 */
export function firstIndex(total) {
  return total > 0 ? 0 : -1;
}

/**
 * Jump to the last index of a list.
 * @param {number} total
 * @returns {number}
 */
export function lastIndex(total) {
  return total > 0 ? total - 1 : -1;
}

/**
 * Move by `delta` columns in a grid (2D navigation).
 *
 * @param {number} current   Current linear index.
 * @param {number} total     Total items.
 * @param {number} cols      Columns per row.
 * @param {"up"|"down"|"left"|"right"} direction
 * @param {{ wrap?: boolean }} [opts]
 * @returns {number}  New linear index, clamped to [0, total-1].
 */
export function gridNav(current, total, cols, direction, opts = {}) {
  if (total <= 0 || cols <= 0) return -1;
  const { wrap = false } = opts;
  let next = current;
  switch (direction) {
    case "left":
      next = wrap ? prevIndex(current, total) : Math.max(0, current - 1);
      break;
    case "right":
      next = wrap ? nextIndex(current, total) : Math.min(total - 1, current + 1);
      break;
    case "up":
      next = current - cols;
      if (next < 0) next = wrap ? Math.max(0, total - cols + (current % cols)) : current;
      break;
    case "down":
      next = current + cols;
      if (next >= total) next = wrap ? current % cols : current;
      break;
  }
  return Math.max(0, Math.min(total - 1, next));
}

/**
 * Returns a key → action mapping object for common list keyboard shortcuts.
 * @returns {Record<string, "up"|"down"|"first"|"last"|"select"|"escape">}
 */
export function defaultKeyMap() {
  return {
    ArrowUp: "up",
    ArrowDown: "down",
    Home: "first",
    End: "last",
    Enter: "select",
    " ": "select",
    Escape: "escape",
  };
}

/**
 * Given a keyboard event key and a key map, return the semantic action.
 *
 * @param {string} key        Event.key value
 * @param {Record<string, string>} [keyMap]  Custom key map; defaults to `defaultKeyMap()`
 * @returns {string|null}
 */
export function keyToAction(key, keyMap) {
  const map = keyMap ?? defaultKeyMap();
  return map[key] ?? null;
}

/**
 * Type-ahead: given a list of labels and a typed character, return the index
 * of the first item starting with that character after `current`.
 *
 * @param {string[]} labels
 * @param {string}   char
 * @param {number}   current  Current index
 * @returns {number}  Matching index, or -1 if none.
 */
export function typeAheadIndex(labels, char, current) {
  if (!char || !labels.length) return -1;
  const c = char.toLowerCase();
  const len = labels.length;
  for (let i = 1; i <= len; i++) {
    const idx = (current + i) % len;
    if (labels[idx]?.toLowerCase().startsWith(c)) return idx;
  }
  return -1;
}
