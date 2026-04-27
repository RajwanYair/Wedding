/**
 * src/services/onboarding.js — S113 first-run onboarding wizard state.
 *
 * Tracks whether the current user has completed the onboarding flow and
 * exposes step progression. Storage-backed so progress survives reloads.
 *
 * Steps (v1):
 *   1. welcome              — intro card
 *   2. event_basics         — couple names, date, venue
 *   3. import_guests        — paste-list or skip
 *   4. choose_theme         — pick from 5 themes
 *   5. invite_collaborator  — add admin email or skip
 *   6. done                 — final summary; sets completed flag
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
  const nextStep = ONBOARDING_STEPS[nextIdx];
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
