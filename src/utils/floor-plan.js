/**
 * src/utils/floor-plan.js — S597 Floor-plan furniture model
 *
 * Pure helpers for the upcoming Floor-Plan Builder UI. Models a flat
 * canvas of furniture items (tables, dance floor, head table, bar,
 * stage, …) with axis-aligned bounding boxes and lightweight collision
 * + room-bounds checks.
 *
 * @owner ux
 */

const FURNITURE_TYPES = /** @type {const} */ ([
  "round-table",
  "rect-table",
  "head-table",
  "dance-floor",
  "bar",
  "stage",
  "bar-tall",
  "buffet",
]);

/**
 * @typedef {(typeof FURNITURE_TYPES)[number]} FurnitureType
 */

/**
 * @typedef {object} Furniture
 * @property {string} id
 * @property {FurnitureType} type
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {number=} rotation  // degrees, 0..359 (informational only)
 * @property {string=} label
 */

/**
 * @typedef {object} Room
 * @property {number} width
 * @property {number} height
 */

/** @returns {readonly FurnitureType[]} */
export function listFurnitureTypes() {
  return FURNITURE_TYPES;
}

/**
 * Validate a furniture item shape + that it stays inside the room.
 * @param {Furniture} item
 * @param {Room} room
 * @returns {string[]}  list of human-readable problems (empty = ok)
 */
export function validateFurniture(item, room) {
  const out = [];
  if (!item) return ["item is required"];
  if (!item.id) out.push("id is required");
  if (!FURNITURE_TYPES.includes(item.type)) out.push(`unknown type: ${item.type}`);
  for (const k of /** @type {const} */ (["x", "y", "w", "h"])) {
    if (!Number.isFinite(item[k])) out.push(`${k} must be a finite number`);
  }
  if (item.w <= 0 || item.h <= 0) out.push("w and h must be positive");
  if (item.x < 0 || item.y < 0) out.push("x and y must be non-negative");
  if (room && Number.isFinite(room.width) && item.x + item.w > room.width) {
    out.push("item extends past room.width");
  }
  if (room && Number.isFinite(room.height) && item.y + item.h > room.height) {
    out.push("item extends past room.height");
  }
  return out;
}

/**
 * Axis-aligned bounding box overlap test.
 * @param {Furniture} a
 * @param {Furniture} b
 */
export function intersects(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

/**
 * Find every pair of intersecting furniture items in a layout.
 *
 * @param {readonly Furniture[]} items
 * @returns {Array<[string, string]>}  array of `[idA, idB]` pairs, deterministic order
 */
export function findCollisions(items) {
  if (!Array.isArray(items)) return [];
  /** @type {Array<[string,string]>} */
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (intersects(items[i], items[j])) {
        const [a, b] = [items[i].id, items[j].id].sort();
        pairs.push([a, b]);
      }
    }
  }
  return pairs.sort(([a1, b1], [a2, b2]) => (a1 === a2 ? b1.localeCompare(b2) : a1.localeCompare(a2)));
}

/**
 * Total square area used by all items (informational; useful for UI).
 * @param {readonly Furniture[]} items
 */
export function totalArea(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((s, i) => s + Math.max(0, i.w) * Math.max(0, i.h), 0);
}
