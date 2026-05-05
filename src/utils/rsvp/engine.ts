/**
 * src/utils/rsvp/engine.ts — Conditional RSVP question engine (S679, from rsvp-question-engine.js)
 *
 * DSL: { all?: Cond[], any?: Cond[], not?: Cond, equals?: { id, value }, exists?: string }
 *
 * @module rsvp/engine
 * @owner rsvp
 */

export interface EqCond {
  equals: { id: string; value: unknown };
}
export interface ExistsCond {
  exists: string;
}
export interface AllCond {
  all: Cond[];
}
export interface AnyCond {
  any: Cond[];
}
export interface NotCond {
  not: Cond;
}
export type Cond = EqCond | ExistsCond | AllCond | AnyCond | NotCond;

export interface Question {
  id: string;
  type: "text" | "choice" | "number" | "boolean";
  label: string;
  required?: boolean;
  choices?: readonly unknown[];
  showWhen?: Cond;
}

export function evaluateCondition(
  cond: Cond | undefined,
  answers: Record<string, unknown>,
): boolean {
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

export function visibleQuestions(
  questions: readonly Question[],
  answers: Record<string, unknown>,
): Question[] {
  if (!Array.isArray(questions)) return [];
  return questions.filter((q) => evaluateCondition(q.showWhen, answers));
}

export function validateAnswers(
  questions: readonly Question[],
  answers: Record<string, unknown>,
): { valid: boolean; missing: string[] } {
  const missing = visibleQuestions(questions, answers)
    .filter((q) => q.required)
    .filter((q) => {
      const v = answers[q.id];
      return v === undefined || v === null || v === "";
    })
    .map((q) => q.id);
  return { valid: missing.length === 0, missing };
}

export function expandPlusOnes(
  primaryGuestId: string,
  plusOnes: number,
): Array<{ id: string; parentId: string; index: number; kind: "plus-one" }> {
  if (!primaryGuestId || !Number.isInteger(plusOnes) || plusOnes <= 0) return [];
  return Array.from({ length: plusOnes }, (_, i) => ({
    id: `${primaryGuestId}__p${i + 1}`,
    parentId: primaryGuestId,
    index: i + 1,
    kind: "plus-one" as const,
  }));
}
