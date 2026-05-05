import { describe, it, expect } from "vitest";
import {
  keepTogether,
  keepApart,
  validateConstraints,
  checkGuestAssignment,
  constraintsForGuest,
  mustSitWith,
  mustNotSitWith,
  findContradictions,
  constraintSummary,
} from "../../src/utils/seating-constraint.js";

describe("seating-constraint", () => {
  describe("keepTogether / keepApart", () => {
    it("creates a together constraint", () => {
      const c = keepTogether("g1", "g2", "siblings");
      expect(c.type).toBe("together");
      expect(c.guestA).toBe("g1");
      expect(c.reason).toBe("siblings");
    });

    it("creates an apart constraint", () => {
      const c = keepApart("g3", "g4", "exes");
      expect(c.type).toBe("apart");
      expect(c.guestA).toBe("g3");
      expect(c.reason).toBe("exes");
    });
  });

  describe("validateConstraints", () => {
    it("finds violations for together-pair on different tables", () => {
      const constraints = [keepTogether("g1", "g2")];
      const assignments = { g1: "t1", g2: "t2" };
      const violations = validateConstraints(constraints, assignments);
      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe("together");
    });

    it("finds violations for apart-pair on same table", () => {
      const constraints = [keepApart("g1", "g2")];
      const assignments = { g1: "t1", g2: "t1" };
      const violations = validateConstraints(constraints, assignments);
      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe("apart");
    });

    it("returns empty when constraints satisfied", () => {
      const constraints = [keepTogether("g1", "g2"), keepApart("g1", "g3")];
      const assignments = { g1: "t1", g2: "t1", g3: "t2" };
      expect(validateConstraints(constraints, assignments)).toEqual([]);
    });

    it("skips unassigned guests", () => {
      const constraints = [keepTogether("g1", "g2")];
      expect(validateConstraints(constraints, { g1: "t1" })).toEqual([]);
    });

    it("returns empty for non-array constraints", () => {
      expect(validateConstraints(null, {})).toEqual([]);
    });
  });

  describe("checkGuestAssignment", () => {
    it("detects violations for a proposed assignment", () => {
      const constraints = [keepTogether("g1", "g2")];
      const assignments = { g2: "t1" };
      const violations = checkGuestAssignment("g1", "t2", constraints, assignments);
      expect(violations).toHaveLength(1);
    });

    it("returns empty when assignment is valid", () => {
      const constraints = [keepTogether("g1", "g2")];
      const assignments = { g2: "t1" };
      expect(checkGuestAssignment("g1", "t1", constraints, assignments)).toEqual([]);
    });
  });

  describe("constraintsForGuest", () => {
    it("returns all constraints involving a guest", () => {
      const constraints = [
        keepTogether("g1", "g2"),
        keepApart("g1", "g3"),
        keepTogether("g4", "g5"),
      ];
      expect(constraintsForGuest(constraints, "g1")).toHaveLength(2);
    });

    it("returns empty for non-array", () => {
      expect(constraintsForGuest(null, "g1")).toEqual([]);
    });
  });

  describe("mustSitWith / mustNotSitWith", () => {
    it("returns IDs of must-sit-together guests", () => {
      const constraints = [keepTogether("g1", "g2"), keepTogether("g1", "g3")];
      expect(mustSitWith(constraints, "g1")).toEqual(["g2", "g3"]);
    });

    it("returns IDs of must-sit-apart guests", () => {
      const constraints = [keepApart("g1", "g4"), keepApart("g5", "g1")];
      expect(mustNotSitWith(constraints, "g1")).toEqual(["g4", "g5"]);
    });
  });

  describe("findContradictions", () => {
    it("detects contradictory constraints for same pair", () => {
      const constraints = [keepTogether("g1", "g2"), keepApart("g1", "g2")];
      const contradictions = findContradictions(constraints);
      expect(contradictions).toHaveLength(1);
    });

    it("returns empty when no contradictions", () => {
      const constraints = [keepTogether("g1", "g2"), keepApart("g1", "g3")];
      expect(findContradictions(constraints)).toEqual([]);
    });

    it("handles reversed pair order", () => {
      const constraints = [keepTogether("g2", "g1"), keepApart("g1", "g2")];
      expect(findContradictions(constraints)).toHaveLength(1);
    });
  });

  describe("constraintSummary", () => {
    it("summarizes constraint stats", () => {
      const constraints = [
        keepTogether("g1", "g2"),
        keepTogether("g3", "g4"),
        keepApart("g1", "g3"),
        keepApart("g1", "g2"), // contradiction
      ];
      const summary = constraintSummary(constraints);
      expect(summary.total).toBe(4);
      expect(summary.together).toBe(2);
      expect(summary.apart).toBe(2);
      expect(summary.contradictions).toBe(1);
    });

    it("returns zeros for non-array", () => {
      expect(constraintSummary(null)).toEqual({ total: 0, together: 0, apart: 0, contradictions: 0 });
    });
  });
});
