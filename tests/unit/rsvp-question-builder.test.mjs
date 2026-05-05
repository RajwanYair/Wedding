// tests/unit/rsvp-question-builder.test.mjs — S636 RSVP question builder CRUD
import { describe, it, expect, beforeEach } from "vitest";
import {
  createQuestion,
  addQuestion,
  removeQuestion,
  updateQuestion,
  moveQuestion,
  condEquals,
  condExists,
  condAll,
  condAny,
  duplicateQuestion,
  validateQuestionList,
  resetIdCounter,
} from "../../src/utils/rsvp-question-builder.js";

beforeEach(() => resetIdCounter());

describe("rsvp-question-builder", () => {
  describe("createQuestion", () => {
    it("creates text question with defaults", () => {
      const q = createQuestion({ type: "text", label: "Name?" });
      expect(q.type).toBe("text");
      expect(q.label).toBe("Name?");
      expect(q.required).toBe(false);
      expect(q.id).toBe("q_1");
    });
    it("creates choice question with choices", () => {
      const q = createQuestion({ type: "choice", label: "Meal?", choices: ["Meat", "Fish", "Veg"] });
      expect(q.choices).toEqual(["Meat", "Fish", "Veg"]);
    });
    it("defaults invalid type to text", () => {
      expect(createQuestion({ type: "invalid" }).type).toBe("text");
    });
    it("includes showWhen condition", () => {
      const q = createQuestion({ type: "boolean", label: "Plus one?", showWhen: { exists: "q1" } });
      expect(q.showWhen).toEqual({ exists: "q1" });
    });
  });

  describe("addQuestion", () => {
    it("adds to list", () => {
      const q = createQuestion({ type: "text", label: "X" });
      expect(addQuestion([], q)).toHaveLength(1);
    });
    it("rejects duplicate id", () => {
      const q = createQuestion({ type: "text", label: "X", id: "q_1" });
      expect(addQuestion([q], q)).toHaveLength(1);
    });
    it("handles null input", () => {
      const q = createQuestion({ type: "text", label: "X" });
      expect(addQuestion(null, q)).toHaveLength(1);
    });
  });

  describe("removeQuestion", () => {
    it("removes by id", () => {
      const q = createQuestion({ type: "text", label: "X", id: "rm1" });
      expect(removeQuestion([q], "rm1")).toHaveLength(0);
    });
    it("no-op for unknown id", () => {
      const q = createQuestion({ type: "text", label: "X", id: "keep" });
      expect(removeQuestion([q], "nope")).toHaveLength(1);
    });
  });

  describe("updateQuestion", () => {
    it("updates label", () => {
      const q = createQuestion({ type: "text", label: "Old", id: "u1" });
      const updated = updateQuestion([q], "u1", { label: "New" });
      expect(updated[0].label).toBe("New");
      expect(updated[0].id).toBe("u1");
    });
    it("no-op for unknown id", () => {
      const q = createQuestion({ type: "text", label: "X", id: "u1" });
      expect(updateQuestion([q], "nope", { label: "Y" })).toEqual([q]);
    });
  });

  describe("moveQuestion", () => {
    it("moves forward", () => {
      const a = createQuestion({ type: "text", label: "A", id: "a" });
      const b = createQuestion({ type: "text", label: "B", id: "b" });
      const c = createQuestion({ type: "text", label: "C", id: "c" });
      const moved = moveQuestion([a, b, c], 0, 2);
      expect(moved.map((q) => q.id)).toEqual(["b", "c", "a"]);
    });
    it("no-op for same index", () => {
      const a = createQuestion({ type: "text", label: "A", id: "a" });
      expect(moveQuestion([a], 0, 0)).toEqual([a]);
    });
    it("no-op for out of bounds", () => {
      const a = createQuestion({ type: "text", label: "A", id: "a" });
      expect(moveQuestion([a], 0, 5)).toEqual([a]);
    });
  });

  describe("conditions", () => {
    it("condEquals", () => {
      expect(condEquals("q1", "yes")).toEqual({ equals: { id: "q1", value: "yes" } });
    });
    it("condExists", () => {
      expect(condExists("q1")).toEqual({ exists: "q1" });
    });
    it("condAll", () => {
      const c = condAll([condEquals("q1", "a"), condExists("q2")]);
      expect(c.all).toHaveLength(2);
    });
    it("condAny", () => {
      const c = condAny([condEquals("q1", "a")]);
      expect(c.any).toHaveLength(1);
    });
  });

  describe("duplicateQuestion", () => {
    it("creates copy with new id", () => {
      const q = createQuestion({ type: "text", label: "X", id: "orig" });
      const dup = duplicateQuestion(q);
      expect(dup.id).not.toBe("orig");
      expect(dup.label).toBe("X");
    });
  });

  describe("validateQuestionList", () => {
    it("valid list", () => {
      const list = [createQuestion({ type: "text", label: "Name?", id: "q1" })];
      expect(validateQuestionList(list).valid).toBe(true);
    });
    it("missing label", () => {
      const list = [createQuestion({ type: "text", id: "q1" })];
      expect(validateQuestionList(list).valid).toBe(false);
    });
    it("duplicate ids", () => {
      const a = createQuestion({ type: "text", label: "A", id: "dup" });
      const b = createQuestion({ type: "text", label: "B", id: "dup" });
      const result = validateQuestionList([a, b]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("duplicate"))).toBe(true);
    });
    it("choice without choices", () => {
      const q = { id: "c1", type: "choice", label: "Pick", choices: [] };
      expect(validateQuestionList([q]).valid).toBe(false);
    });
  });
});
