import { describe, it, expect } from "vitest";
import {
  TOUR_STEPS,
  TOUR_ROLES,
  createTourStep,
  buildTour,
  filterStepsForRole,
  getTourProgress,
  markStepComplete,
  isTourComplete,
  resetTour,
  buildTourSummary,
} from "../../src/utils/tour-guide.js";

// ── Constants ─────────────────────────────────────────────────────────────

describe("TOUR_STEPS", () => {
  it("is frozen", () => expect(Object.isFrozen(TOUR_STEPS)).toBe(true));
  it("has WELCOME, ADD_GUEST, DONE", () => {
    expect(TOUR_STEPS.WELCOME).toBe("welcome");
    expect(TOUR_STEPS.ADD_GUEST).toBe("add_guest");
    expect(TOUR_STEPS.DONE).toBe("done");
  });
});

describe("TOUR_ROLES", () => {
  it("is frozen", () => expect(Object.isFrozen(TOUR_ROLES)).toBe(true));
  it("has ADMIN, COORDINATOR, GUEST", () => {
    expect(TOUR_ROLES.ADMIN).toBe("admin");
    expect(TOUR_ROLES.COORDINATOR).toBe("coordinator");
    expect(TOUR_ROLES.GUEST).toBe("guest");
  });
});

// ── createTourStep ────────────────────────────────────────────────────────

describe("createTourStep()", () => {
  it("creates a step with required fields", () => {
    const step = createTourStep({
      id: "test_step",
      titleKey: "tour.test.title",
      descKey: "tour.test.desc",
      roles: [TOUR_ROLES.ADMIN],
    });
    expect(step.id).toBe("test_step");
    expect(step.titleKey).toBe("tour.test.title");
    expect(step.target).toBeNull();
    expect(step.order).toBe(0);
  });

  it("accepts optional target and order", () => {
    const step = createTourStep({
      id: "s",
      titleKey: "t",
      descKey: "d",
      roles: [],
      target: "#btn",
      order: 5,
    });
    expect(step.target).toBe("#btn");
    expect(step.order).toBe(5);
  });

  it("clones roles array", () => {
    const roles = [TOUR_ROLES.ADMIN];
    const step = createTourStep({ id: "s", titleKey: "t", descKey: "d", roles });
    roles.push(TOUR_ROLES.GUEST);
    expect(step.roles).toHaveLength(1);
  });

  it("throws without id", () => {
    expect(() => createTourStep({ titleKey: "t", descKey: "d", roles: [] })).toThrow();
  });

  it("throws without titleKey", () => {
    expect(() => createTourStep({ id: "s", descKey: "d", roles: [] })).toThrow();
  });

  it("throws if roles is not array", () => {
    expect(() => createTourStep({ id: "s", titleKey: "t", descKey: "d", roles: "admin" })).toThrow();
  });
});

// ── buildTour ─────────────────────────────────────────────────────────────

describe("buildTour()", () => {
  it("returns steps for admin role", () => {
    const steps = buildTour(TOUR_ROLES.ADMIN);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.every((s) => s.roles.includes(TOUR_ROLES.ADMIN))).toBe(true);
  });

  it("returns fewer steps for coordinator than admin", () => {
    const adminSteps = buildTour(TOUR_ROLES.ADMIN);
    const coordSteps = buildTour(TOUR_ROLES.COORDINATOR);
    expect(adminSteps.length).toBeGreaterThanOrEqual(coordSteps.length);
  });

  it("steps are ordered by order property", () => {
    const steps = buildTour(TOUR_ROLES.ADMIN);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].order).toBeGreaterThanOrEqual(steps[i - 1].order);
    }
  });

  it("defaults to admin if no role provided", () => {
    expect(buildTour().length).toBe(buildTour(TOUR_ROLES.ADMIN).length);
  });
});

// ── filterStepsForRole ────────────────────────────────────────────────────

describe("filterStepsForRole()", () => {
  const steps = [
    { id: "a", roles: [TOUR_ROLES.ADMIN] },
    { id: "b", roles: [TOUR_ROLES.ADMIN, TOUR_ROLES.COORDINATOR] },
    { id: "c", roles: [TOUR_ROLES.GUEST] },
  ];

  it("filters to admin steps", () => {
    const result = filterStepsForRole(steps, TOUR_ROLES.ADMIN);
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("filters to coordinator steps", () => {
    const result = filterStepsForRole(steps, TOUR_ROLES.COORDINATOR);
    expect(result.map((s) => s.id)).toEqual(["b"]);
  });

  it("returns empty array for null steps", () => {
    expect(filterStepsForRole(null, TOUR_ROLES.ADMIN)).toEqual([]);
  });
});

// ── getTourProgress ───────────────────────────────────────────────────────

describe("getTourProgress()", () => {
  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

  it("returns 0% for no completed steps", () => {
    const p = getTourProgress(steps, []);
    expect(p.completed).toBe(0);
    expect(p.percent).toBe(0);
    expect(p.isComplete).toBe(false);
  });

  it("returns 50% for half completed", () => {
    const p = getTourProgress(steps, ["a", "b"]);
    expect(p.percent).toBe(50);
    expect(p.remaining).toBe(2);
  });

  it("returns 100% when all done", () => {
    const p = getTourProgress(steps, ["a", "b", "c", "d"]);
    expect(p.percent).toBe(100);
    expect(p.isComplete).toBe(true);
  });

  it("accepts a Set", () => {
    const p = getTourProgress(steps, new Set(["a"]));
    expect(p.completed).toBe(1);
  });

  it("handles empty steps", () => {
    const p = getTourProgress([], []);
    expect(p.percent).toBe(0);
    expect(p.total).toBe(0);
  });
});

// ── markStepComplete ──────────────────────────────────────────────────────

describe("markStepComplete()", () => {
  it("adds stepId to the set", () => {
    const done = markStepComplete([], "a");
    expect(done.has("a")).toBe(true);
  });

  it("is immutable — original set unchanged", () => {
    const original = new Set(["a"]);
    const next = markStepComplete(original, "b");
    expect(original.has("b")).toBe(false);
    expect(next.has("b")).toBe(true);
  });

  it("de-dupes repeated marks", () => {
    const done = markStepComplete(["a", "a"], "a");
    expect(done.size).toBe(1);
  });
});

// ── isTourComplete ────────────────────────────────────────────────────────

describe("isTourComplete()", () => {
  const steps = [{ id: "a" }, { id: "b" }];

  it("returns false when steps are incomplete", () => {
    expect(isTourComplete(steps, ["a"])).toBe(false);
  });

  it("returns true when all steps done", () => {
    expect(isTourComplete(steps, ["a", "b"])).toBe(true);
  });

  it("returns false for empty steps array", () => {
    expect(isTourComplete([], ["a"])).toBe(false);
  });
});

// ── resetTour ─────────────────────────────────────────────────────────────

describe("resetTour()", () => {
  it("returns an empty Set", () => {
    const s = resetTour();
    expect(s).toBeInstanceOf(Set);
    expect(s.size).toBe(0);
  });
});

// ── buildTourSummary ──────────────────────────────────────────────────────

describe("buildTourSummary()", () => {
  const steps = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("returns completedSteps, pendingSteps and progress", () => {
    const summary = buildTourSummary(steps, ["a"]);
    expect(summary.completedSteps).toEqual(["a"]);
    expect(summary.pendingSteps).toEqual(["b", "c"]);
    expect(summary.progress.completed).toBe(1);
  });

  it("handles empty completed set", () => {
    const summary = buildTourSummary(steps, []);
    expect(summary.completedSteps).toEqual([]);
    expect(summary.pendingSteps).toHaveLength(3);
  });

  it("handles fully completed tour", () => {
    const summary = buildTourSummary(steps, ["a", "b", "c"]);
    expect(summary.progress.isComplete).toBe(true);
    expect(summary.pendingSteps).toEqual([]);
  });
});
