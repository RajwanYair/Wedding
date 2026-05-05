// tests/unit/dietary-cascade.test.mjs — S624 RSVP dietary cascade
import { describe, it, expect } from "vitest";
import {
  DEFAULT_CASCADE_RULES,
  getCascadeQuestions,
  expandPlusOneCascade,
  validateCascadeAnswers,
  buildCascadeSummary,
} from "../../src/utils/dietary-cascade.js";

describe("dietary-cascade", () => {
  describe("DEFAULT_CASCADE_RULES", () => {
    it("has 5 default rules", () => {
      expect(DEFAULT_CASCADE_RULES).toHaveLength(5);
    });
    it("includes wildcard rules", () => {
      const wildcards = DEFAULT_CASCADE_RULES.filter((r) => r.triggerMeal === "*");
      expect(wildcards.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getCascadeQuestions", () => {
    it("returns meal-specific + wildcard questions for vegetarian", () => {
      const qs = getCascadeQuestions("vegetarian");
      expect(qs.some((q) => q.questionId === "diet_veg_vegan")).toBe(true);
      expect(qs.some((q) => q.questionId === "diet_allergies")).toBe(true);
    });
    it("returns only wildcard for unknown meal", () => {
      const qs = getCascadeQuestions("steak");
      expect(qs.every((q) => q.triggerMeal === "*")).toBe(true);
      expect(qs.length).toBe(2);
    });
    it("returns fish-specific questions", () => {
      const qs = getCascadeQuestions("fish");
      expect(qs.some((q) => q.questionId === "diet_fish_type")).toBe(true);
    });
    it("returns empty for blank meal", () => {
      expect(getCascadeQuestions("")).toEqual([]);
    });
    it("uses custom rules when provided", () => {
      const rules = [{ triggerMeal: "custom", questionId: "q1", label: "Custom?", type: "text" }];
      expect(getCascadeQuestions("custom", rules)).toHaveLength(1);
    });
  });

  describe("expandPlusOneCascade", () => {
    it("expands for multiple guests", () => {
      const result = expandPlusOneCascade(["vegetarian", "fish"]);
      expect(result.length).toBeGreaterThan(4);
      expect(result.filter((r) => r.guestIndex === 0).length).toBeGreaterThan(0);
      expect(result.filter((r) => r.guestIndex === 1).length).toBeGreaterThan(0);
    });
    it("returns empty for null", () => {
      expect(expandPlusOneCascade(null)).toEqual([]);
    });
  });

  describe("validateCascadeAnswers", () => {
    it("passes when all required answered", () => {
      const qs = [{ questionId: "q1", required: true, label: "Q1", type: "text", triggerMeal: "*" }];
      expect(validateCascadeAnswers(qs, { q1: "answer" }).valid).toBe(true);
    });
    it("fails when required missing", () => {
      const qs = [{ questionId: "q1", required: true, label: "Q1", type: "text", triggerMeal: "*" }];
      const result = validateCascadeAnswers(qs, {});
      expect(result.valid).toBe(false);
      expect(result.missing).toContain("q1");
    });
    it("skips optional questions", () => {
      const qs = [{ questionId: "q1", label: "Q1", type: "text", triggerMeal: "*" }];
      expect(validateCascadeAnswers(qs, {}).valid).toBe(true);
    });
    it("handles null questions", () => {
      expect(validateCascadeAnswers(null, {}).valid).toBe(true);
    });
  });

  describe("buildCascadeSummary", () => {
    it("builds summary from answers", () => {
      const qs = [
        { questionId: "q1", label: "Allergy?", type: "text", triggerMeal: "*" },
        { questionId: "q2", label: "Spice?", type: "choice", triggerMeal: "*" },
      ];
      const summary = buildCascadeSummary({ q1: "peanuts", q2: "mild" }, qs);
      expect(summary).toHaveLength(2);
      expect(summary[0]).toEqual({ label: "Allergy?", value: "peanuts" });
    });
    it("skips unanswered questions", () => {
      const qs = [{ questionId: "q1", label: "A", type: "text", triggerMeal: "*" }];
      expect(buildCascadeSummary({}, qs)).toEqual([]);
    });
    it("handles null", () => {
      expect(buildCascadeSummary(null, null)).toEqual([]);
    });
  });
});
