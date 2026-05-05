import { describe, it, expect, beforeEach } from "vitest";
import {
  resetIdCounter,
  createWall,
  createZone,
  getWallLength,
  getZoneArea,
  getUsableArea,
  zoneOverlapsWall,
  isZoneInBounds,
  generatePerimeterWalls,
  getZoneSummary,
  snapToGrid,
  getFloorPlanStats,
} from "../../src/utils/floor-plan-builder.js";

describe("S666 floor-plan-builder", () => {
  beforeEach(() => resetIdCounter());

  describe("createWall", () => {
    it("creates a wall with default thickness", () => {
      const w = createWall({ x1: 0, y1: 0, x2: 100, y2: 0 });
      expect(w.id).toBe("wall_1");
      expect(w.thickness).toBe(10);
      expect(w.x1).toBe(0);
      expect(w.x2).toBe(100);
    });

    it("accepts custom thickness", () => {
      const w = createWall({ x1: 0, y1: 0, x2: 50, y2: 50, thickness: 20 });
      expect(w.thickness).toBe(20);
    });
  });

  describe("createZone", () => {
    it("creates a zone with defaults", () => {
      const z = createZone({ label: "Dance Floor", x: 10, y: 10, width: 200, height: 150 });
      expect(z.id).toBe("zone_1");
      expect(z.label).toBe("Dance Floor");
      expect(z.shape).toBe("rectangle");
      expect(z.category).toBe("other");
      expect(z.color).toBe("#e0e0e0");
    });

    it("enforces minimum width/height of 1", () => {
      const z = createZone({ label: "X", x: 0, y: 0, width: -5, height: 0 });
      expect(z.width).toBe(1);
      expect(z.height).toBe(1);
    });

    it("accepts category and shape", () => {
      const z = createZone({ label: "Bar", x: 0, y: 0, width: 100, height: 50, shape: "circle", category: "bar" });
      expect(z.shape).toBe("circle");
      expect(z.category).toBe("bar");
    });
  });

  describe("getWallLength", () => {
    it("calculates horizontal wall length", () => {
      expect(getWallLength({ id: "w", x1: 0, y1: 0, x2: 100, y2: 0, thickness: 10 })).toBe(100);
    });

    it("calculates diagonal wall length", () => {
      expect(getWallLength({ id: "w", x1: 0, y1: 0, x2: 3, y2: 4, thickness: 10 })).toBe(5);
    });
  });

  describe("getZoneArea", () => {
    it("calculates rectangle area", () => {
      const z = createZone({ label: "A", x: 0, y: 0, width: 10, height: 5 });
      expect(getZoneArea(z)).toBe(50);
    });

    it("calculates circle area", () => {
      const z = createZone({ label: "B", x: 0, y: 0, width: 10, height: 10, shape: "circle" });
      expect(getZoneArea(z)).toBeCloseTo(78.54, 1);
    });
  });

  describe("getUsableArea", () => {
    it("subtracts wall footprint from room area", () => {
      const room = { width: 100, height: 100, unit: "px" };
      const walls = [{ id: "w1", x1: 0, y1: 0, x2: 100, y2: 0, thickness: 10 }];
      const area = getUsableArea(room, walls);
      expect(area).toBe(9000);
    });

    it("handles empty walls", () => {
      const room = { width: 50, height: 50, unit: "m" };
      expect(getUsableArea(room, [])).toBe(2500);
    });
  });

  describe("zoneOverlapsWall", () => {
    it("detects overlap", () => {
      const zone = createZone({ label: "X", x: 0, y: 0, width: 50, height: 50 });
      const walls = [{ id: "w1", x1: 20, y1: 20, x2: 40, y2: 20, thickness: 10 }];
      expect(zoneOverlapsWall(zone, walls)).toBe(true);
    });

    it("returns false for non-overlapping", () => {
      const zone = createZone({ label: "X", x: 100, y: 100, width: 20, height: 20 });
      const walls = [{ id: "w1", x1: 0, y1: 0, x2: 50, y2: 0, thickness: 10 }];
      expect(zoneOverlapsWall(zone, walls)).toBe(false);
    });
  });

  describe("isZoneInBounds", () => {
    it("returns true for zone within room", () => {
      const zone = createZone({ label: "X", x: 10, y: 10, width: 30, height: 30 });
      expect(isZoneInBounds(zone, { width: 100, height: 100, unit: "px" })).toBe(true);
    });

    it("returns false for zone outside room", () => {
      const zone = createZone({ label: "X", x: 80, y: 80, width: 30, height: 30 });
      expect(isZoneInBounds(zone, { width: 100, height: 100, unit: "px" })).toBe(false);
    });
  });

  describe("generatePerimeterWalls", () => {
    it("creates 4 walls for room perimeter", () => {
      const walls = generatePerimeterWalls({ width: 200, height: 100, unit: "px" });
      expect(walls).toHaveLength(4);
      expect(walls[0].x1).toBe(0);
      expect(walls[0].x2).toBe(200);
    });
  });

  describe("getZoneSummary", () => {
    it("groups by category with area", () => {
      const zones = [
        createZone({ label: "A", x: 0, y: 0, width: 10, height: 10, category: "seating" }),
        createZone({ label: "B", x: 20, y: 0, width: 5, height: 5, category: "seating" }),
        createZone({ label: "C", x: 0, y: 20, width: 20, height: 20, category: "dance" }),
      ];
      const summary = getZoneSummary(zones);
      expect(summary.seating.count).toBe(2);
      expect(summary.seating.totalArea).toBe(125);
      expect(summary.dance.count).toBe(1);
    });
  });

  describe("snapToGrid", () => {
    it("snaps to nearest grid point", () => {
      expect(snapToGrid(17, 10)).toBe(20);
      expect(snapToGrid(13, 10)).toBe(10);
      expect(snapToGrid(25, 10)).toBe(30);
    });

    it("handles zero grid size", () => {
      expect(snapToGrid(17, 0)).toBe(17);
    });
  });

  describe("getFloorPlanStats", () => {
    it("returns comprehensive stats", () => {
      const room = { width: 100, height: 100, unit: "px" };
      const walls = [{ id: "w1", x1: 0, y1: 0, x2: 100, y2: 0, thickness: 10 }];
      const zones = [
        createZone({ label: "A", x: 0, y: 0, width: 50, height: 50, category: "seating" }),
      ];
      const stats = getFloorPlanStats(room, walls, zones);
      expect(stats.roomArea).toBe(10000);
      expect(stats.wallCount).toBe(1);
      expect(stats.zoneCount).toBe(1);
      expect(stats.zoneCoverage).toBe(25);
    });
  });
});
