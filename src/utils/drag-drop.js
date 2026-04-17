/**
 * src/utils/drag-drop.js — Drag-and-drop primitives for table seating (Sprint 105)
 *
 * DOM-free state machine for tracking drag-and-drop operations.
 * The UI layer (section code) handles actual DOM events and calls these
 * pure state functions.  This keeps the logic fully testable.
 *
 * Usage:
 *   import { createDragDropState } from "../utils/drag-drop.js";
 *   const dnd = createDragDropState();
 *   dnd.startDrag({ type: "guest", id: "g1", sourceTableId: "t1" });
 *   dnd.enterDropTarget("t2");
 *   const result = dnd.drop();
 *   // result → { type: "guest", id: "g1", fromTableId: "t1", toTableId: "t2" }
 */

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{ type: "guest" | "table" | "none", id: string | null, sourceTableId: string | null }} DragItem
 * @typedef {{ fromTableId: string | null, toTableId: string | null, type: string, id: string } | null} DropResult
 */

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a drag-and-drop state machine.
 * @returns {{
 *   startDrag(item: Omit<DragItem, "type"> & { type: string }): void,
 *   endDrag(): void,
 *   enterDropTarget(tableId: string): void,
 *   leaveDropTarget(): void,
 *   drop(): DropResult,
 *   isDragging(): boolean,
 *   getDragItem(): DragItem,
 *   getHoverTarget(): string | null,
 *   canDrop(tableId: string): boolean,
 * }}
 */
export function createDragDropState() {
  /** @type {DragItem} */
  let _item = { type: "none", id: null, sourceTableId: null };
  /** @type {string | null} */
  let _hoverTarget = null;
  let _dragging = false;

  return {
    /**
     * Start dragging an item.
     * @param {{ type: string, id: string, sourceTableId?: string | null }} item
     */
    startDrag(item) {
      _item = {
        type: /** @type {"guest"|"table"|"none"} */ (item.type),
        id: item.id,
        sourceTableId: item.sourceTableId ?? null,
      };
      _dragging = true;
      _hoverTarget = null;
    },

    /** Cancel or complete the drag. */
    endDrag() {
      _item = { type: "none", id: null, sourceTableId: null };
      _hoverTarget = null;
      _dragging = false;
    },

    /** Record entering a drop target. */
    enterDropTarget(tableId) {
      if (_dragging) _hoverTarget = tableId;
    },

    /** Record leaving a drop target. */
    leaveDropTarget() {
      _hoverTarget = null;
    },

    /**
     * Complete the drop onto the current hover target.
     * Returns null if not dragging or no valid target.
     * @returns {DropResult}
     */
    drop() {
      if (!_dragging || !_hoverTarget || !_item.id) return null;
      if (_hoverTarget === _item.sourceTableId) {
        this.endDrag();
        return null;
      }
      const result = {
        type: _item.type,
        id: _item.id,
        fromTableId: _item.sourceTableId,
        toTableId: _hoverTarget,
      };
      this.endDrag();
      return result;
    },

    isDragging() { return _dragging; },
    getDragItem() { return { ..._item }; },
    getHoverTarget() { return _hoverTarget; },

    /**
     * Can a guest be dropped onto this table?
     * (Prevents dropping onto own table.)
     * @param {string} tableId
     * @returns {boolean}
     */
    canDrop(tableId) {
      return _dragging && tableId !== _item.sourceTableId;
    },
  };
}
