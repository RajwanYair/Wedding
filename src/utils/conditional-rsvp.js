/**
 * src/utils/conditional-rsvp.js — Conditional RSVP questions with branching logic (S665)
 *
 * @module conditional-rsvp
 * @owner rsvp
 */

/**
 * @typedef {object} RsvpQuestion
 * @property {string} id
 * @property {string} label
 * @property {"text"|"select"|"multiselect"|"boolean"|"number"} type
 * @property {string[]} [options]
 * @property {boolean} required
 * @property {RsvpCondition|null} condition
 */

/**
 * @typedef {object} RsvpCondition
 * @property {string} questionId
 * @property {"equals"|"not_equals"|"contains"|"gt"|"lt"} operator
 * @property {string|number|boolean} value
 */

/**
 * @typedef {object} RsvpAnswer
 * @property {string} questionId
 * @property {string|number|boolean|string[]} value
 */

let _idCounter = 0;

/** Reset ID counter - testing only. */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

/**
 * Create a question.
 * @param {object} params
 * @param {string} params.label
 * @param {"text"|"select"|"multiselect"|"boolean"|"number"} params.type
 * @param {string[]} [params.options]
 * @param {boolean} [params.required]
 * @param {RsvpCondition|null} [params.condition]
 * @returns {RsvpQuestion}
 */
export function createQuestion({ label, type, options, required, condition }) {
  return {
    id: `q_${++_idCounter}`,
    label: (label || "").trim(),
    type,
    options: options || [],
    required: required ?? false,
    condition: condition || null,
  };
}

/**
 * Evaluate whether a condition is met based on current answers.
 * @param {RsvpCondition} condition
 * @param {RsvpAnswer[]} answers
 * @returns {boolean}
 */
export function evaluateCondition(condition, answers) {
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

/**
 * Get visible questions based on current answers (evaluates conditions).
 * @param {RsvpQuestion[]} questions
 * @param {RsvpAnswer[]} answers
 * @returns {RsvpQuestion[]}
 */
export function getVisibleQuestions(questions, answers) {
  return questions.filter((q) => {
    if (!q.condition) return true;
    return evaluateCondition(q.condition, answers);
  });
}

/**
 * Validate answers against visible required questions.
 * @param {RsvpQuestion[]} questions
 * @param {RsvpAnswer[]} answers
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateAnswers(questions, answers) {
  const visible = getVisibleQuestions(questions, answers);
  const required = visible.filter((q) => q.required);
  const missing = [];

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

/**
 * Build question dependency graph.
 * @param {RsvpQuestion[]} questions
 * @returns {Record<string, string[]>}
 */
export function buildDependencyGraph(questions) {
  /** @type {Record<string, string[]>} */
  const graph = {};
  for (const q of questions) {
    if (q.condition) {
      const parent = q.condition.questionId;
      if (!graph[parent]) graph[parent] = [];
      graph[parent].push(q.id);
    }
  }
  return graph;
}

/**
 * Detect circular dependencies.
 * @param {RsvpQuestion[]} questions
 * @returns {boolean}
 */
export function hasCircularDependency(questions) {
  const graph = buildDependencyGraph(questions);
  const visited = new Set();
  const stack = new Set();

  /** @param {string} nodeId */
  function dfs(nodeId) {
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

/**
 * Reorder questions so parents always come before children.
 * @param {RsvpQuestion[]} questions
 * @returns {RsvpQuestion[]}
 */
export function topologicalSort(questions) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const sorted = [];
  const visited = new Set();

  /** @param {RsvpQuestion} q */
  function visit(q) {
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

/**
 * Get summary of conditional form complexity.
 * @param {RsvpQuestion[]} questions
 * @returns {{ total: number, conditional: number, required: number, maxDepth: number }}
 */
export function getFormComplexity(questions) {
  const graph = buildDependencyGraph(questions);

  /** @param {string} id */
  function depth(id) {
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
