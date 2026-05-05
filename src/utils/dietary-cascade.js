/**
 * src/utils/dietary-cascade.js — S624 RSVP dietary cascade
 *
 * Pure helpers that wire the conditional RSVP question engine (S598)
 * with dietary follow-up questions. When a guest selects a meal type,
 * cascade questions appear: allergy details, spice preference, kids
 * meals for plus-ones, etc.
 *
 * @module dietary-cascade
 * @owner rsvp
 */

/**
 * @typedef {object} DietaryCascadeRule
 * @property {string}  triggerMeal     // e.g. "vegetarian", "vegan", "fish"
 * @property {string}  questionId      // ID of the follow-up question
 * @property {string}  label           // question label
 * @property {"text"|"choice"|"boolean"} type
 * @property {string[]=} choices
 * @property {boolean=} required
 */

/** Standard dietary cascade rules. */
export const DEFAULT_CASCADE_RULES = /** @type {readonly DietaryCascadeRule[]} */ ([
  {
    triggerMeal: "vegetarian",
    questionId: "diet_veg_vegan",
    label: "Would you like the vegan option instead?",
    type: "boolean",
  },
  {
    triggerMeal: "vegan",
    questionId: "diet_vegan_gluten",
    label: "Gluten-free needed?",
    type: "boolean",
  },
  {
    triggerMeal: "fish",
    questionId: "diet_fish_type",
    label: "Fish preference",
    type: "choice",
    choices: ["salmon", "sea bass", "no preference"],
  },
  {
    triggerMeal: "*",
    questionId: "diet_allergies",
    label: "Any food allergies?",
    type: "text",
  },
  {
    triggerMeal: "*",
    questionId: "diet_spice",
    label: "Spice level",
    type: "choice",
    choices: ["mild", "medium", "spicy"],
  },
]);

/**
 * Given a selected meal type, return the list of follow-up questions
 * that should appear (from cascade rules).
 *
 * @param {string} selectedMeal
 * @param {readonly DietaryCascadeRule[]} [rules]
 * @returns {DietaryCascadeRule[]}
 */
export function getCascadeQuestions(selectedMeal, rules) {
  const r = Array.isArray(rules) ? rules : DEFAULT_CASCADE_RULES;
  if (typeof selectedMeal !== "string" || selectedMeal.trim() === "") return [];
  const meal = selectedMeal.trim().toLowerCase();
  return r.filter((rule) => rule.triggerMeal === meal || rule.triggerMeal === "*");
}

/**
 * Expand dietary cascade for multiple guests (plus-ones). Returns a flat
 * list of { guestIndex, question } pairs.
 *
 * @param {readonly string[]} meals — meal selection per guest
 * @param {readonly DietaryCascadeRule[]} [rules]
 * @returns {Array<{ guestIndex: number, question: DietaryCascadeRule }>}
 */
export function expandPlusOneCascade(meals, rules) {
  if (!Array.isArray(meals)) return [];
  const result = [];
  for (let i = 0; i < meals.length; i++) {
    const questions = getCascadeQuestions(meals[i], rules);
    for (const q of questions) {
      result.push({ guestIndex: i, question: q });
    }
  }
  return result;
}

/**
 * Check if all required cascade answers are present.
 *
 * @param {readonly DietaryCascadeRule[]} questions
 * @param {Record<string, unknown>} answers — keyed by questionId
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateCascadeAnswers(questions, answers) {
  const missing = [];
  if (!Array.isArray(questions)) return { valid: true, missing };
  const ans = answers && typeof answers === "object" ? answers : {};
  for (const q of questions) {
    if (!q.required) continue;
    const val = ans[q.questionId];
    if (val === undefined || val === null || val === "") {
      missing.push(q.questionId);
    }
  }
  return { valid: missing.length === 0, missing };
}

/**
 * Build a summary of dietary cascade answers for kitchen use.
 *
 * @param {Record<string, unknown>} answers
 * @param {readonly DietaryCascadeRule[]} questions
 * @returns {Array<{ label: string, value: string }>}
 */
export function buildCascadeSummary(answers, questions) {
  if (!answers || typeof answers !== "object" || !Array.isArray(questions)) return [];
  const summary = [];
  for (const q of questions) {
    const val = answers[q.questionId];
    if (val !== undefined && val !== null && val !== "") {
      summary.push({ label: q.label, value: String(val) });
    }
  }
  return summary;
}
