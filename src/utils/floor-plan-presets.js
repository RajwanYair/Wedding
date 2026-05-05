/**
 * src/utils/floor-plan-presets.js — S625 Floor-plan preset layouts
 *
 * Pre-configured floor plan templates for common wedding setups:
 * banquet, U-shape, cocktail, classroom. Each preset returns a list
 * of furniture items positioned within a standard room.
 *
 * @module floor-plan-presets
 * @owner ux
 */

/**
 * @typedef {import('./floor-plan.js').Furniture} Furniture
 */

/**
 * @typedef {object} FloorPlanPreset
 * @property {string}  id
 * @property {string}  name
 * @property {string}  description
 * @property {{ width: number, height: number }} room
 * @property {Furniture[]} items
 * @property {number}  estimatedCapacity
 */

/**
 * Generate a banquet-style layout: head table + rows of round tables.
 *
 * @param {number} [tableCount] - number of guest tables (default 10)
 * @returns {FloorPlanPreset}
 */
export function banquetPreset(tableCount = 10) {
  const tc = Math.max(1, Math.min(50, Math.round(tableCount)));
  const cols = Math.ceil(Math.sqrt(tc));
  const rows = Math.ceil(tc / cols);
  const room = { width: Math.max(800, cols * 150 + 200), height: Math.max(600, rows * 150 + 300) };
  /** @type {Furniture[]} */
  const items = [
    { id: "head-1", type: "head-table", x: room.width / 2 - 150, y: 40, w: 300, h: 60, label: "Head Table" },
    { id: "dance-1", type: "dance-floor", x: room.width / 2 - 100, y: 140, w: 200, h: 120, label: "Dance Floor" },
  ];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (idx >= tc) break;
      items.push({
        id: `table-${idx + 1}`,
        type: "round-table",
        x: 100 + c * 150,
        y: 300 + r * 150,
        w: 80,
        h: 80,
        label: `Table ${idx + 1}`,
      });
      idx++;
    }
  }
  return {
    id: "banquet",
    name: "Banquet",
    description: "Classic wedding layout with head table, dance floor, and round guest tables",
    room,
    items,
    estimatedCapacity: tc * 10,
  };
}

/**
 * Generate a U-shape layout: three long tables forming a U.
 *
 * @returns {FloorPlanPreset}
 */
export function uShapePreset() {
  const room = { width: 800, height: 600 };
  /** @type {Furniture[]} */
  const items = [
    { id: "head-1", type: "head-table", x: 150, y: 50, w: 500, h: 50, label: "Head Table" },
    { id: "left-1", type: "rect-table", x: 100, y: 100, w: 50, h: 300, label: "Left Wing" },
    { id: "right-1", type: "rect-table", x: 650, y: 100, w: 50, h: 300, label: "Right Wing" },
    { id: "dance-1", type: "dance-floor", x: 250, y: 150, w: 300, h: 200, label: "Dance Floor" },
    { id: "bar-1", type: "bar", x: 300, y: 500, w: 200, h: 50, label: "Bar" },
  ];
  return {
    id: "u-shape",
    name: "U-Shape",
    description: "U-shaped table arrangement with central dance floor",
    room,
    items,
    estimatedCapacity: 60,
  };
}

/**
 * Generate a cocktail-style layout: standing tables, bar, lounge areas.
 *
 * @param {number} [highTopCount] - number of standing tables (default 8)
 * @returns {FloorPlanPreset}
 */
export function cocktailPreset(highTopCount = 8) {
  const htc = Math.max(2, Math.min(30, Math.round(highTopCount)));
  const room = { width: 800, height: 600 };
  /** @type {Furniture[]} */
  const items = [
    { id: "bar-1", type: "bar", x: 300, y: 30, w: 200, h: 50, label: "Main Bar" },
    { id: "stage-1", type: "stage", x: 250, y: 450, w: 300, h: 100, label: "Stage / DJ" },
    { id: "dance-1", type: "dance-floor", x: 250, y: 250, w: 300, h: 180, label: "Dance Floor" },
  ];
  const cols = Math.ceil(htc / 2);
  for (let i = 0; i < htc; i++) {
    const side = i < Math.ceil(htc / 2) ? 0 : 1;
    const col = side === 0 ? i : i - Math.ceil(htc / 2);
    items.push({
      id: `ht-${i + 1}`,
      type: "bar-tall",
      x: side === 0 ? 50 + col * 80 : 600 + (col % cols) * 60,
      y: 150 + (col % 3) * 100,
      w: 40,
      h: 40,
      label: `HT ${i + 1}`,
    });
  }
  return {
    id: "cocktail",
    name: "Cocktail",
    description: "Standing cocktail layout with high-top tables and dance floor",
    room,
    items,
    estimatedCapacity: htc * 4,
  };
}

/**
 * Get all available preset IDs.
 *
 * @returns {string[]}
 */
export function listPresets() {
  return ["banquet", "u-shape", "cocktail"];
}

/**
 * Get a preset by ID.
 *
 * @param {string} id
 * @param {object} [options]
 * @param {number=} options.tableCount
 * @returns {FloorPlanPreset | null}
 */
export function getPreset(id, options) {
  switch (id) {
    case "banquet":
      return banquetPreset(options?.tableCount);
    case "u-shape":
      return uShapePreset();
    case "cocktail":
      return cocktailPreset(options?.tableCount);
    default:
      return null;
  }
}
