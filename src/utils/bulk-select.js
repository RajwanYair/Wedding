/**
 * src/utils/bulk-select.js — Bulk selection and action system (Sprint 106)
 *
 * Manages a Set of selected item ids with helpers for select-all,
 * invert-selection, range-select, and action dispatch.
 *
 * DOM-free — attaches to any collection by id. The UI provides the rendered
 * list and checkbox wiring; this module owns selection state.
 *
 * Usage:
 *   import { createBulkSelection } from "../utils/bulk-select.js";
 *   const sel = createBulkSelection(["g1","g2","g3"]);
 *   sel.toggle("g1");
 *   const ids = sel.getSelected();   // ["g1"]
 *   sel.selectAll();
 *   sel.invert();
 */

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * @param {string[]} [initialItems]   Pre-load with item ids
 * @param {{ onChange?: (ids: string[]) => void }} [opts]
 */
export function createBulkSelection(initialItems = [], opts = {}) {
  /** @type {Set<string>} */
  const _selected = new Set();
  /** @type {string[]} */
  let _items = [...initialItems];
  const _onChange = opts.onChange;

  function _notify() {
    _onChange?.([..._selected]);
  }

  return {
    // ── Collection management ──────────────────────────────────────────

    /**
     * Replace the full item pool.
     * Removes selected ids that are no longer in the pool.
     * @param {string[]} items
     */
    setItems(items) {
      _items = [...items];
      let changed = false;
      for (const id of _selected) {
        if (!_items.includes(id)) { _selected.delete(id); changed = true; }
      }
      if (changed) _notify();
    },

    getItems() { return [..._items]; },

    // ── Selection ──────────────────────────────────────────────────────

    select(id) {
      if (!_items.includes(id)) return;
      _selected.add(id);
      _notify();
    },

    deselect(id) {
      _selected.delete(id);
      _notify();
    },

    toggle(id) {
      if (_selected.has(id)) this.deselect(id);
      else this.select(id);
    },

    selectAll() {
      _items.forEach((id) => _selected.add(id));
      _notify();
    },

    deselectAll() {
      _selected.clear();
      _notify();
    },

    invert() {
      _items.forEach((id) => {
        if (_selected.has(id)) _selected.delete(id);
        else _selected.add(id);
      });
      _notify();
    },

    /**
     * Select a contiguous range between two ids (inclusive).
     * Order is determined by the current `_items` array.
     * @param {string} from
     * @param {string} to
     */
    selectRange(from, to) {
      const a = _items.indexOf(from);
      const b = _items.indexOf(to);
      if (a === -1 || b === -1) return;
      const start = Math.min(a, b);
      const end   = Math.max(a, b);
      for (let i = start; i <= end; i++) _selected.add(_items[i]);
      _notify();
    },

    // ── Queries ────────────────────────────────────────────────────────

    isSelected(id) { return _selected.has(id); },
    getSelected()  { return [..._selected]; },
    count()        { return _selected.size; },
    isEmpty()      { return _selected.size === 0; },

    isAllSelected() {
      return _items.length > 0 && _items.every((id) => _selected.has(id));
    },

    isIndeterminate() {
      return _selected.size > 0 && !this.isAllSelected();
    },
  };
}
