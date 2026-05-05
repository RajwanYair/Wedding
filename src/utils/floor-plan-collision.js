/**
 * src/utils/floor-plan-collision.js — S651 Floor-plan collision detection
 *
 * Pure geometric helpers for furniture placement on a 2D floor plan:
 * rotation, snap-to-grid, axis-aligned bounding box (AABB) collision,
 * boundary enforcement, and placement validation.
 *
 * @module floor-plan-collision
 * @owner tables
 */

/**
 * @typedef {object} FurnitureItem
 * @property {string} id
 * @property {string} type - "table"|"chair"|"stage"|"dancefloor"|"bar"|"buffet"
 * @property {number} x - center x (mm)
 * @property {number} y - center y (mm)
 * @property {number} width - mm
 * @property {number} height - mm
 * @property {number} rotation - degrees (0-360)
 */

/**
 * @typedef {object} BoundingBox
 * @property {number} minX
 * @property {number} minY
 * @property {number} maxX
 * @property {number} maxY
 */

/**
 * Snap a coordinate to the nearest grid line.
 *
 * @param {number} value
 * @param {number} gridSize
 * @returns {number}
 */
export function snapToGrid(value, gridSize) {
  if (!gridSize || gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a furniture item position to grid.
 *
 * @param {FurnitureItem} item
 * @param {number} gridSize
 * @returns {FurnitureItem}
 */
export function snapItemToGrid(item, gridSize) {
  if (!item) return item;
  return {
    ...item,
    x: snapToGrid(item.x, gridSize),
    y: snapToGrid(item.y, gridSize),
  };
}

/**
 * Rotate a furniture item by degrees.
 *
 * @param {FurnitureItem} item
 * @param {number} degrees
 * @returns {FurnitureItem}
 */
export function rotateItem(item, degrees) {
  if (!item) return item;
  const newRotation = ((item.rotation ?? 0) + degrees) % 360;
  return { ...item, rotation: newRotation < 0 ? newRotation + 360 : newRotation };
}

/**
 * Get the axis-aligned bounding box of a (possibly rotated) furniture item.
 *
 * @param {FurnitureItem} item
 * @returns {BoundingBox}
 */
export function getBoundingBox(item) {
  if (!item) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const rad = ((item.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const hw = (item.width ?? 0) / 2;
  const hh = (item.height ?? 0) / 2;
  const rotW = hw * cos + hh * sin;
  const rotH = hw * sin + hh * cos;
  return {
    minX: item.x - rotW,
    minY: item.y - rotH,
    maxX: item.x + rotW,
    maxY: item.y + rotH,
  };
}

/**
 * Check if two bounding boxes overlap.
 *
 * @param {BoundingBox} a
 * @param {BoundingBox} b
 * @returns {boolean}
 */
export function boxesOverlap(a, b) {
  if (!a || !b) return false;
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/**
 * Check if two furniture items collide.
 *
 * @param {FurnitureItem} a
 * @param {FurnitureItem} b
 * @returns {boolean}
 */
export function itemsCollide(a, b) {
  if (!a || !b) return false;
  return boxesOverlap(getBoundingBox(a), getBoundingBox(b));
}

/**
 * Check if a furniture item is within room boundaries.
 *
 * @param {FurnitureItem} item
 * @param {{ width: number, height: number }} room
 * @returns {boolean}
 */
export function isWithinBounds(item, room) {
  if (!item || !room) return false;
  const bb = getBoundingBox(item);
  return bb.minX >= 0 && bb.minY >= 0 && bb.maxX <= room.width && bb.maxY <= room.height;
}

/**
 * Find all collisions for a given item against a list of other items.
 *
 * @param {FurnitureItem} item
 * @param {FurnitureItem[]} others
 * @returns {string[]} IDs of colliding items
 */
export function findCollisions(item, others) {
  if (!item || !Array.isArray(others)) return [];
  const collisions = [];
  for (const other of others) {
    if (other.id === item.id) continue;
    if (itemsCollide(item, other)) collisions.push(other.id);
  }
  return collisions;
}

/**
 * Validate placement of all items: no collisions, all within bounds.
 *
 * @param {FurnitureItem[]} items
 * @param {{ width: number, height: number }} room
 * @returns {{ valid: boolean, outOfBounds: string[], collisions: [string, string][] }}
 */
export function validatePlacement(items, room) {
  if (!Array.isArray(items)) return { valid: true, outOfBounds: [], collisions: [] };

  const outOfBounds = [];
  /** @type {[string, string][]} */
  const collisions = [];

  for (const item of items) {
    if (!isWithinBounds(item, room)) outOfBounds.push(item.id);
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (itemsCollide(items[i], items[j])) {
        collisions.push([items[i].id, items[j].id]);
      }
    }
  }

  return { valid: outOfBounds.length === 0 && collisions.length === 0, outOfBounds, collisions };
}

/**
 * Calculate minimum spacing between two items' bounding boxes.
 *
 * @param {FurnitureItem} a
 * @param {FurnitureItem} b
 * @returns {number} distance (negative = overlapping)
 */
export function itemSpacing(a, b) {
  if (!a || !b) return Infinity;
  const bbA = getBoundingBox(a);
  const bbB = getBoundingBox(b);
  const dx = Math.max(0, Math.max(bbA.minX - bbB.maxX, bbB.minX - bbA.maxX));
  const dy = Math.max(0, Math.max(bbA.minY - bbB.maxY, bbB.minY - bbA.maxY));
  if (dx === 0 && dy === 0) {
    const overlapX = Math.min(bbA.maxX, bbB.maxX) - Math.max(bbA.minX, bbB.minX);
    const overlapY = Math.min(bbA.maxY, bbB.maxY) - Math.max(bbA.minY, bbB.minY);
    return -Math.min(overlapX, overlapY);
  }
  return Math.sqrt(dx * dx + dy * dy);
}
