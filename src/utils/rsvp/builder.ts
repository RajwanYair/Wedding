/**
 * src/utils/rsvp/builder.ts — RSVP question builder CRUD (S679, from rsvp-question-builder.js)
 *
 * @module rsvp/builder
 * @owner rsvp
 */

import type { Cond, Question } from "./engine.js";

export type { Cond, Question };

const VALID_TYPES = ["text", "choice", "number", "boolean"] as const;

let _nextId = 1;

export function nextQuestionId(prefix = "q"): string {
  return `${prefix}_${_nextId++}`;
}

export function resetIdCounter(start = 1): void {
  _nextId = start;
}

export function createQuestion(data: Partial<Question> & { type: Question["type"] }): Question {
  const type = (VALID_TYPES as readonly string[]).includes(data.type) ? data.type : "text";
  return {
    id: data.id || nextQuestionId(),
    type,
    label: data.label || "",
    required: data.required ?? false,
    ...(type === "choice" && data.choices ? { choices: [...data.choices] } : {}),
    ...(data.showWhen ? { showWhen: data.showWhen } : {}),
  };
}

export function addQuestion(questions: Question[], question: Question): Question[] {
  if (!Array.isArray(questions)) return [question];
  if (questions.some((q) => q.id === question.id)) return questions;
  return [...questions, question];
}

export function removeQuestion(questions: Question[], id: string): Question[] {
  if (!Array.isArray(questions)) return [];
  return questions.filter((q) => q.id !== id);
}

export function updateQuestion(
  questions: Question[],
  id: string,
  updates: Partial<Question>,
): Question[] {
  if (!Array.isArray(questions)) return [];
  const idx = questions.findIndex((q) => q.id === id);
  if (idx === -1) return questions;
  const merged = { ...questions[idx], ...updates, id };
  const result = [...questions];
  result[idx] = merged;
  return result;
}

export function moveQuestion(
  questions: Question[],
  fromIndex: number,
  toIndex: number,
): Question[] {
  if (!Array.isArray(questions)) return [];
  if (fromIndex < 0 || fromIndex >= questions.length) return questions;
  if (toIndex < 0 || toIndex >= questions.length) return questions;
  if (fromIndex === toIndex) return questions;
  const result = [...questions];
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item!);
  return result;
}

export function condEquals(
  questionId: string,
  value: unknown,
): { equals: { id: string; value: unknown } } {
  return { equals: { id: questionId, value } };
}

export function condExists(questionId: string): { exists: string } {
  return { exists: questionId };
}

export function condAll(conditions: object[]): { all: object[] } {
  return { all: conditions };
}

export function condAny(conditions: object[]): { any: object[] } {
  return { any: conditions };
}

export function duplicateQuestion(question: Question): Question {
  return createQuestion({ ...question, id: nextQuestionId() });
}

export function validateQuestionList(questions: Question[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!Array.isArray(questions)) return { valid: false, errors: ["questions must be an array"] };
  const ids = new Set<string>();
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
