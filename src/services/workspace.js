/**
 * src/services/workspace.js — Workspace roles + onboarding + What's New engine (S277)
 *
 * Merged from:
 *   - workspace-roles.js (S132) — RBAC org/team/planner roles
 *   - onboarding.js      (S249) — first-run wizard + What's New decision engine
 *
 * §1 Workspace RBAC — WORKSPACE_ROLES, hasPermission, compareRoles, canAssignRole,
 *    filterByRole, newMember.
 * §2 Onboarding — ONBOARDING_STEPS, getOnboardingState, setOnboardingState,
 *    advanceOnboarding, dismissOnboarding, isOnboardingNeeded.
 * §3 What's New engine — compareSemver, shouldShowWhatsNew,
 *    collectNewerEntries, flattenItems.
 *
 * Pure helpers — no DOM. Storage-backed for §2 state only.
 */

import { readBrowserStorage, writeBrowserStorage } from "../core/storage.js";

// ── §1 — Workspace RBAC ───────────────────────────────────────────────────

/** @typedef {"owner"|"co_planner"|"vendor"|"photographer"|"guest"} WorkspaceRole */

/** @typedef {"read"|"write"|"approve"|"invite"|"billing"} Permission */

/** Static role → permission map. */
const ROLE_PERMS = Object.freeze({
  owner:        ["read", "write", "approve", "invite", "billing"],
  co_planner:   ["read", "write", "approve", "invite"],
  vendor:       ["read", "write"],
  photographer: ["read"],
  guest:        ["read"],
});

const ROLE_RANK = Object.freeze({
  owner: 5,
  co_planner: 4,
  vendor: 3,
  photographer: 2,
  guest: 1,
});

/** All known roles (frozen array). */
export const WORKSPACE_ROLES = Object.freeze(Object.keys(ROLE_PERMS));

/** Returns true iff the role grants the permission. */
export function hasPermission(/** @type {WorkspaceRole} */ role, /** @type {Permission} */ perm) {
  const list = ROLE_PERMS[role];
  if (!list) return false;
  return list.includes(perm);
}

/** Compare two roles. Returns -1 / 0 / 1 by rank. */
export function compareRoles(/** @type {WorkspaceRole} */ a, /** @type {WorkspaceRole} */ b) {
  const ra = ROLE_RANK[a] ?? 0;
  const rb = ROLE_RANK[b] ?? 0;
  if (ra > rb) return 1;
  if (ra < rb) return -1;
  return 0;
}

/** Returns true iff `actor` may change `target`'s role to `nextRole`. */
export function canAssignRole(/** @type {WorkspaceRole} */ actorRole, /** @type {WorkspaceRole} */ targetRole, /** @type {WorkspaceRole} */ nextRole) {
  if (!hasPermission(actorRole, "invite")) return false;
  // Cannot promote anyone to a higher rank than yourself.
  if (compareRoles(nextRole, actorRole) > 0) return false;
  // Cannot demote/replace someone of equal-or-higher rank than yourself
  // unless you are the owner.
  if (actorRole !== "owner" && compareRoles(targetRole, actorRole) >= 0) {
    return false;
  }
  return true;
}

/** Filter a permission list to only those granted by the role. */
export function filterByRole(/** @type {WorkspaceRole} */ role, /** @type {Permission[]} */ perms) {
  return (perms ?? []).filter((/** @type {Permission} */ p) => hasPermission(role, p));
}

/** Default member entry shape for new invites. */
export function newMember({ email = /** @type {string} */ (""), role = /** @type {WorkspaceRole} */ ("guest"), invitedBy = "" }) {
  if (typeof email !== "string" || !email.includes("@")) {
    throw new Error("invalid_email");
  }
  if (!ROLE_PERMS[role]) throw new Error("invalid_role");
  return {
    email: email.trim().toLowerCase(),
    role,
    invitedBy,
    invitedAt: new Date().toISOString(),
    status: "pending",
  };
}

// ── §2 — First-run onboarding ─────────────────────────────────────────────

const STORAGE_KEY = "wedding_v1_onboarding_state";

/** Ordered step keys. */
export const ONBOARDING_STEPS = Object.freeze([
  "welcome",
  "event_basics",
  "import_guests",
  "choose_theme",
  "invite_collaborator",
  "done",
]);

/** @typedef {(typeof ONBOARDING_STEPS)[number]} OnboardingStep */
/** @typedef {{ step: OnboardingStep, completed: boolean, startedAt?: string, completedAt?: string }} OnboardingState */

/**
 * Read persisted state, defaulting to a fresh "welcome" step.
 * @returns {OnboardingState}
 */
export function getOnboardingState() {
  const raw = readBrowserStorage(STORAGE_KEY);
  if (!raw) return { step: "welcome", completed: false };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.step === "string" && ONBOARDING_STEPS.includes(parsed.step)) {
      return /** @type {OnboardingState} */ (parsed);
    }
  } catch {
    /* fall through to default */
  }
  return { step: "welcome", completed: false };
}

/**
 * Persist a new onboarding state.
 * @param {OnboardingState} state
 */
export function setOnboardingState(state) {
  writeBrowserStorage(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Advance to the next step. If already at "done", marks completed.
 * @returns {OnboardingState}
 */
export function advanceOnboarding() {
  const cur = getOnboardingState();
  if (cur.completed) return cur;
  const i = ONBOARDING_STEPS.indexOf(cur.step);
  const nextIdx = Math.min(i + 1, ONBOARDING_STEPS.length - 1);
  const nextStep = ONBOARDING_STEPS[nextIdx] ?? "done";
  /** @type {OnboardingState} */
  const next = {
    step: nextStep,
    completed: nextStep === "done",
    startedAt: cur.startedAt ?? new Date().toISOString(),
  };
  if (next.completed) next.completedAt = new Date().toISOString();
  setOnboardingState(next);
  return next;
}

/**
 * Mark onboarding as complete (skip path).
 */
export function dismissOnboarding() {
  const cur = getOnboardingState();
  setOnboardingState({
    step: "done",
    completed: true,
    startedAt: cur.startedAt ?? new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });
}

/**
 * @returns {boolean} whether the wizard should be shown on next mount
 */
export function isOnboardingNeeded() {
  return !getOnboardingState().completed;
}

// ── §3 — What's New decision engine ──────────────────────────────────────

/** Compare two semver-ish versions. Returns -1 / 0 / 1. */
export function compareSemver(/** @type {string|number} */ a, /** @type {string|number} */ b) {
  const pa = String(a ?? "").split(/[.+-]/).slice(0, 3).map((n) => Number.parseInt(n, 10));
  const pb = String(b ?? "").split(/[.+-]/).slice(0, 3).map((n) => Number.parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const ai = Number.isFinite(pa[i]) ? (pa[i] ?? 0) : 0;
    const bi = Number.isFinite(pb[i]) ? (pb[i] ?? 0) : 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

/**
 * Should the What's New modal be shown?
 *
 * @param {{ currentVersion: string, lastSeenVersion?: string|null, isAdmin?: boolean }} input
 */
export function shouldShowWhatsNew({ currentVersion, lastSeenVersion, isAdmin }) {
  if (!isAdmin) return false;
  if (!currentVersion) return false;
  if (!lastSeenVersion) return true;
  return compareSemver(currentVersion, lastSeenVersion) > 0;
}

/** @typedef {{ version: string, date: string, items: string[] }} WhatsNewEntry */

/**
 * Collect entries from the manifest that are *newer* than `sinceVersion`.
 *
 * @param {WhatsNewEntry[]} entries
 * @param {string|null|undefined} sinceVersion
 * @returns {WhatsNewEntry[]}
 */
export function collectNewerEntries(entries, sinceVersion) {
  return (entries ?? [])
    .filter((e) => e?.version && (!sinceVersion || compareSemver(e.version, sinceVersion) > 0))
    .sort((a, b) => -compareSemver(a.version, b.version));
}

/**
 * Flatten entries to a single de-duplicated list of items, newest version
 * first. Useful for a simple "see all changes since last login" modal.
 *
 * @param {WhatsNewEntry[]} entries
 */
export function flattenItems(entries) {
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  for (const e of entries ?? []) {
    for (const it of e.items ?? []) {
      if (typeof it !== "string") continue;
      const key = it.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}
