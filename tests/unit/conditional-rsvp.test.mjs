import { describe, it, expect, beforeEach } from "vitest";
import {
  resetIdCounter,
  createQuestion,
  evaluateCondition,
  getVisibleQuestions,
  validateAnswers,
  buildDependencyGraph,
  hasCircularDependency,
  topologicalSort,
  getFormComplexity,
} from "../../src/utils/conditional-rsvp.js";

describe("S665 conditional-rsvp", () => {
  beforeEach(() => resetIdCounter());

  describe("createQuestion", () => {
    it("creates a question with defaults", () => {
      const q = createQuestion({ label: "Dietary?", type: "select", options: ["Vegan", "Regular"] });
      expect(q.id).toBe("q_1");
      expect(q.label).toBe("Dietary?");
      expect(q.type).toBe("select");
      expect(q.options).toEqual(["Vegan", "Regular"]);
      expect(q.required).toBe(false);
      expect(q.condition).toBeNull();
    });

    it("creates a conditional question", () => {
      const q = createQuestion({
        label: "Allergy details",
        type: "text",
        required: true,
        condition: { questionId: "q_1", operator: "equals", value: "Vegan" },
      });
      expect(q.condition).toEqual({ questionId: "q_1", operator: "equals", value: "Vegan" });
      expect(q.required).toBe(true);
    });
  });

  describe("evaluateCondition", () => {
    it("equals - matches string", () => {
      const result = evaluateCondition(
        { questionId: "q_1", operator: "equals", value: "yes" },
        [{ questionId: "q_1", value: "yes" }],
      );
      expect(result).toBe(true);
    });

    it("equals - no match", () => {
      const result = evaluateCondition(
        { questionId: "q_1", operator: "equals", value: "yes" },
        [{ questionId: "q_1", value: "no" }],
      );
      expect(result).toBe(false);
    });

    it("not_equals", () => {
      const result = evaluateCondition(
        { questionId: "q_1", operator: "not_equals", value: "no" },
        [{ questionId: "q_1", value: "yes" }],
      );
      expect(result).toBe(true);
    });

    it("contains - array", () => {
      const result = evaluateCondition(
        { questionId: "q_1", operator: "contains", value: "fish" },
        [{ questionId: "q_1", value: ["fish", "chicken"] }],
      );
      expect(result).toBe(true);
    });

    it("contains - string", () => {
      const result = evaluateCondition(
        { questionId: "q_1", operator: "contains", value: "nut" },
        [{ questionId: "q_1", value: "peanut allergy" }],
      );
      expect(result).toBe(true);
    });

    it("gt - numeric", () => {
      const result = evaluateCondition(
        { questionId: "q_1", operator: "gt", value: 2 },
        [{ questionId: "q_1", value: 5 }],
      );
      expect(result).toBe(true);
    });

    it("lt - numeric", () => {
      const result = evaluateCondition(
        { questionId: "q_1", operator: "lt", value: 10 },
        [{ questionId: "q_1", value: 3 }],
      );
      expect(result).toBe(true);
    });

    it("returns false for missing answer", () => {
      const result = evaluateCondition(
        { questionId: "q_1", operator: "equals", value: "yes" },
        [],
      );
      expect(result).toBe(false);
    });
  });

  describe("getVisibleQuestions", () => {
    it("shows unconditional questions always", () => {
      const questions = [
        createQuestion({ label: "Name", type: "text" }),
        createQuestion({ label: "Coming?", type: "boolean" }),
      ];
      const visible = getVisibleQuestions(questions, []);
      expect(visible).toHaveLength(2);
    });

    it("hides questions with unmet conditions", () => {
      resetIdCounter();
      const q1 = createQuestion({ label: "Coming?", type: "boolean" });
      const q2 = createQuestion({
        label: "How many?",
        type: "number",
        condition: { questionId: q1.id, operator: "equals", value: true },
      });
      const visible = getVisibleQuestions([q1, q2], [{ questionId: q1.id, value: false }]);
      expect(visible).toHaveLength(1);
      expect(visible[0].id).toBe(q1.id);
    });

    it("shows questions with met conditions", () => {
      resetIdCounter();
      const q1 = createQuestion({ label: "Coming?", type: "boolean" });
      const q2 = createQuestion({
        label: "How many?",
        type: "number",
        condition: { questionId: q1.id, operator: "equals", value: true },
      });
      const visible = getVisibleQuestions([q1, q2], [{ questionId: q1.id, value: true }]);
      expect(visible).toHaveLength(2);
    });
  });

  describe("validateAnswers", () => {
    it("passes when all required answered", () => {
      resetIdCounter();
      const q1 = createQuestion({ label: "Name", type: "text", required: true });
      const result = validateAnswers([q1], [{ questionId: q1.id, value: "Alice" }]);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it("fails for missing required answer", () => {
      resetIdCounter();
      const q1 = createQuestion({ label: "Name", type: "text", required: true });
      const result = validateAnswers([q1], []);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain(q1.id);
    });

    it("skips hidden conditional required questions", () => {
      resetIdCounter();
      const q1 = createQuestion({ label: "Coming?", type: "boolean" });
      const q2 = createQuestion({
        label: "Meal",
        type: "select",
        required: true,
        condition: { questionId: q1.id, operator: "equals", value: true },
      });
      const result = validateAnswers([q1, q2], [{ questionId: q1.id, value: false }]);
      expect(result.valid).toBe(true);
    });
  });

  describe("buildDependencyGraph", () => {
    it("builds parent->children map", () => {
      resetIdCounter();
      const q1 = createQuestion({ label: "A", type: "text" });
      const q2 = createQuestion({ label: "B", type: "text", condition: { questionId: q1.id, operator: "equals", value: "x" } });
      const q3 = createQuestion({ label: "C", type: "text", condition: { questionId: q1.id, operator: "equals", value: "y" } });
      const graph = buildDependencyGraph([q1, q2, q3]);
      expect(graph[q1.id]).toEqual([q2.id, q3.id]);
    });
  });

  describe("hasCircularDependency", () => {
    it("returns false for valid tree", () => {
      const questions = [
        { id: "q_1", label: "A", type: "text", options: [], required: false, condition: null },
        { id: "q_2", label: "B", type: "text", options: [], required: false, condition: { questionId: "q_1", operator: "equals", value: "x" } },
      ];
      expect(hasCircularDependency(questions)).toBe(false);
    });

    it("returns true for circular dependency", () => {
      const questions = [
        { id: "q_1", label: "A", type: "text", options: [], required: false, condition: { questionId: "q_2", operator: "equals", value: "x" } },
        { id: "q_2", label: "B", type: "text", options: [], required: false, condition: { questionId: "q_1", operator: "equals", value: "y" } },
      ];
      expect(hasCircularDependency(questions)).toBe(true);
    });
  });

  describe("topologicalSort", () => {
    it("places parents before children", () => {
      resetIdCounter();
      const q1 = createQuestion({ label: "A", type: "text" });
      const q2 = createQuestion({ label: "B", type: "text", condition: { questionId: q1.id, operator: "equals", value: "x" } });
      const sorted = topologicalSort([q2, q1]);
      expect(sorted[0].id).toBe(q1.id);
      expect(sorted[1].id).toBe(q2.id);
    });
  });

  describe("getFormComplexity", () => {
    it("computes complexity metrics", () => {
      resetIdCounter();
      const q1 = createQuestion({ label: "A", type: "text", required: true });
      const q2 = createQuestion({ label: "B", type: "text", condition: { questionId: q1.id, operator: "equals", value: "x" } });
      const q3 = createQuestion({ label: "C", type: "text", condition: { questionId: q2.id, operator: "equals", value: "y" } });
      const stats = getFormComplexity([q1, q2, q3]);
      expect(stats.total).toBe(3);
      expect(stats.conditional).toBe(2);
      expect(stats.required).toBe(1);
      expect(stats.maxDepth).toBe(2);
    });
  });
});
