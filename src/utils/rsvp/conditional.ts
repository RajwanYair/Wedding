/**
 * src/utils/rsvp/conditional.ts — Conditional RSVP questions (S679, from conditional-rsvp.js)
 *
 * @module rsvp/conditional
 * @owner rsvp
 */

export type RsvpQuestionType = "text" | "select" | "multiselect" | "boolean" | "number";
export type RsvpOperator = "equals" | "not_equals" | "contains" | "gt" | "lt";

export interface RsvpCondition {
  questionId: string;
  operator: RsvpOperator;
  value: string | number | boolean;
}

export interface RsvpQuestion {
  id: string;
  label: string;
  type: RsvpQuestionType;
  options: string[];
  required: boolean;
  condition: RsvpCondition | null;
}

export interface RsvpAnswer {
  questionId: string;
  value: string | number | boolean | string[];
}

let _idCounter = 0;

/** Reset ID counter — testing only. */
export function resetIdCounter(start = 0): void {
  _idCounter = start;
}

export function createQuestion({
  label,
  type,
  options,
  required,
  condition,
}: {
  label: string;
  type: RsvpQuestionType;
  options?: string[];
  required?: boolean;
  condition?: RsvpCondition | null;
}): RsvpQuestion {
  return {
    id: `q_${++_idCounter}`,
    label: (label || "").trim(),
    type,
    options: options || [],
    required: required ?? false,
    condition: condition || null,
  };
}

export function evaluateCondition(
  condition: RsvpCondition,
  answers: RsvpAnswer[],
): boolean {
  const answer = answers.find((a) => a.questionId === condition.questionId);
  if (!answer) return false;

  const val = answer.value;
  const target = condition.value;

  switch (condition.operator) {
    case "equals":
      return val === target || String(val) === String(target);
    case "not_equals":
      return val !== target && String(val) !== String(target);
    case "contains":
      if (Array.isArray(val)) return val.includes(String(target));
      return String(val).includes(String(target));
    case "gt":
      return Number(val) > Number(target);
    case "lt":
      return Number(val) < Number(target);
    default:
      return false;
  }
}

export function getVisibleQuestions(
  questions: RsvpQuestion[],
  answers: RsvpAnswer[],
): RsvpQuestion[] {
  return questions.filter((q) => {
    if (!q.condition) return true;
    return evaluateCondition(q.condition, answers);
  });
}

export function validateAnswers(
  questions: RsvpQuestion[],
  answers: RsvpAnswer[],
): { valid: boolean; missing: string[] } {
  const visible = getVisibleQuestions(questions, answers);
  const required = visible.filter((q) => q.required);
  const missing: string[] = [];

  for (const q of required) {
    const answer = answers.find((a) => a.questionId === q.id);
    if (!answer) {
      missing.push(q.id);
      continue;
    }
    const val = answer.value;
    if (val === "" || val === null || val === undefined) {
      missing.push(q.id);
    } else if (Array.isArray(val) && val.length === 0) {
      missing.push(q.id);
    }
  }

  return { valid: missing.length === 0, missing };
}

export function buildDependencyGraph(
  questions: RsvpQuestion[],
): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const q of questions) {
    if (q.condition) {
      const parent = q.condition.questionId;
      if (!graph[parent]) graph[parent] = [];
      graph[parent].push(q.id);
    }
  }
  return graph;
}

export function hasCircularDependency(questions: RsvpQuestion[]): boolean {
  const graph = buildDependencyGraph(questions);
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (stack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    stack.add(nodeId);
    for (const child of graph[nodeId] || []) {
      if (dfs(child)) return true;
    }
    stack.delete(nodeId);
    return false;
  }

  for (const q of questions) {
    if (dfs(q.id)) return true;
  }
  return false;
}

export function topologicalSort(questions: RsvpQuestion[]): RsvpQuestion[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const sorted: RsvpQuestion[] = [];
  const visited = new Set<string>();

  function visit(q: RsvpQuestion): void {
    if (visited.has(q.id)) return;
    visited.add(q.id);
    if (q.condition) {
      const parent = byId.get(q.condition.questionId);
      if (parent) visit(parent);
    }
    sorted.push(q);
  }

  for (const q of questions) visit(q);
  return sorted;
}

export function getFormComplexity(questions: RsvpQuestion[]): {
  total: number;
  conditional: number;
  required: number;
  maxDepth: number;
} {
  const graph = buildDependencyGraph(questions);

  function depth(id: string): number {
    const children = graph[id] || [];
    if (children.length === 0) return 0;
    return 1 + Math.max(...children.map(depth));
  }

  const roots = questions.filter((q) => !q.condition);
  const maxDepth = roots.length === 0 ? 0 : Math.max(...roots.map((r) => depth(r.id)));

  return {
    total: questions.length,
    conditional: questions.filter((q) => q.condition !== null).length,
    required: questions.filter((q) => q.required).length,
    maxDepth,
  };
}
