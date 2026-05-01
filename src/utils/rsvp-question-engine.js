/**
 * src/utils/rsvp-question-engine.js — S598 Conditional RSVP questions
 *
 * Pure rule evaluator for the upcoming dynamic RSVP form. Each question
 * may declare a `showWhen` expression in a tiny safe DSL; the engine
 * computes the visible question list and validates required answers.
 *
 * DSL: { all?: Cond[], any?: Cond[], not?: Cond, equals?: { id, value }, exists?: string }
 *
 * @owner rsvp
 */

/**
 * @typedef {object} EqCond
 * @property {{ id: string, value: unknown }} equals
 *
 * @typedef {object} ExistsCond
 * @property {string} exists
 *
 * @typedef {object} AllCond
 * @property {Cond[]} all
 *
 * @typedef {object} AnyCond
 * @property {Cond[]} any
 *
 * @typedef {object} NotCond
 * @property {Cond} not
 *
 * @typedef {EqCond | ExistsCond | AllCond | AnyCond | NotCond} Cond
 */

/**
 * @typedef {object} Question
 * @property {string} id
 * @property {"text"|"choice"|"number"|"boolean"} type
 * @property {string} label
 * @property {boolean=} required
 * @property {readonly unknown[]} [choices]
 * @property {Cond=} showWhen
 */

/**
 * Evaluate a condition against a flat answers map.
 * Unknown / malformed conditions evaluate to `true` (i.e. show by
 * default) to keep authoring forgiving.
 *
 * @param {Cond | undefined} cond
 * @param {Record<string, unknown>} answers
 * @returns {boolean}
 */
export function evaluateCondition(cond, answers) {
  if (!cond || typeof cond !== "object") return true;
  if ("all" in cond && Array.isArray(cond.all)) {
    return cond.all.every((c) => evaluateCondition(c, answers));
  }
  if ("any" in cond && Array.isArray(cond.any)) {
    return cond.any.some((c) => evaluateCondition(c, answers));
  }
  if ("not" in cond) {
    return !evaluateCondition(cond.not, answers);
  }
  if ("equals" in cond && cond.equals && typeof cond.equals.id === "string") {
    return answers[cond.equals.id] === cond.equals.value;
  }
  if ("exists" in cond && typeof cond.exists === "string") {
    const v = answers[cond.exists];
    return v !== undefined && v !== null && v !== "";
  }
  return true;
}

/**
 * Compute the ordered list of visible questions for the supplied answers.
 *
 * @param {readonly Question[]} questions
 * @param {Record<string, unknown>} answers
 * @returns {Question[]}
 */
export function visibleQuestions(questions, answers) {
  if (!Array.isArray(questions)) return [];
  return questions.filter((q) => evaluateCondition(q.showWhen, answers));
}

/**
 * Validate answers against currently-visible required questions.
 *
 * @param {readonly Question[]} questions
 * @param {Record<string, unknown>} answers
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateAnswers(questions, answers) {
  const missing = visibleQuestions(questions, answers)
    .filter((q) => q.required)
    .filter((q) => {
      const v = answers[q.id];
      return v === undefined || v === null || v === "";
    })
    .map((q) => q.id);
  return { valid: missing.length === 0, missing };
}

/**
 * Expand a plus-one count into N synthetic guest stubs the seating
 * planner can later promote to full guest records.
 *
 * @param {string} primaryGuestId
 * @param {number} plusOnes
 * @returns {Array<{ id: string, parentId: string, index: number, kind: "plus-one" }>}
 */
export function expandPlusOnes(primaryGuestId, plusOnes) {
  if (!primaryGuestId || !Number.isInteger(plusOnes) || plusOnes <= 0) return [];
  return Array.from({ length: plusOnes }, (_, i) => ({
    id: `${primaryGuestId}__p${i + 1}`,
    parentId: primaryGuestId,
    index: i + 1,
    kind: /** @type {const} */ ("plus-one"),
  }));
}
