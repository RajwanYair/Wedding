/**
 * src/utils/guest/index.ts — Guest domain module (S678)
 *
 * Consolidated from:
 *   guest-seating-auto.js  · dietary-cascade.js
 *   dietary-summary.js     · rsvp-plusone-chain.js
 *
 * @module guest
 * @owner guest
 */

// ── Seating types ─────────────────────────────────────────────────────────

export interface SeatGuest {
  id: string;
  name: string;
  group: string | null;
  tableId: string | null;
  preferNear: string[];
  avoidNear: string[];
}

export interface SeatTable {
  id: string;
  label: string;
  capacity: number;
  assigned: string[];
}

export interface Constraint {
  type: "near" | "avoid" | "same-table" | "different-table";
  guestA: string;
  guestB: string;
  weight: number;
}

export interface AssignmentResult {
  tables: SeatTable[];
  unassigned: string[];
  score: number;
  violationCount: number;
}

// ── Dietary cascade types ─────────────────────────────────────────────────

export interface DietaryCascadeRule {
  triggerMeal: string;
  questionId: string;
  label: string;
  type: "text" | "choice" | "boolean";
  choices?: string[];
  required?: boolean;
}

// ── Dietary summary types ─────────────────────────────────────────────────

export interface DietaryGuest {
  id: string;
  meal?: string;
  allergies?: string[];
  seats?: number;
  status?: string;
}

export interface DietarySummary {
  totalSeats: number;
  byMeal: Record<string, number>;
  byAllergy: Record<string, number>;
  topAllergies: Array<{ key: string; count: number }>;
}

// ── Plus-one chain types ──────────────────────────────────────────────────

export interface PlusOneEntry {
  id: string;
  parentGuestId: string;
  name: string;
  meal: string;
  dietary: string;
  answers: Record<string, string>;
  index: number;
}

// ── Private state ─────────────────────────────────────────────────────────

let _idCounter = 0;

// ── Seating exports ───────────────────────────────────────────────────────

export function createSeatGuest({
  id,
  name,
  group,
  preferNear,
  avoidNear,
}: {
  id: string;
  name: string;
  group?: string | null;
  preferNear?: string[];
  avoidNear?: string[];
}): SeatGuest {
  return {
    id,
    name: (name || "").trim(),
    group: group || null,
    tableId: null,
    preferNear: preferNear || [],
    avoidNear: avoidNear || [],
  };
}

export function createSeatTable({
  id,
  label,
  capacity,
}: {
  id: string;
  label: string;
  capacity: number;
}): SeatTable {
  return {
    id,
    label: (label || "").trim(),
    capacity: Math.max(1, capacity || 8),
    assigned: [],
  };
}

export function extractConstraints(guests: SeatGuest[]): Constraint[] {
  const constraints: Constraint[] = [];
  const seen = new Set<string>();

  for (const g of guests) {
    for (const near of g.preferNear) {
      const key = [g.id, near].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        constraints.push({ type: "near", guestA: g.id, guestB: near, weight: 1 });
      }
    }
    for (const avoid of g.avoidNear) {
      const key = `avoid-${[g.id, avoid].sort().join("-")}`;
      if (!seen.has(key)) {
        seen.add(key);
        constraints.push({ type: "avoid", guestA: g.id, guestB: avoid, weight: 2 });
      }
    }
  }

  return constraints;
}

export function calculateScore(tables: SeatTable[], guests: SeatGuest[]): number {
  let score = 0;
  const guestMap = new Map(guests.map((g) => [g.id, g]));

  for (const table of tables) {
    const tableSet = new Set(table.assigned);

    for (const gId of table.assigned) {
      const guest = guestMap.get(gId);
      if (!guest) continue;

      for (const near of guest.preferNear) {
        if (tableSet.has(near)) score++;
      }
      for (const avoid of guest.avoidNear) {
        if (tableSet.has(avoid)) score -= 2;
      }
    }

    const groupCounts: Record<string, number> = {};
    for (const gId of table.assigned) {
      const guest = guestMap.get(gId);
      if (guest?.group) {
        groupCounts[guest.group] = (groupCounts[guest.group] || 0) + 1;
      }
    }
    for (const count of Object.values(groupCounts)) {
      if (count > 1) score += count;
    }
  }

  return score;
}

export function countViolations(tables: SeatTable[], guests: SeatGuest[]): number {
  let violations = 0;
  const guestMap = new Map(guests.map((g) => [g.id, g]));

  for (const table of tables) {
    const tableSet = new Set(table.assigned);
    for (const gId of table.assigned) {
      const guest = guestMap.get(gId);
      if (!guest) continue;
      for (const avoid of guest.avoidNear) {
        if (tableSet.has(avoid)) violations++;
      }
    }
  }

  return violations;
}

export function autoAssign(guests: SeatGuest[], tables: SeatTable[]): AssignmentResult {
  const tableCopies = tables.map((t) => ({ ...t, assigned: [...t.assigned] }));
  const unassigned: string[] = [];

  const groups: Record<string, SeatGuest[]> = {};
  const ungrouped: SeatGuest[] = [];

  for (const g of guests) {
    if (g.group) {
      if (!groups[g.group]) groups[g.group] = [];
      groups[g.group].push(g);
    } else {
      ungrouped.push(g);
    }
  }

  const sortedGroups = Object.entries(groups).sort((a, b) => {
    // Family group always gets priority seating
    const PRIORITY: Record<string, number> = { family: 10 };
    const pa = PRIORITY[a[0]] ?? 0;
    const pb = PRIORITY[b[0]] ?? 0;
    if (pb !== pa) return pb - pa;
    return b[1].length - a[1].length;
  });

  for (const [_groupName, members] of sortedGroups) {
    const table = tableCopies.find((t) => t.capacity - t.assigned.length >= members.length);
    if (table) {
      for (const m of members) {
        table.assigned.push(m.id);
      }
    } else {
      const remaining = [...members];
      for (const t of tableCopies) {
        const space = t.capacity - t.assigned.length;
        if (space > 0 && remaining.length > 0) {
          const batch = remaining.splice(0, space);
          for (const m of batch) {
            t.assigned.push(m.id);
          }
        }
      }
      unassigned.push(...remaining.map((m) => m.id));
    }
  }

  for (const g of ungrouped) {
    const table = tableCopies.find((t) => t.capacity - t.assigned.length > 0);
    if (table) {
      table.assigned.push(g.id);
    } else {
      unassigned.push(g.id);
    }
  }

  const score = calculateScore(tableCopies, guests);
  const violationCount = countViolations(tableCopies, guests);

  return { tables: tableCopies, unassigned, score, violationCount };
}

export function getSeatingStats(
  tables: SeatTable[],
  guests: SeatGuest[],
): {
  totalGuests: number;
  seated: number;
  unassigned: number;
  tableUtilization: number;
  avgOccupancy: number;
} {
  const seated = tables.reduce((s, t) => s + t.assigned.length, 0);
  const totalCapacity = tables.reduce((s, t) => s + t.capacity, 0);
  const utilization = totalCapacity > 0 ? Math.round((seated / totalCapacity) * 100) : 0;
  const avgOccupancy = tables.length > 0 ? Math.round(seated / tables.length) : 0;

  return {
    totalGuests: guests.length,
    seated,
    unassigned: guests.length - seated,
    tableUtilization: utilization,
    avgOccupancy,
  };
}

// ── Dietary cascade exports ───────────────────────────────────────────────

export const DEFAULT_CASCADE_RULES: readonly DietaryCascadeRule[] = [
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
];

export function getCascadeQuestions(
  selectedMeal: string,
  rules?: readonly DietaryCascadeRule[],
): DietaryCascadeRule[] {
  const r = Array.isArray(rules) ? rules : DEFAULT_CASCADE_RULES;
  if (typeof selectedMeal !== "string" || selectedMeal.trim() === "") return [];
  const meal = selectedMeal.trim().toLowerCase();
  return r.filter((rule) => rule.triggerMeal === meal || rule.triggerMeal === "*");
}

export function expandPlusOneCascade(
  meals: readonly string[],
  rules?: readonly DietaryCascadeRule[],
): Array<{ guestIndex: number; question: DietaryCascadeRule }> {
  if (!Array.isArray(meals)) return [];
  const result: Array<{ guestIndex: number; question: DietaryCascadeRule }> = [];
  for (let i = 0; i < meals.length; i++) {
    const questions = getCascadeQuestions(meals[i], rules);
    for (const q of questions) {
      result.push({ guestIndex: i, question: q });
    }
  }
  return result;
}

export function validateCascadeAnswers(
  questions: readonly DietaryCascadeRule[],
  answers: Record<string, unknown>,
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!Array.isArray(questions)) return { valid: true, missing };
  const ans = answers && typeof answers === "object" ? answers : {};
  for (const q of questions) {
    if (!q.required) continue;
    const val = (ans as Record<string, unknown>)[q.questionId];
    if (val === undefined || val === null || val === "") {
      missing.push(q.questionId);
    }
  }
  return { valid: missing.length === 0, missing };
}

export function buildCascadeSummary(
  answers: Record<string, unknown>,
  questions: readonly DietaryCascadeRule[],
): Array<{ label: string; value: string }> {
  if (!answers || typeof answers !== "object" || !Array.isArray(questions)) return [];
  const summary: Array<{ label: string; value: string }> = [];
  for (const q of questions) {
    const val = answers[q.questionId];
    if (val !== undefined && val !== null && val !== "") {
      summary.push({ label: q.label, value: String(val) });
    }
  }
  return summary;
}

// ── Dietary summary exports ───────────────────────────────────────────────

function _normalise(value: string): string {
  return String(value).trim().toLowerCase();
}

export function summariseDietary(guests: readonly DietaryGuest[]): DietarySummary {
  const byMeal: Record<string, number> = {};
  const byAllergy: Record<string, number> = {};
  let totalSeats = 0;
  for (const g of guests) {
    if (!g) continue;
    if (g.status && g.status !== "confirmed") continue;
    const seats =
      typeof g.seats === "number" && Number.isFinite(g.seats) && g.seats > 0 ? g.seats : 1;
    totalSeats += seats;
    if (typeof g.meal === "string" && g.meal.length > 0) {
      const key = _normalise(g.meal);
      byMeal[key] = (byMeal[key] ?? 0) + seats;
    }
    if (Array.isArray(g.allergies)) {
      const seen = new Set<string>();
      for (const a of g.allergies) {
        if (typeof a !== "string" || a.length === 0) continue;
        const key = _normalise(a);
        if (seen.has(key)) continue;
        seen.add(key);
        byAllergy[key] = (byAllergy[key] ?? 0) + seats;
      }
    }
  }
  const topAllergies = Object.entries(byAllergy)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return { totalSeats, byMeal, byAllergy, topAllergies };
}

export function formatKitchenReport(summary: DietarySummary): string {
  const lines = ["meal\tcount"];
  const meals = Object.entries(summary.byMeal).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  for (const [k, v] of meals) lines.push(`${k}\t${v}`);
  lines.push(`TOTAL\t${summary.totalSeats}`);
  if (summary.topAllergies.length > 0) {
    lines.push("");
    lines.push("allergy\tcount");
    for (const { key, count } of summary.topAllergies) {
      lines.push(`${key}\t${count}`);
    }
  }
  return lines.join("\n");
}

// ── Plus-one chain exports ────────────────────────────────────────────────

/** Reset plus-one ID counter — testing only. */
export function resetIdCounter(start = 0): void {
  _idCounter = start;
}

export function createPlusOne(
  parentGuestId: string,
  name: string,
  index = 1,
): PlusOneEntry {
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

export function generateChain(
  parentGuestId: string,
  count: number,
  names?: string[],
): PlusOneEntry[] {
  if (count <= 0) return [];
  const chain: PlusOneEntry[] = [];
  for (let i = 0; i < count; i++) {
    chain.push(createPlusOne(parentGuestId, names?.[i] ?? "", i + 1));
  }
  return chain;
}

export function setAnswer(
  entry: PlusOneEntry,
  questionId: string,
  answer: string,
): PlusOneEntry {
  if (!entry) return entry;
  return { ...entry, answers: { ...entry.answers, [questionId]: answer } };
}

export function propagateAnswer(
  chain: PlusOneEntry[],
  questionId: string,
  answer: string,
): PlusOneEntry[] {
  if (!Array.isArray(chain)) return [];
  return chain.map((e) => setAnswer(e, questionId, answer));
}

export function cascadeMeal(chain: PlusOneEntry[], meal: string): PlusOneEntry[] {
  if (!Array.isArray(chain)) return [];
  return chain.map((e) => ({ ...e, meal }));
}

export function cascadeDietary(chain: PlusOneEntry[], dietary: string): PlusOneEntry[] {
  if (!Array.isArray(chain)) return [];
  return chain.map((e) => ({ ...e, dietary }));
}

export function validateChain(
  chain: PlusOneEntry[],
  requiredQuestionIds: string[],
): {
  valid: boolean;
  missing: Array<{ entryId: string; name: string; questionIds: string[] }>;
} {
  if (!Array.isArray(chain) || !Array.isArray(requiredQuestionIds)) {
    return { valid: true, missing: [] };
  }
  const missing: Array<{ entryId: string; name: string; questionIds: string[] }> = [];
  for (const entry of chain) {
    const unanswered = requiredQuestionIds.filter((q) => !entry.answers[q]);
    if (unanswered.length > 0) {
      missing.push({ entryId: entry.id, name: entry.name, questionIds: unanswered });
    }
  }
  return { valid: missing.length === 0, missing };
}

export function reorderChain(
  chain: PlusOneEntry[],
  fromIndex: number,
  toIndex: number,
): PlusOneEntry[] {
  if (!Array.isArray(chain)) return [];
  const copy = [...chain];
  const [moved] = copy.splice(fromIndex, 1);
  if (!moved) return copy;
  copy.splice(toIndex, 0, moved);
  return copy.map((e, i) => ({ ...e, index: i + 1 }));
}

export function removePlusOne(chain: PlusOneEntry[], entryId: string): PlusOneEntry[] {
  if (!Array.isArray(chain)) return [];
  return chain
    .filter((e) => e.id !== entryId)
    .map((e, i) => ({ ...e, index: i + 1 }));
}

export function chainSummary(chain: PlusOneEntry[]): {
  total: number;
  named: number;
  withMeal: number;
  fullyAnswered: number;
} {
  if (!Array.isArray(chain)) return { total: 0, named: 0, withMeal: 0, fullyAnswered: 0 };
  return {
    total: chain.length,
    named: chain.filter((e) => e.name && !e.name.startsWith("Plus-One")).length,
    withMeal: chain.filter((e) => e.meal).length,
    fullyAnswered: chain.filter((e) => Object.keys(e.answers).length > 0).length,
  };
}
