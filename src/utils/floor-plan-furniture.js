/**
 * src/utils/floor-plan-furniture.js — S657 Furniture library for floor-plan builder
 *
 * Pure helpers for a furniture catalogue — standard dimensions for
 * tables, chairs, dance floor, stage, DJ booth, bar, buffet.
 * All dimensions in millimeters, center-based coordinates.
 *
 * @module floor-plan-furniture
 * @owner checkin
 */

/**
 * @typedef {object} FurnitureTemplate
 * @property {string} type
 * @property {string} label
 * @property {number} width
 * @property {number} height
 * @property {string} category - "seating"|"entertainment"|"catering"|"ceremony"|"other"
 * @property {number} [capacity]
 * @property {boolean} [rotatable]
 */

/** @type {FurnitureTemplate[]} */
const CATALOGUE = [
  { type: "round_table_8", label: "Round Table (8)", width: 1800, height: 1800, category: "seating", capacity: 8, rotatable: false },
  { type: "round_table_10", label: "Round Table (10)", width: 2100, height: 2100, category: "seating", capacity: 10, rotatable: false },
  { type: "round_table_12", label: "Round Table (12)", width: 2400, height: 2400, category: "seating", capacity: 12, rotatable: false },
  { type: "rect_table_6", label: "Rectangular Table (6)", width: 2400, height: 900, category: "seating", capacity: 6, rotatable: true },
  { type: "rect_table_8", label: "Rectangular Table (8)", width: 3000, height: 900, category: "seating", capacity: 8, rotatable: true },
  { type: "head_table", label: "Head Table", width: 4000, height: 900, category: "seating", capacity: 10, rotatable: true },
  { type: "sweetheart_table", label: "Sweetheart Table", width: 1200, height: 600, category: "seating", capacity: 2, rotatable: true },
  { type: "cocktail_table", label: "Cocktail Table", width: 600, height: 600, category: "seating", capacity: 4, rotatable: false },
  { type: "dance_floor", label: "Dance Floor", width: 6000, height: 6000, category: "entertainment", rotatable: false },
  { type: "stage", label: "Stage", width: 4000, height: 3000, category: "entertainment", rotatable: true },
  { type: "dj_booth", label: "DJ Booth", width: 2000, height: 1000, category: "entertainment", rotatable: true },
  { type: "bar", label: "Bar", width: 3000, height: 800, category: "catering", rotatable: true },
  { type: "buffet", label: "Buffet Station", width: 3600, height: 900, category: "catering", rotatable: true },
  { type: "dessert_table", label: "Dessert Table", width: 2400, height: 900, category: "catering", rotatable: true },
  { type: "cake_table", label: "Cake Table", width: 1200, height: 1200, category: "catering", rotatable: false },
  { type: "chuppah", label: "Chuppah", width: 3000, height: 3000, category: "ceremony", rotatable: false },
  { type: "altar", label: "Altar/Bimah", width: 2400, height: 1800, category: "ceremony", rotatable: true },
  { type: "photo_booth", label: "Photo Booth", width: 2400, height: 1800, category: "entertainment", rotatable: true },
  { type: "gift_table", label: "Gift Table", width: 1800, height: 600, category: "other", rotatable: true },
  { type: "sign_in_table", label: "Sign-In Table", width: 1800, height: 600, category: "other", rotatable: true },
];

/**
 * Get the full furniture catalogue.
 *
 * @returns {FurnitureTemplate[]}
 */
export function getCatalogue() {
  return CATALOGUE.map((t) => ({ ...t }));
}

/**
 * Get a furniture template by type.
 *
 * @param {string} type
 * @returns {FurnitureTemplate|null}
 */
export function getTemplate(type) {
  const found = CATALOGUE.find((t) => t.type === type);
  return found ? { ...found } : null;
}

/**
 * Get templates by category.
 *
 * @param {string} category
 * @returns {FurnitureTemplate[]}
 */
export function getByCategory(category) {
  return CATALOGUE.filter((t) => t.category === category).map((t) => ({ ...t }));
}

/**
 * Get all available categories.
 *
 * @returns {string[]}
 */
export function getCategories() {
  return [...new Set(CATALOGUE.map((t) => t.category))];
}

/**
 * Create a placed furniture item from a template.
 *
 * @param {string} type
 * @param {number} x - Center x in mm
 * @param {number} y - Center y in mm
 * @param {number} [rotation=0] - Degrees
 * @returns {{ id: string, type: string, label: string, x: number, y: number, width: number, height: number, rotation: number, category: string, capacity?: number }}
 */
let _itemCounter = 0;

/** Reset counter (for tests). */
export function resetItemCounter() {
  _itemCounter = 0;
}

export function placeItem(type, x, y, rotation = 0) {
  const template = getTemplate(type);
  if (!template) return null;
  _itemCounter++;
  return {
    id: `furn_${_itemCounter}`,
    type: template.type,
    label: template.label,
    x,
    y,
    width: template.width,
    height: template.height,
    rotation: rotation % 360,
    category: template.category,
    capacity: template.capacity,
  };
}

/**
 * Calculate total seating capacity for placed items.
 *
 * @param {Array<{capacity?: number}>} items
 * @returns {number}
 */
export function totalCapacity(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + (item.capacity ?? 0), 0);
}

/**
 * Calculate total area used by items (in square meters).
 *
 * @param {Array<{width: number, height: number}>} items
 * @returns {number}
 */
export function totalAreaSqm(items) {
  if (!Array.isArray(items)) return 0;
  const sqmm = items.reduce((sum, item) => sum + (item.width ?? 0) * (item.height ?? 0), 0);
  return Math.round((sqmm / 1000000) * 100) / 100;
}

/**
 * Suggest items for a given guest count.
 *
 * @param {number} guestCount
 * @param {"round"|"rectangular"|"mixed"} [style="round"]
 * @returns {{ tables: FurnitureTemplate[], extras: FurnitureTemplate[] }}
 */
export function suggestLayout(guestCount, style = "round") {
  if (typeof guestCount !== "number" || guestCount <= 0) {
    return { tables: [], extras: [] };
  }

  const tables = [];
  let remaining = guestCount;

  // Head table for the couple
  const headTable = getTemplate("head_table");
  tables.push(headTable);
  remaining -= headTable.capacity;

  // Fill remaining guests
  const tableType = style === "rectangular" ? "rect_table_8" : "round_table_10";
  const template = getTemplate(tableType);
  while (remaining > 0) {
    tables.push({ ...template });
    remaining -= template.capacity;
  }

  // Standard extras
  const extras = [
    getTemplate("dance_floor"),
    getTemplate("bar"),
    getTemplate("dj_booth"),
    getTemplate("cake_table"),
  ].filter(Boolean);

  return { tables, extras };
}
