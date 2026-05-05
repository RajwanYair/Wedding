/**
 * src/utils/floor-plan-builder.js — Floor-plan builder: walls, zones, room dimensions (S666)
 *
 * @module floor-plan-builder
 * @owner guest
 */

/**
 * @typedef {object} Wall
 * @property {string} id
 * @property {number} x1
 * @property {number} y1
 * @property {number} x2
 * @property {number} y2
 * @property {number} thickness
 */

/**
 * @typedef {object} Zone
 * @property {string} id
 * @property {string} label
 * @property {"rectangle"|"circle"|"polygon"} shape
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {string} color
 * @property {"seating"|"dance"|"bar"|"stage"|"entrance"|"other"} category
 */

/**
 * @typedef {object} RoomDimensions
 * @property {number} width
 * @property {number} height
 * @property {string} unit
 */

let _idCounter = 0;

/** Reset ID counter - testing only. */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

/**
 * Create a wall segment.
 * @param {object} params
 * @param {number} params.x1
 * @param {number} params.y1
 * @param {number} params.x2
 * @param {number} params.y2
 * @param {number} [params.thickness]
 * @returns {Wall}
 */
export function createWall({ x1, y1, x2, y2, thickness }) {
  return {
    id: `wall_${++_idCounter}`,
    x1,
    y1,
    x2,
    y2,
    thickness: thickness || 10,
  };
}

/**
 * Create a zone.
 * @param {object} params
 * @param {string} params.label
 * @param {"rectangle"|"circle"|"polygon"} [params.shape]
 * @param {number} params.x
 * @param {number} params.y
 * @param {number} params.width
 * @param {number} params.height
 * @param {string} [params.color]
 * @param {"seating"|"dance"|"bar"|"stage"|"entrance"|"other"} [params.category]
 * @returns {Zone}
 */
export function createZone({ label, shape, x, y, width, height, color, category }) {
  return {
    id: `zone_${++_idCounter}`,
    label: (label || "").trim(),
    shape: shape || "rectangle",
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
    color: color || "#e0e0e0",
    category: category || "other",
  };
}

/**
 * Calculate wall length.
 * @param {Wall} wall
 * @returns {number}
 */
export function getWallLength(wall) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
}

/**
 * Calculate zone area.
 * @param {Zone} zone
 * @returns {number}
 */
export function getZoneArea(zone) {
  if (zone.shape === "circle") {
    const r = Math.min(zone.width, zone.height) / 2;
    return Math.round(Math.PI * r * r * 100) / 100;
  }
  return zone.width * zone.height;
}

/**
 * Calculate total usable area from room dimensions minus wall footprints.
 * @param {RoomDimensions} room
 * @param {Wall[]} walls
 * @returns {number}
 */
export function getUsableArea(room, walls) {
  const totalArea = room.width * room.height;
  let wallArea = 0;
  for (const w of walls) {
    wallArea += getWallLength(w) * w.thickness;
  }
  return Math.max(0, Math.round((totalArea - wallArea) * 100) / 100);
}

/**
 * Check if a zone overlaps with any wall.
 * @param {Zone} zone
 * @param {Wall[]} walls
 * @returns {boolean}
 */
export function zoneOverlapsWall(zone, walls) {
  for (const wall of walls) {
    const wx1 = Math.min(wall.x1, wall.x2) - wall.thickness / 2;
    const wy1 = Math.min(wall.y1, wall.y2) - wall.thickness / 2;
    const wx2 = Math.max(wall.x1, wall.x2) + wall.thickness / 2;
    const wy2 = Math.max(wall.y1, wall.y2) + wall.thickness / 2;

    const zx2 = zone.x + zone.width;
    const zy2 = zone.y + zone.height;

    if (zone.x < wx2 && zx2 > wx1 && zone.y < wy2 && zy2 > wy1) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a zone is within room bounds.
 * @param {Zone} zone
 * @param {RoomDimensions} room
 * @returns {boolean}
 */
export function isZoneInBounds(zone, room) {
  return (
    zone.x >= 0 &&
    zone.y >= 0 &&
    zone.x + zone.width <= room.width &&
    zone.y + zone.height <= room.height
  );
}

/**
 * Generate room perimeter walls.
 * @param {RoomDimensions} room
 * @param {number} [thickness]
 * @returns {Wall[]}
 */
export function generatePerimeterWalls(room, thickness = 10) {
  const w = room.width;
  const h = room.height;
  return [
    createWall({ x1: 0, y1: 0, x2: w, y2: 0, thickness }),
    createWall({ x1: w, y1: 0, x2: w, y2: h, thickness }),
    createWall({ x1: w, y1: h, x2: 0, y2: h, thickness }),
    createWall({ x1: 0, y1: h, x2: 0, y2: 0, thickness }),
  ];
}

/**
 * Get zone layout summary by category.
 * @param {Zone[]} zones
 * @returns {Record<string, { count: number, totalArea: number }>}
 */
export function getZoneSummary(zones) {
  /** @type {Record<string, { count: number, totalArea: number }>} */
  const summary = {};
  for (const z of zones) {
    if (!summary[z.category]) {
      summary[z.category] = { count: 0, totalArea: 0 };
    }
    summary[z.category].count++;
    summary[z.category].totalArea += getZoneArea(z);
  }
  return summary;
}

/**
 * Snap coordinates to grid.
 * @param {number} value
 * @param {number} gridSize
 * @returns {number}
 */
export function snapToGrid(value, gridSize) {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Get floor plan stats.
 * @param {RoomDimensions} room
 * @param {Wall[]} walls
 * @param {Zone[]} zones
 * @returns {{ roomArea: number, usableArea: number, wallCount: number, zoneCount: number, zoneCoverage: number }}
 */
export function getFloorPlanStats(room, walls, zones) {
  const roomArea = room.width * room.height;
  const usable = getUsableArea(room, walls);
  const zoneTotalArea = zones.reduce((s, z) => s + getZoneArea(z), 0);
  const coverage = roomArea > 0 ? Math.round((zoneTotalArea / roomArea) * 100) : 0;

  return {
    roomArea,
    usableArea: usable,
    wallCount: walls.length,
    zoneCount: zones.length,
    zoneCoverage: coverage,
  };
}
