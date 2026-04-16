/**
 * src/utils/undo.js — Undo stack for reversible operations (S15.1)
 *
 * Stores snapshots of store keys before destructive operations.
 * Call pushUndo() before a delete/edit, then popUndo() on Ctrl+Z.
 */

/** @typedef {{ label: string, key: string, snapshot: unknown }} UndoEntry */

/** @type {UndoEntry[]} */
const _stack = [];
const _MAX_STACK = 30;

/**
 * Push a snapshot onto the undo stack.
 * @param {string} label  Human-readable description (e.g. "Delete guest Yair")
 * @param {string} key    Store key that was modified (e.g. "guests")
 * @param {unknown} snapshot  Deep copy of the store value BEFORE the change
 */
export function pushUndo(label, key, snapshot) {
  _stack.push({ label, key, snapshot });
  if (_stack.length > _MAX_STACK) _stack.shift();
}

/**
 * Pop the last undo entry and return it, or null if stack is empty.
 * @returns {UndoEntry | null}
 */
export function popUndo() {
  return _stack.pop() ?? null;
}

/**
 * Peek at the top of the undo stack without removing it.
 * @returns {UndoEntry | null}
 */
export function peekUndo() {
  return _stack.length > 0 ? _stack[_stack.length - 1] : null;
}

/**
 * Get the current undo stack size.
 * @returns {number}
 */
export function undoStackSize() {
  return _stack.length;
}

/**
 * Clear the entire undo stack.
 */
export function clearUndo() {
  _stack.length = 0;
}
