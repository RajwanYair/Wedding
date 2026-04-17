/**
 * src/utils/list-diff.js — DOM list diffing utility (Sprint 154)
 *
 * Efficiently updates a rendered list of items without a full clear-and-repopulate.
 * Uses a keyed reconciliation strategy: items are matched by `id`, then nodes are
 * inserted, removed, or updated in-place.
 *
 * Usage:
 *   applyListDiff(containerEl, items, itemToHtml, "id");
 */

/**
 * Compute the minimal diff between two keyed arrays.
 *
 * @template {{ [key: string]: unknown }} T
 * @param {T[]} prev
 * @param {T[]} next
 * @param {keyof T} keyProp
 * @returns {{ added: T[], removed: T[], moved: T[], same: T[] }}
 */
export function diffLists(prev, next, keyProp = "id") {
  const prevMap = new Map(prev.map((item) => [item[keyProp], item]));
  const nextMap = new Map(next.map((item) => [item[keyProp], item]));

  const added = next.filter((item) => !prevMap.has(item[keyProp]));
  const removed = prev.filter((item) => !nextMap.has(item[keyProp]));

  const prevKeys = prev.map((item) => item[keyProp]);
  const nextKeys = next.map((item) => item[keyProp]);

  const same = [];
  const moved = [];

  for (const item of next) {
    const key = item[keyProp];
    if (!prevMap.has(key)) continue; // new item
    const prevIdx = prevKeys.indexOf(key);
    const nextIdx = nextKeys.indexOf(key);
    if (prevIdx === nextIdx) {
      same.push(item);
    } else {
      moved.push(item);
    }
  }

  return { added, removed, moved, same };
}

/**
 * Check if two items are deeply equal by serialization.
 * Suitable for small plain objects; not intended for large datasets.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function isItemEqual(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Find changed items between prev and next (same key, different value).
 *
 * @template {{ [key: string]: unknown }} T
 * @param {T[]} prev
 * @param {T[]} next
 * @param {keyof T} keyProp
 * @returns {T[]} next items whose content changed vs prev
 */
export function getChangedItems(prev, next, keyProp = "id") {
  const prevMap = new Map(prev.map((item) => [item[keyProp], item]));
  return next.filter((item) => {
    const old = prevMap.get(item[keyProp]);
    return old !== undefined && !isItemEqual(old, item);
  });
}

/**
 * Apply a keyed diff to a DOM container.
 *
 * @template {{ id: string, [key: string]: unknown }} T
 * @param {Element} container  - The parent DOM element
 * @param {T[]} items          - New array of items
 * @param {(item: T) => string} renderFn - Returns HTML string for one item
 * @param {string} [keyAttr]   - data-* attribute used to key DOM nodes (default: "data-id")
 */
export function applyListDiff(container, items, renderFn, keyAttr = "data-id") {
  // Build map of existing nodes by key
  const existingNodes = new Map();
  for (const child of Array.from(container.children)) {
    const key = child.getAttribute(keyAttr);
    if (key) existingNodes.set(key, child);
  }

  const itemKeys = new Set(items.map((item) => item.id));

  // Remove nodes for items that no longer exist
  for (const [key, node] of existingNodes) {
    if (!itemKeys.has(key)) {
      container.removeChild(node);
      existingNodes.delete(key);
    }
  }

  // Insert or update nodes in order
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = item.id;
    const existing = existingNodes.get(key);
    const html = renderFn(item);

    if (existing) {
      // Update in-place if content changed
      if (existing.outerHTML !== html) {
        const tmp = document.createElement("template");
        tmp.innerHTML = html;
        const newNode = tmp.content.firstElementChild;
        if (newNode) container.replaceChild(newNode, existing);
      }
      // Ensure correct position
      const currentAtIndex = container.children[i];
      if (currentAtIndex !== existing && currentAtIndex !== container.children[i]) {
        container.insertBefore(existing, container.children[i] ?? null);
      }
    } else {
      // Insert new node at correct position
      const tmp = document.createElement("template");
      tmp.innerHTML = html;
      const newNode = tmp.content.firstElementChild;
      if (newNode) {
        container.insertBefore(newNode, container.children[i] ?? null);
      }
    }
  }
}
