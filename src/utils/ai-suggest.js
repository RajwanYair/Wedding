/**
 * src/utils/ai-suggest.js — AI suggestion engine for sections (S672)
 *
 * @module ai-suggest
 * @owner analytics
 */

/**
 * @typedef {"seating"|"menu"|"vendor"|"budget"|"timeline"} SuggestionDomain
 */

/**
 * @typedef {object} Suggestion
 * @property {string} id
 * @property {SuggestionDomain} domain
 * @property {string} title
 * @property {string} description
 * @property {number} confidence
 * @property {"low"|"medium"|"high"} priority
 * @property {boolean} dismissed
 * @property {boolean} applied
 */

let _idCounter = 0;

/** Reset ID counter - testing only. */
export function resetIdCounter(start = 0) {
  _idCounter = start;
}

/**
 * Create a suggestion.
 * @param {object} params
 * @param {SuggestionDomain} params.domain
 * @param {string} params.title
 * @param {string} params.description
 * @param {number} [params.confidence]
 * @param {"low"|"medium"|"high"} [params.priority]
 * @returns {Suggestion}
 */
export function createSuggestion({ domain, title, description, confidence, priority }) {
  return {
    id: `sug_${++_idCounter}`,
    domain,
    title: (title || "").trim(),
    description: (description || "").trim(),
    confidence: Math.min(1, Math.max(0, confidence ?? 0.5)),
    priority: priority || "medium",
    dismissed: false,
    applied: false,
  };
}

/**
 * Dismiss a suggestion.
 * @param {Suggestion} suggestion
 * @returns {Suggestion}
 */
export function dismissSuggestion(suggestion) {
  return { ...suggestion, dismissed: true };
}

/**
 * Mark suggestion as applied.
 * @param {Suggestion} suggestion
 * @returns {Suggestion}
 */
export function applySuggestion(suggestion) {
  return { ...suggestion, applied: true };
}

/**
 * Generate seating suggestions based on guest relationships.
 * @param {Array<{ id: string, name: string, group?: string, plusOne?: boolean }>} guests
 * @param {number} tableSize
 * @returns {Suggestion[]}
 */
export function suggestSeating(guests, tableSize) {
  const suggestions = [];
  const groups = {};

  for (const g of guests) {
    const key = g.group || "ungrouped";
    if (!groups[key]) groups[key] = [];
    groups[key].push(g);
  }

  for (const [group, members] of Object.entries(groups)) {
    if (group === "ungrouped") continue;
    if (members.length > tableSize) {
      suggestions.push(
        createSuggestion({
          domain: "seating",
          title: `Split group "${group}"`,
          description: `Group "${group}" has ${members.length} members but table fits ${tableSize}. Consider splitting.`,
          confidence: 0.8,
          priority: "high",
        })
      );
    }
  }

  const ungrouped = groups.ungrouped || [];
  if (ungrouped.length > 0) {
    suggestions.push(
      createSuggestion({
        domain: "seating",
        title: "Assign ungrouped guests",
        description: `${ungrouped.length} guests have no group assignment.`,
        confidence: 0.6,
        priority: "medium",
      })
    );
  }

  return suggestions;
}

/**
 * Generate budget suggestions.
 * @param {object} params
 * @param {number} params.totalBudget
 * @param {number} params.spent
 * @param {number} params.committed
 * @param {number} params.guestCount
 * @returns {Suggestion[]}
 */
export function suggestBudget({ totalBudget, spent, committed, guestCount }) {
  const suggestions = [];
  const remaining = totalBudget - spent - committed;
  const perGuest = guestCount > 0 ? totalBudget / guestCount : 0;

  if (remaining < 0) {
    suggestions.push(
      createSuggestion({
        domain: "budget",
        title: "Over budget",
        description: `You are ₪${Math.abs(Math.round(remaining))} over budget.`,
        confidence: 1,
        priority: "high",
      })
    );
  } else if (remaining < totalBudget * 0.1) {
    suggestions.push(
      createSuggestion({
        domain: "budget",
        title: "Budget nearly exhausted",
        description: `Only ₪${Math.round(remaining)} remaining (${Math.round((remaining / totalBudget) * 100)}%).`,
        confidence: 0.9,
        priority: "high",
      })
    );
  }

  if (perGuest > 800) {
    suggestions.push(
      createSuggestion({
        domain: "budget",
        title: "High per-guest cost",
        description: `Cost per guest is ₪${Math.round(perGuest)}. Average wedding is ₪400-600.`,
        confidence: 0.7,
        priority: "low",
      })
    );
  }

  return suggestions;
}

/**
 * Generate vendor suggestions.
 * @param {Array<{ id: string, name: string, paid: number, total: number, dueDate?: number }>} vendors
 * @param {number} [now]
 * @returns {Suggestion[]}
 */
export function suggestVendor(vendors, now = Date.now()) {
  const suggestions = [];

  for (const v of vendors) {
    const remaining = v.total - v.paid;
    if (remaining > 0 && v.dueDate && v.dueDate < now) {
      suggestions.push(
        createSuggestion({
          domain: "vendor",
          title: `Payment overdue: ${v.name}`,
          description: `₪${remaining} overdue for ${v.name}.`,
          confidence: 1,
          priority: "high",
        })
      );
    }
    if (v.paid === 0 && v.total > 0) {
      suggestions.push(
        createSuggestion({
          domain: "vendor",
          title: `No deposit: ${v.name}`,
          description: `Consider paying deposit to secure ${v.name}.`,
          confidence: 0.6,
          priority: "medium",
        })
      );
    }
  }

  return suggestions;
}

/**
 * Filter active (non-dismissed, non-applied) suggestions.
 * @param {Suggestion[]} suggestions
 * @returns {Suggestion[]}
 */
export function getActiveSuggestions(suggestions) {
  return suggestions.filter((s) => !s.dismissed && !s.applied);
}

/**
 * Sort suggestions by priority then confidence.
 * @param {Suggestion[]} suggestions
 * @returns {Suggestion[]}
 */
export function sortSuggestions(suggestions) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return [...suggestions].sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return b.confidence - a.confidence;
  });
}

/**
 * Get suggestion stats.
 * @param {Suggestion[]} suggestions
 * @returns {{ total: number, active: number, dismissed: number, applied: number, highPriority: number }}
 */
export function getSuggestionStats(suggestions) {
  let active = 0;
  let dismissed = 0;
  let applied = 0;
  let highPriority = 0;

  for (const s of suggestions) {
    if (s.applied) applied++;
    else if (s.dismissed) dismissed++;
    else active++;
    if (s.priority === "high" && !s.dismissed && !s.applied) highPriority++;
  }

  return { total: suggestions.length, active, dismissed, applied, highPriority };
}
