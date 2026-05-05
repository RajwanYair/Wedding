/**
 * src/utils/rsvp-plusone-chain.js — S645 RSVP plus-one chain management
 *
 * Pure helpers for managing plus-one chains: generating sub-guest
 * entries, propagating answers, cascading dietary preferences,
 * and validating chain integrity.
 *
 * @module rsvp-plusone-chain
 * @owner rsvp
 */

let _idCounter = 0;

/** Reset ID counter (testing). */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

/**
 * @typedef {object} PlusOneEntry
 * @property {string} id
 * @property {string} parentGuestId
 * @property {string} name
 * @property {string} meal
 * @property {string} dietary
 * @property {Record<string, string>} answers — question-id → answer
 * @property {number} index — 1-based position in the chain
 */

/**
 * Create a plus-one entry linked to a parent guest.
 *
 * @param {string} parentGuestId
 * @param {string} name
 * @param {number} index
 * @returns {PlusOneEntry}
 */
export function createPlusOne(parentGuestId, name, index = 1) {
  return {
    id: `po_${++_idCounter}`,
    parentGuestId,
    name: name?.trim() || `Plus-One ${index}`,
    meal: "",
    dietary: "",
    answers: {},
    index,
  };
}

/**
 * Generate a chain of N plus-one entries for a guest.
 *
 * @param {string} parentGuestId
 * @param {number} count
 * @param {string[]} [names] - optional names for each plus-one
 * @returns {PlusOneEntry[]}
 */
export function generateChain(parentGuestId, count, names) {
  if (count <= 0) return [];
  const chain = [];
  for (let i = 0; i < count; i++) {
    chain.push(createPlusOne(parentGuestId, names?.[i] ?? "", i + 1));
  }
  return chain;
}

/**
 * Set a plus-one's answer and optionally propagate to siblings.
 *
 * @param {PlusOneEntry} entry
 * @param {string} questionId
 * @param {string} answer
 * @returns {PlusOneEntry}
 */
export function setAnswer(entry, questionId, answer) {
  if (!entry) return entry;
  return { ...entry, answers: { ...entry.answers, [questionId]: answer } };
}

/**
 * Propagate a parent's answer to all plus-ones in the chain.
 *
 * @param {PlusOneEntry[]} chain
 * @param {string} questionId
 * @param {string} answer
 * @returns {PlusOneEntry[]}
 */
export function propagateAnswer(chain, questionId, answer) {
  if (!Array.isArray(chain)) return [];
  return chain.map((e) => setAnswer(e, questionId, answer));
}

/**
 * Cascade meal choice from parent to all plus-ones.
 *
 * @param {PlusOneEntry[]} chain
 * @param {string} meal
 * @returns {PlusOneEntry[]}
 */
export function cascadeMeal(chain, meal) {
  if (!Array.isArray(chain)) return [];
  return chain.map((e) => ({ ...e, meal }));
}

/**
 * Cascade dietary restriction from parent.
 *
 * @param {PlusOneEntry[]} chain
 * @param {string} dietary
 * @returns {PlusOneEntry[]}
 */
export function cascadeDietary(chain, dietary) {
  if (!Array.isArray(chain)) return [];
  return chain.map((e) => ({ ...e, dietary }));
}

/**
 * Validate that all required questions are answered for each plus-one.
 *
 * @param {PlusOneEntry[]} chain
 * @param {string[]} requiredQuestionIds
 * @returns {{ valid: boolean, missing: { entryId: string, name: string, questionIds: string[] }[] }}
 */
export function validateChain(chain, requiredQuestionIds) {
  if (!Array.isArray(chain) || !Array.isArray(requiredQuestionIds)) return { valid: true, missing: [] };
  const missing = [];
  for (const entry of chain) {
    const unanswered = requiredQuestionIds.filter((q) => !entry.answers[q]);
    if (unanswered.length > 0) {
      missing.push({ entryId: entry.id, name: entry.name, questionIds: unanswered });
    }
  }
  return { valid: missing.length === 0, missing };
}

/**
 * Reorder a chain (after drag-drop). Returns re-indexed chain.
 *
 * @param {PlusOneEntry[]} chain
 * @param {number} fromIndex — 0-based
 * @param {number} toIndex — 0-based
 * @returns {PlusOneEntry[]}
 */
export function reorderChain(chain, fromIndex, toIndex) {
  if (!Array.isArray(chain)) return [];
  const copy = [...chain];
  const [moved] = copy.splice(fromIndex, 1);
  if (!moved) return copy;
  copy.splice(toIndex, 0, moved);
  return copy.map((e, i) => ({ ...e, index: i + 1 }));
}

/**
 * Remove a plus-one from the chain and re-index.
 *
 * @param {PlusOneEntry[]} chain
 * @param {string} entryId
 * @returns {PlusOneEntry[]}
 */
export function removePlusOne(chain, entryId) {
  if (!Array.isArray(chain)) return [];
  return chain.filter((e) => e.id !== entryId).map((e, i) => ({ ...e, index: i + 1 }));
}

/**
 * Chain summary for display.
 *
 * @param {PlusOneEntry[]} chain
 * @returns {{ total: number, named: number, withMeal: number, fullyAnswered: number }}
 */
export function chainSummary(chain) {
  if (!Array.isArray(chain)) return { total: 0, named: 0, withMeal: 0, fullyAnswered: 0 };
  return {
    total: chain.length,
    named: chain.filter((e) => e.name && !e.name.startsWith("Plus-One")).length,
    withMeal: chain.filter((e) => e.meal).length,
    fullyAnswered: chain.filter((e) => Object.keys(e.answers).length > 0).length,
  };
}
