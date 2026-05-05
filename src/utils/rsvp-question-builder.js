/**
 * src/utils/rsvp-question-builder.js — S636 RSVP question builder CRUD
 *
 * Pure helpers for creating, editing, reordering, and removing custom
 * RSVP questions. Handles question lifecycle and conditional rule
 * construction.
 *
 * @module rsvp-question-builder
 * @owner sections
 */

/** @typedef {import('./rsvp-question-engine.js').Question} Question */

const VALID_TYPES = /** @type {const} */ (["text", "choice", "number", "boolean"]);

let _nextId = 1;

/**
 * Generate a unique question ID. Uses a monotonic counter with optional prefix.
 *
 * @param {string} [prefix="q"]
 * @returns {string}
 */
export function nextQuestionId(prefix = "q") {
  return `${prefix}_${_nextId++}`;
}

/**
 * Reset the ID counter (for testing).
 *
 * @param {number} [start=1]
 */
export function resetIdCounter(start = 1) {
  _nextId = start;
}

/**
 * Create a new question with defaults.
 *
 * @param {Partial<Question> & { type: Question["type"] }} data
 * @returns {Question}
 */
export function createQuestion(data) {
  const type = VALID_TYPES.includes(/** @type {any} */ (data.type)) ? data.type : "text";
  return {
    id: data.id || nextQuestionId(),
    type,
    label: data.label || "",
    required: data.required ?? false,
    ...(type === "choice" && data.choices ? { choices: [...data.choices] } : {}),
    ...(data.showWhen ? { showWhen: data.showWhen } : {}),
  };
}

/**
 * Add a question to the list.
 *
 * @param {Question[]} questions
 * @param {Question} question
 * @returns {Question[]}
 */
export function addQuestion(questions, question) {
  if (!Array.isArray(questions)) return [question];
  if (questions.some((q) => q.id === question.id)) return questions;
  return [...questions, question];
}

/**
 * Remove a question by ID.
 *
 * @param {Question[]} questions
 * @param {string} id
 * @returns {Question[]}
 */
export function removeQuestion(questions, id) {
  if (!Array.isArray(questions)) return [];
  return questions.filter((q) => q.id !== id);
}

/**
 * Update a question's properties (immutable).
 *
 * @param {Question[]} questions
 * @param {string} id
 * @param {Partial<Question>} updates
 * @returns {Question[]}
 */
export function updateQuestion(questions, id, updates) {
  if (!Array.isArray(questions)) return [];
  const idx = questions.findIndex((q) => q.id === id);
  if (idx === -1) return questions;
  const merged = { ...questions[idx], ...updates, id };
  const result = [...questions];
  result[idx] = merged;
  return result;
}

/**
 * Move a question from one index to another.
 *
 * @param {Question[]} questions
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {Question[]}
 */
export function moveQuestion(questions, fromIndex, toIndex) {
  if (!Array.isArray(questions)) return [];
  if (fromIndex < 0 || fromIndex >= questions.length) return questions;
  if (toIndex < 0 || toIndex >= questions.length) return questions;
  if (fromIndex === toIndex) return questions;
  const result = [...questions];
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item);
  return result;
}

/**
 * Build an "equals" condition for showWhen.
 *
 * @param {string} questionId
 * @param {unknown} value
 * @returns {{ equals: { id: string, value: unknown } }}
 */
export function condEquals(questionId, value) {
  return { equals: { id: questionId, value } };
}

/**
 * Build an "exists" condition for showWhen.
 *
 * @param {string} questionId
 * @returns {{ exists: string }}
 */
export function condExists(questionId) {
  return { exists: questionId };
}

/**
 * Combine conditions with AND.
 *
 * @param {object[]} conditions
 * @returns {{ all: object[] }}
 */
export function condAll(conditions) {
  return { all: conditions };
}

/**
 * Combine conditions with OR.
 *
 * @param {object[]} conditions
 * @returns {{ any: object[] }}
 */
export function condAny(conditions) {
  return { any: conditions };
}

/**
 * Duplicate a question with a new ID.
 *
 * @param {Question} question
 * @returns {Question}
 */
export function duplicateQuestion(question) {
  return createQuestion({ ...question, id: nextQuestionId() });
}

/**
 * Validate a question list for common issues.
 *
 * @param {Question[]} questions
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateQuestionList(questions) {
  const errors = [];
  if (!Array.isArray(questions)) return { valid: false, errors: ["questions must be an array"] };
  const ids = new Set();
  for (const q of questions) {
    if (!q.id) errors.push("question missing id");
    if (ids.has(q.id)) errors.push(`duplicate id: ${q.id}`);
    ids.add(q.id);
    if (!q.label) errors.push(`question ${q.id} has no label`);
    if (q.type === "choice" && (!q.choices || q.choices.length === 0)) {
      errors.push(`choice question ${q.id} has no choices`);
    }
  }
  return { valid: errors.length === 0, errors };
}
