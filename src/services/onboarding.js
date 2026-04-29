/**
 * src/services/onboarding.js — First-run onboarding + What's New engine (S249)
 *
 * Merged from:
 *   - onboarding.js (S113)         — first-run wizard state + step progression
 *   - whats-new-engine.js (S126)   — version comparison + "What's New" decision logic
 *
 * §1 Onboarding — ONBOARDING_STEPS, getOnboardingState, setOnboardingState,
 *    advanceOnboarding, dismissOnboarding, isOnboardingNeeded.
 * §2 What's New engine — compareSemver, shouldShowWhatsNew,
 *    collectNewerEntries, flattenItems.
 *
 * Storage-backed where needed; pure helpers are DOM-free and unit-testable.
 */

import { readBrowserStorage, writeBrowserStorage } from "../core/storage.js";

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

// ── §2 — What's New decision engine ──────────────────────────────────────

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
