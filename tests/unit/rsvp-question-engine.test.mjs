// @ts-check
/** tests/unit/rsvp-question-engine.test.mjs — S598 */
import { describe, it, expect } from "vitest";
import {
  evaluateCondition,
  visibleQuestions,
  validateAnswers,
  expandPlusOnes,
} from "../../src/utils/rsvp-question-engine.js";

/** @type {import("../../src/utils/rsvp-question-engine.js").Question[]} */
const questions = [
  { id: "attending", type: "boolean", label: "Are you coming?", required: true },
  {
    id: "meal",
    type: "choice",
    label: "Meal",
    required: true,
    choices: ["meat", "fish", "vegan"],
    showWhen: { equals: { id: "attending", value: true } },
  },
  {
    id: "dietary",
    type: "text",
    label: "Allergies?",
    showWhen: { all: [{ equals: { id: "attending", value: true } }, { equals: { id: "meal", value: "vegan" } }] },
  },
  {
    id: "regrets",
    type: "text",
    label: "Note?",
    showWhen: { not: { equals: { id: "attending", value: true } } },
  },
];

describe("S598 rsvp-question-engine", () => {
  it("evaluateCondition supports equals/all/any/not/exists", () => {
    expect(evaluateCondition({ equals: { id: "x", value: 1 } }, { x: 1 })).toBe(true);
    expect(evaluateCondition({ equals: { id: "x", value: 1 } }, { x: 2 })).toBe(false);
    expect(evaluateCondition({ all: [{ exists: "a" }, { exists: "b" }] }, { a: 1, b: 2 })).toBe(true);
    expect(evaluateCondition({ any: [{ exists: "a" }, { exists: "b" }] }, { a: 1 })).toBe(true);
    expect(evaluateCondition({ not: { exists: "a" } }, {})).toBe(true);
  });

  it("evaluateCondition treats malformed condition as visible", () => {
    expect(evaluateCondition(/** @type {any} */ ({ junk: true }), {})).toBe(true);
    expect(evaluateCondition(undefined, {})).toBe(true);
  });

  it("visibleQuestions hides meal when not attending", () => {
    const v = visibleQuestions(questions, { attending: false });
    expect(v.map((q) => q.id)).toEqual(["attending", "regrets"]);
  });

  it("visibleQuestions cascades vegan → dietary", () => {
    const v = visibleQuestions(questions, { attending: true, meal: "vegan" });
    expect(v.map((q) => q.id)).toEqual(["attending", "meal", "dietary"]);
  });

  it("validateAnswers reports missing required visible answers", () => {
    const r = validateAnswers(questions, { attending: true });
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual(["meal"]);
  });

  it("validateAnswers passes when all required answered", () => {
    const r = validateAnswers(questions, { attending: true, meal: "meat" });
    expect(r).toEqual({ valid: true, missing: [] });
  });

  it("expandPlusOnes produces N stubs", () => {
    const r = expandPlusOnes("g1", 2);
    expect(r).toEqual([
      { id: "g1__p1", parentId: "g1", index: 1, kind: "plus-one" },
      { id: "g1__p2", parentId: "g1", index: 2, kind: "plus-one" },
    ]);
  });

  it("expandPlusOnes handles 0 / invalid", () => {
    expect(expandPlusOnes("g1", 0)).toEqual([]);
    expect(expandPlusOnes("", 5)).toEqual([]);
    expect(expandPlusOnes("g1", /** @type {any} */ (1.5))).toEqual([]);
  });
});
