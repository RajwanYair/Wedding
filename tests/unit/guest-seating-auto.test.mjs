import { describe, it, expect } from "vitest";
import {
  createSeatGuest,
  createSeatTable,
  extractConstraints,
  autoAssign,
  calculateScore,
  countViolations,
  getSeatingStats,
} from "../../src/utils/guest-seating-auto.js";

describe("S673 guest-seating-auto", () => {
  describe("createSeatGuest", () => {
    it("creates guest with defaults", () => {
      const g = createSeatGuest({ id: "g1", name: "Alice" });
      expect(g.id).toBe("g1");
      expect(g.group).toBe(null);
      expect(g.tableId).toBe(null);
      expect(g.preferNear).toEqual([]);
      expect(g.avoidNear).toEqual([]);
    });

    it("accepts preferences", () => {
      const g = createSeatGuest({ id: "g1", name: "Alice", group: "Family", preferNear: ["g2"], avoidNear: ["g3"] });
      expect(g.group).toBe("Family");
      expect(g.preferNear).toEqual(["g2"]);
      expect(g.avoidNear).toEqual(["g3"]);
    });
  });

  describe("createSeatTable", () => {
    it("creates table with minimum capacity 1", () => {
      const t = createSeatTable({ id: "t1", label: "Table 1", capacity: -5 });
      expect(t.capacity).toBe(1);
      expect(t.assigned).toEqual([]);
    });

    it("defaults to capacity 8 when 0 provided", () => {
      const t = createSeatTable({ id: "t1", label: "Table 1", capacity: 0 });
      expect(t.capacity).toBe(8);
    });
  });

  describe("extractConstraints", () => {
    it("extracts near and avoid constraints", () => {
      const guests = [
        createSeatGuest({ id: "g1", name: "A", preferNear: ["g2"] }),
        createSeatGuest({ id: "g2", name: "B", avoidNear: ["g3"] }),
      ];
      const constraints = extractConstraints(guests);
      expect(constraints).toHaveLength(2);
      expect(constraints[0].type).toBe("near");
      expect(constraints[1].type).toBe("avoid");
    });

    it("deduplicates bidirectional constraints", () => {
      const guests = [
        createSeatGuest({ id: "g1", name: "A", preferNear: ["g2"] }),
        createSeatGuest({ id: "g2", name: "B", preferNear: ["g1"] }),
      ];
      const constraints = extractConstraints(guests);
      expect(constraints).toHaveLength(1);
    });
  });

  describe("autoAssign", () => {
    it("assigns grouped guests together", () => {
      const guests = [
        createSeatGuest({ id: "g1", name: "A", group: "Family" }),
        createSeatGuest({ id: "g2", name: "B", group: "Family" }),
        createSeatGuest({ id: "g3", name: "C", group: "Friends" }),
      ];
      const tables = [
        createSeatTable({ id: "t1", label: "Table 1", capacity: 5 }),
        createSeatTable({ id: "t2", label: "Table 2", capacity: 5 }),
      ];
      const result = autoAssign(guests, tables);
      expect(result.unassigned).toHaveLength(0);
      // Family should be at same table
      const familyTable = result.tables.find((t) => t.assigned.includes("g1"));
      expect(familyTable.assigned).toContain("g2");
    });

    it("handles overflow gracefully", () => {
      const guests = Array.from({ length: 15 }, (_, i) =>
        createSeatGuest({ id: `g${i}`, name: `Guest ${i}` })
      );
      const tables = [createSeatTable({ id: "t1", label: "T1", capacity: 10 })];
      const result = autoAssign(guests, tables);
      expect(result.unassigned).toHaveLength(5);
    });

    it("splits large groups across tables", () => {
      const guests = Array.from({ length: 12 }, (_, i) =>
        createSeatGuest({ id: `g${i}`, name: `Guest ${i}`, group: "BigFamily" })
      );
      const tables = [
        createSeatTable({ id: "t1", label: "T1", capacity: 8 }),
        createSeatTable({ id: "t2", label: "T2", capacity: 8 }),
      ];
      const result = autoAssign(guests, tables);
      expect(result.unassigned).toHaveLength(0);
    });
  });

  describe("calculateScore", () => {
    it("rewards preferNear matches", () => {
      const guests = [
        createSeatGuest({ id: "g1", name: "A", preferNear: ["g2"] }),
        createSeatGuest({ id: "g2", name: "B" }),
      ];
      const tables = [{ id: "t1", label: "T1", capacity: 10, assigned: ["g1", "g2"] }];
      expect(calculateScore(tables, guests)).toBeGreaterThan(0);
    });

    it("penalizes avoidNear violations", () => {
      const guests = [
        createSeatGuest({ id: "g1", name: "A", avoidNear: ["g2"] }),
        createSeatGuest({ id: "g2", name: "B" }),
      ];
      const tables = [{ id: "t1", label: "T1", capacity: 10, assigned: ["g1", "g2"] }];
      expect(calculateScore(tables, guests)).toBeLessThan(0);
    });
  });

  describe("countViolations", () => {
    it("counts avoid violations", () => {
      const guests = [
        createSeatGuest({ id: "g1", name: "A", avoidNear: ["g2"] }),
        createSeatGuest({ id: "g2", name: "B", avoidNear: ["g1"] }),
      ];
      const tables = [{ id: "t1", label: "T1", capacity: 10, assigned: ["g1", "g2"] }];
      expect(countViolations(tables, guests)).toBe(2);
    });

    it("returns 0 for no violations", () => {
      const guests = [
        createSeatGuest({ id: "g1", name: "A", avoidNear: ["g2"] }),
        createSeatGuest({ id: "g2", name: "B" }),
      ];
      const tables = [
        { id: "t1", label: "T1", capacity: 10, assigned: ["g1"] },
        { id: "t2", label: "T2", capacity: 10, assigned: ["g2"] },
      ];
      expect(countViolations(tables, guests)).toBe(0);
    });
  });

  describe("getSeatingStats", () => {
    it("calculates stats correctly", () => {
      const guests = Array.from({ length: 20 }, (_, i) => createSeatGuest({ id: `g${i}`, name: `G${i}` }));
      const tables = [
        { id: "t1", label: "T1", capacity: 10, assigned: ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"] },
        { id: "t2", label: "T2", capacity: 10, assigned: ["g8", "g9", "g10", "g11", "g12"] },
      ];
      const stats = getSeatingStats(tables, guests);
      expect(stats.totalGuests).toBe(20);
      expect(stats.seated).toBe(13);
      expect(stats.unassigned).toBe(7);
      expect(stats.tableUtilization).toBe(65);
    });
  });
});
