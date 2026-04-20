/**
 * src/utils/tour-guide.js
 * In-app onboarding tour builder — pure data, no DOM.
 * Defines tour steps and roles, builds + manages tour state via plain objects.
 *
 * @module tour-guide
 */

// ── Constants ──────────────────────────────────────────────────────────────

/** Canonical tour step IDs (order defines default sequence). */
export const TOUR_STEPS = Object.freeze({
  WELCOME: "welcome",
  ADD_GUEST: "add_guest",
  MANAGE_TABLES: "manage_tables",
  RSVP_LINK: "rsvp_link",
  WHATSAPP_INVITE: "whatsapp_invite",
  VENDOR_SECTION: "vendor_section",
  BUDGET_OVERVIEW: "budget_overview",
  EXPORT_DATA: "export_data",
  SETTINGS: "settings",
  DONE: "done",
});

/** User roles eligible for tours. */
export const TOUR_ROLES = Object.freeze({
  ADMIN: "admin",
  COORDINATOR: "coordinator",
  GUEST: "guest",
});

/** Default step definitions (title + description + roles allowed). */
const DEFAULT_STEP_DEFINITIONS = [
  {
    id: TOUR_STEPS.WELCOME,
    titleKey: "tour.welcome.title",
    descKey: "tour.welcome.desc",
    roles: [TOUR_ROLES.ADMIN, TOUR_ROLES.COORDINATOR],
    target: "#nav-dashboard",
    order: 0,
  },
  {
    id: TOUR_STEPS.ADD_GUEST,
    titleKey: "tour.addGuest.title",
    descKey: "tour.addGuest.desc",
    roles: [TOUR_ROLES.ADMIN, TOUR_ROLES.COORDINATOR],
    target: "#nav-guests",
    order: 1,
  },
  {
    id: TOUR_STEPS.MANAGE_TABLES,
    titleKey: "tour.manageTables.title",
    descKey: "tour.manageTables.desc",
    roles: [TOUR_ROLES.ADMIN, TOUR_ROLES.COORDINATOR],
    target: "#nav-tables",
    order: 2,
  },
  {
    id: TOUR_STEPS.RSVP_LINK,
    titleKey: "tour.rsvpLink.title",
    descKey: "tour.rsvpLink.desc",
    roles: [TOUR_ROLES.ADMIN],
    target: "#nav-rsvp",
    order: 3,
  },
  {
    id: TOUR_STEPS.WHATSAPP_INVITE,
    titleKey: "tour.whatsappInvite.title",
    descKey: "tour.whatsappInvite.desc",
    roles: [TOUR_ROLES.ADMIN, TOUR_ROLES.COORDINATOR],
    target: "#btn-whatsapp-send",
    order: 4,
  },
  {
    id: TOUR_STEPS.VENDOR_SECTION,
    titleKey: "tour.vendors.title",
    descKey: "tour.vendors.desc",
    roles: [TOUR_ROLES.ADMIN],
    target: "#nav-vendors",
    order: 5,
  },
  {
    id: TOUR_STEPS.BUDGET_OVERVIEW,
    titleKey: "tour.budget.title",
    descKey: "tour.budget.desc",
    roles: [TOUR_ROLES.ADMIN],
    target: "#nav-budget",
    order: 6,
  },
  {
    id: TOUR_STEPS.EXPORT_DATA,
    titleKey: "tour.export.title",
    descKey: "tour.export.desc",
    roles: [TOUR_ROLES.ADMIN],
    target: "#btn-export",
    order: 7,
  },
  {
    id: TOUR_STEPS.SETTINGS,
    titleKey: "tour.settings.title",
    descKey: "tour.settings.desc",
    roles: [TOUR_ROLES.ADMIN, TOUR_ROLES.COORDINATOR],
    target: "#nav-settings",
    order: 8,
  },
  {
    id: TOUR_STEPS.DONE,
    titleKey: "tour.done.title",
    descKey: "tour.done.desc",
    roles: [TOUR_ROLES.ADMIN, TOUR_ROLES.COORDINATOR, TOUR_ROLES.GUEST],
    target: null,
    order: 9,
  },
];

// ── Step builders ──────────────────────────────────────────────────────────

/**
 * Creates a single tour step definition with validation.
 * @param {{ id: string, titleKey: string, descKey: string, roles: string[], target?: string|null, order?: number }} opts
 * @returns {{ id: string, titleKey: string, descKey: string, roles: string[], target: string|null, order: number }}
 */
export function createTourStep({ id, titleKey, descKey, roles = [], target = null, order = 0 }) {
  if (!id || typeof id !== "string") throw new Error("Tour step id is required");
  if (!titleKey) throw new Error("titleKey is required");
  if (!descKey) throw new Error("descKey is required");
  if (!Array.isArray(roles)) throw new Error("roles must be an array");
  return { id, titleKey, descKey, roles: [...roles], target: target ?? null, order };
}

/**
 * Builds an ordered tour step array for a given role from the default definitions.
 * @param {string} [role=TOUR_ROLES.ADMIN]
 * @returns {Array}
 */
export function buildTour(role = TOUR_ROLES.ADMIN) {
  return DEFAULT_STEP_DEFINITIONS
    .filter((s) => s.roles.includes(role))
    .sort((a, b) => a.order - b.order);
}

/**
 * Filters an array of step definitions to those matching a role.
 * @param {Array} steps
 * @param {string} role
 * @returns {Array}
 */
export function filterStepsForRole(steps, role) {
  if (!Array.isArray(steps)) return [];
  return steps.filter((s) => Array.isArray(s.roles) && s.roles.includes(role));
}

// ── Progress helpers ───────────────────────────────────────────────────────

/**
 * Returns a progress descriptor for a tour given a set of completed step IDs.
 * @param {Array} steps - Full step list for this tour.
 * @param {Set<string>|string[]} completedIds
 * @returns {{ total: number, completed: number, remaining: number, percent: number, isComplete: boolean }}
 */
export function getTourProgress(steps, completedIds) {
  const done = completedIds instanceof Set ? completedIds : new Set(completedIds ?? []);
  const total = steps.length;
  const completed = steps.filter((s) => done.has(s.id)).length;
  const remaining = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, remaining, percent, isComplete: remaining === 0 };
}

/**
 * Returns a new Set with `stepId` added to the completed set.
 * @param {Set<string>|string[]} completedIds
 * @param {string} stepId
 * @returns {Set<string>}
 */
export function markStepComplete(completedIds, stepId) {
  const done = completedIds instanceof Set ? new Set(completedIds) : new Set(completedIds ?? []);
  done.add(stepId);
  return done;
}

/**
 * Returns true if all steps in the tour are in the completed set.
 * @param {Array} steps
 * @param {Set<string>|string[]} completedIds
 * @returns {boolean}
 */
export function isTourComplete(steps, completedIds) {
  const done = completedIds instanceof Set ? completedIds : new Set(completedIds ?? []);
  return steps.length > 0 && steps.every((s) => done.has(s.id));
}

/**
 * Returns an empty Set (reset tour state).
 * @returns {Set<string>}
 */
export function resetTour() {
  return new Set();
}

// ── Summary ────────────────────────────────────────────────────────────────

/**
 * Builds a human-readable summary of a tour's progress.
 * @param {Array} steps
 * @param {Set<string>|string[]} completedIds
 * @returns {{ completedSteps: string[], pendingSteps: string[], progress: object }}
 */
export function buildTourSummary(steps, completedIds) {
  const done = completedIds instanceof Set ? completedIds : new Set(completedIds ?? []);
  const completedSteps = steps.filter((s) => done.has(s.id)).map((s) => s.id);
  const pendingSteps = steps.filter((s) => !done.has(s.id)).map((s) => s.id);
  return {
    completedSteps,
    pendingSteps,
    progress: getTourProgress(steps, done),
  };
}
