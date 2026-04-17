/**
 * src/utils/virtual-list.js — Virtual list viewport helper (Sprint 14 / Phase 2-3)
 *
 * Provides a lightweight, DOM-free windowed list viewport calcultor.
 * Given an items array and a scroll position, returns only the visible
 * slice plus prefetch padding, plus positioning metadata for CSS offset.
 *
 * Designed to be used alongside paginateArray: pagination handles data
 * loading; virtual-list handles in-page render performance.
 *
 * Usage:
 *   import { createVirtualViewport } from "../utils/virtual-list.js";
 *   const state = createVirtualViewport(items, { itemHeight: 56, windowHeight: 600 });
 *   state.scrollTo(0);
 *   const { items: visible, offsetY, totalHeight } = state.getViewport();
 */

// ── Virtual viewport ──────────────────────────────────────────────────────

/**
 * @typedef {{ items: unknown[], offsetY: number, totalHeight: number, startIndex: number, endIndex: number }} Viewport
 */

/**
 * Create a virtual-list viewport state object.
 * Items can be arbitrary objects; item height is assumed uniform.
 *
 * @template T
 * @param {T[]} items               Full item array (reference, not copied)
 * @param {{ itemHeight: number, windowHeight: number, overscan?: number }} opts
 * @returns {{ scrollTo(y: number): void, setItems(arr: T[]): void, getViewport(): { items: T[], offsetY: number, totalHeight: number, startIndex: number, endIndex: number } }}
 */
export function createVirtualViewport(items, { itemHeight, windowHeight, overscan = 3 } = {}) {
  if (itemHeight == null || itemHeight < 1) throw new RangeError("createVirtualViewport: itemHeight must be >= 1");
  if (windowHeight == null || windowHeight < 1) throw new RangeError("createVirtualViewport: windowHeight must be >= 1");

  let _items = Array.isArray(items) ? items : [];
  let _scrollY = 0;

  return {
    /** Update scroll position. */
    scrollTo(y) {
      _scrollY = Math.max(0, y);
    },

    /** Replace the items array (e.g. after filtering). Resets scroll. */
    setItems(arr) {
      if (!Array.isArray(arr)) throw new TypeError("setItems: arr must be an array");
      _items = arr;
      _scrollY = 0;
    },

    /** Compute the current visible window. */
    getViewport() {
      const count = _items.length;
      const totalHeight = count * itemHeight;
      const startIndex = Math.max(0, Math.floor(_scrollY / itemHeight) - overscan);
      const visibleCount = Math.ceil(windowHeight / itemHeight);
      const endIndex = Math.min(count - 1, startIndex + visibleCount + overscan * 2);

      return {
        items: _items.slice(startIndex, endIndex + 1),
        offsetY: startIndex * itemHeight,
        totalHeight,
        startIndex,
        endIndex,
      };
    },
  };
}
