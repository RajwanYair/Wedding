/**
 * S723 integration tests — Floor-plan builder canvas wired into tables.js
 * - addFloorPlanWall / addFloorPlanZone / buildPerimeterWalls
 * - getFloorPlanStats / getZoneSummary
 * - placeFurnitureItem / suggestFurnitureLayout / getFurnitureCatalogue
 * - validateFurniturePlacement / snapValueToGrid
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(),
}));
vi.mock("../../src/core/ui.js", () => ({ showToast: vi.fn(), announce: vi.fn() }));
vi.mock("../../src/services/realtime.js", () => ({
  subscribeToTable: vi.fn(),
  unsubscribeAll: vi.fn(),
}));

beforeEach(() => {
  initStore({});
});

import {
  addFloorPlanWall,
  addFloorPlanZone,
  buildPerimeterWalls,
  getFloorPlanStats,
  getZoneSummary,
  placeFurnitureItem,
  suggestFurnitureLayout,
  getFurnitureCatalogue,
  validateFurniturePlacement,
  snapValueToGrid,
} from "../../src/sections/tables.js";

describe("S723 -- addFloorPlanWall", () => {
  it("creates a wall object with id and coordinates", () => {
    const wall = addFloorPlanWall({ x1: 0, y1: 0, x2: 100, y2: 0, thickness: 10 });
    expect(wall).toMatchObject({ x1: 0, y1: 0, x2: 100, y2: 0, thickness: 10 });
    expect(wall).toHaveProperty("id");
  });

  it("defaults thickness when not provided", () => {
    const wall = addFloorPlanWall({ x1: 0, y1: 0, x2: 50, y2: 50 });
    expect(wall.thickness).toBeGreaterThan(0);
  });
});

describe("S723 -- addFloorPlanZone", () => {
  it("creates a zone with label and dimensions", () => {
    const zone = addFloorPlanZone({ label: "Dance Floor", x: 10, y: 10, width: 200, height: 100 });
    expect(zone).toMatchObject({ label: "Dance Floor", x: 10, y: 10, width: 200, height: 100 });
    expect(zone).toHaveProperty("id");
  });

  it("accepts optional category and color", () => {
    const zone = addFloorPlanZone({ label: "Stage", x: 0, y: 0, width: 50, height: 30, category: "entertainment", color: "#ff0" });
    expect(zone.category).toBe("entertainment");
    expect(zone.color).toBe("#ff0");
  });
});

describe("S723 -- buildPerimeterWalls", () => {
  it("returns 4 walls for a rectangular room", () => {
    const walls = buildPerimeterWalls({ width: 800, height: 600 });
    expect(Array.isArray(walls)).toBe(true);
    expect(walls.length).toBe(4);
  });

  it("accepts custom thickness", () => {
    const walls = buildPerimeterWalls({ width: 400, height: 300 }, 20);
    walls.forEach((w) => expect(w.thickness).toBe(20));
  });
});

describe("S723 -- getFloorPlanStats", () => {
  it("returns stats object with area info", () => {
    const room = { width: 800, height: 600 };
    const walls = buildPerimeterWalls(room);
    const zones = [addFloorPlanZone({ label: "Entry", x: 0, y: 0, width: 100, height: 100 })];
    const stats = getFloorPlanStats(room, walls, zones);
    expect(stats).toHaveProperty("roomArea");
    expect(stats).toHaveProperty("wallCount");
    expect(stats).toHaveProperty("zoneCount");
    expect(stats.zoneCount).toBe(1);
    expect(stats.roomArea).toBe(800 * 600);
  });
});

describe("S723 -- getZoneSummary", () => {
  it("returns summary of zones keyed by category", () => {
    const zones = [
      addFloorPlanZone({ label: "A", x: 0, y: 0, width: 100, height: 100, category: "dining" }),
      addFloorPlanZone({ label: "B", x: 200, y: 0, width: 80, height: 80, category: "entertainment" }),
    ];
    const summary = getZoneSummary(zones);
    expect(summary).toHaveProperty("dining");
    expect(summary.dining.count).toBe(1);
    expect(summary).toHaveProperty("entertainment");
  });
});

describe("S723 -- placeFurnitureItem", () => {
  it("places a furniture item at given coordinates", () => {
    const item = placeFurnitureItem("round_table_10", 100, 200);
    expect(item).toMatchObject({ x: 100, y: 200 });
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("type");
  });

  it("accepts rotation parameter", () => {
    const item = placeFurnitureItem("rect_table_6", 50, 50, 90);
    expect(item.rotation).toBe(90);
  });

  it("returns null for unknown type", () => {
    expect(placeFurnitureItem("nonexistent_type", 0, 0)).toBeNull();
  });
});

describe("S723 -- suggestFurnitureLayout", () => {
  it("returns tables and extras for a guest count", () => {
    const result = suggestFurnitureLayout(50);
    expect(result).toHaveProperty("tables");
    expect(result).toHaveProperty("extras");
    expect(Array.isArray(result.tables)).toBe(true);
    expect(result.tables.length).toBeGreaterThan(0);
  });

  it("accepts rectangular style", () => {
    const result = suggestFurnitureLayout(40, "rectangular");
    expect(Array.isArray(result.tables)).toBe(true);
  });
});

describe("S723 -- getFurnitureCatalogue", () => {
  it("returns an array of catalogue items", () => {
    const cat = getFurnitureCatalogue();
    expect(Array.isArray(cat)).toBe(true);
    expect(cat.length).toBeGreaterThan(0);
  });

  it("catalogue items have type and dimensions", () => {
    const cat = getFurnitureCatalogue();
    const first = cat[0];
    expect(first).toHaveProperty("type");
    expect(first).toHaveProperty("width");
    expect(first).toHaveProperty("height");
  });
});

describe("S723 -- validateFurniturePlacement", () => {
  it("returns valid=true for items inside room", () => {
    const room = { width: 10000, height: 10000 };
    const inside = placeFurnitureItem("cocktail_table", 500, 500);
    const result = validateFurniturePlacement([inside], room);
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("outOfBounds");
    expect(result).toHaveProperty("collisions");
    expect(result.valid).toBe(true);
  });

  it("flags items outside room bounds", () => {
    const room = { width: 100, height: 100 };
    const outside = placeFurnitureItem("cocktail_table", 5000, 5000);
    const result = validateFurniturePlacement([outside], room);
    expect(result.outOfBounds.length).toBeGreaterThan(0);
    expect(result.valid).toBe(false);
  });
});

describe("S723 -- snapValueToGrid", () => {
  it("snaps a value to the nearest grid point", () => {
    expect(snapValueToGrid(13, 10)).toBe(10);
    expect(snapValueToGrid(17, 10)).toBe(20);
    expect(snapValueToGrid(50, 25)).toBe(50);
  });

  it("returns exact value when already on grid", () => {
    expect(snapValueToGrid(100, 10)).toBe(100);
  });
});
