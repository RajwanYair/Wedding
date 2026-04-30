/**
 * src/sections/onboarding.js — First-run onboarding wizard (S426)
 *
 * 4-step wizard: wedding info → guest CSV import → table count → theme pick.
 * Shown on first admin login when weddingInfo.groom is empty.
 * Navigates to dashboard on completion.
 */

import { storeGet, storeSet } from "../core/store.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import { t } from "../core/i18n.js";
import { showToast, applyTheme } from "../core/ui.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../core/sync.js";
import { uid } from "../utils/misc.js";
import { navigate } from "../core/nav.js";

/** @type {number} */
let _step = 1;
const TOTAL_STEPS = 4;

class OnboardingSection extends BaseSection {
  async onMount() {
    _step = 1;
    _renderStep();
  }
}

export const { mount, unmount, capabilities } = fromSection(new OnboardingSection("onboarding"));

// ── Step rendering ─────────────────────────────────────────────────────────

function _renderStep() {
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const panel = document.getElementById(`onboardingStep${i}`);
    if (panel) panel.classList.toggle("u-hidden", i !== _step);
    const dot = /** @type {HTMLElement|null} */ (
      document.querySelector(`[data-step="${i}"]`)
    );
    if (dot) dot.classList.toggle("onboarding-step--active", i === _step);
  }
  const backBtn = document.getElementById("onboardingBackBtn");
  const nextBtn = document.getElementById("onboardingNextBtn");
  const finishBtn = document.getElementById("onboardingFinishBtn");
  if (backBtn) backBtn.hidden = _step === 1;
  if (nextBtn) nextBtn.classList.toggle("u-hidden", _step === TOTAL_STEPS);
  if (finishBtn) finishBtn.classList.toggle("u-hidden", _step !== TOTAL_STEPS);
}

// ── Navigation ─────────────────────────────────────────────────────────────

/**
 * Advance to the next wizard step.
 * On step 1, validates + saves wedding info.
 * On step 2, triggers CSV import if a file was chosen.
 * On step 3, saves table count.
 */
export function onboardingNext() {
  if (_step === 1) {
    const ok = _saveWeddingInfo();
    if (!ok) return;
  } else if (_step === 2) {
    _importGuestFile();
  } else if (_step === 3) {
    _saveTableCount();
  }
  if (_step < TOTAL_STEPS) {
    _step += 1;
    _renderStep();
  }
}

/** Go back one wizard step. */
export function onboardingBack() {
  if (_step > 1) {
    _step -= 1;
    _renderStep();
  }
}

/** Apply chosen theme on step 4. @param {string} theme */
export function onboardingPickTheme(theme) {
  applyTheme(theme || "");
}

/** Complete the wizard and navigate to dashboard. */
export function onboardingFinish() {
  _saveTableCount();
  storeSet("onboardingDone", true);
  showToast(t("onboarding_done"), "success");
  navigate("dashboard");
}

// ── Step implementations ───────────────────────────────────────────────────

/** Validate and persist wedding info from step 1. @returns {boolean} */
function _saveWeddingInfo() {
  const groom = /** @type {HTMLInputElement|null} */ (document.getElementById("obGroomName"))?.value.trim() ?? "";
  const bride = /** @type {HTMLInputElement|null} */ (document.getElementById("obBrideName"))?.value.trim() ?? "";
  const date  = /** @type {HTMLInputElement|null} */ (document.getElementById("obDate"))?.value.trim() ?? "";
  const venue = /** @type {HTMLInputElement|null} */ (document.getElementById("obVenue"))?.value.trim() ?? "";

  if (!groom && !bride) {
    showToast(t("onboarding_need_names"), "warning");
    return false;
  }

  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  storeSet("weddingInfo", { ...info, ...(groom && { groom }), ...(bride && { bride }), ...(date && { date }), ...(venue && { venue }) });
  enqueueWrite("weddingInfo", () => syncStoreKeyToSheets("weddingInfo"));
  return true;
}

/** Import guest CSV if the user picked a file on step 2. */
function _importGuestFile() {
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById("obGuestCSV"));
  if (!input?.files?.length) return;
  // Delegate to the guests section CSV import (dynamic import to avoid circular deps)
  import("../sections/guests.js").then(({ importGuestsCSV }) => {
    importGuestsCSV(input);
  }).catch(() => {});
}

/** Read table count input and create blank tables on step 3. */
function _saveTableCount() {
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById("obTableCount"));
  const count = Math.max(1, Math.min(200, Number(input?.value ?? 10) || 10));
  const existing = /** @type {any[]} */ (storeGet("tables") ?? []);
  if (existing.length > 0) return; // already have tables — skip
  const now = new Date().toISOString();
  const tables = Array.from({ length: count }, (_, i) => ({
    id: uid(),
    name: `${t("table_default_name")} ${i + 1}`,
    capacity: 10,
    shape: "round",
    createdAt: now,
    updatedAt: now,
  }));
  storeSet("tables", tables);
  enqueueWrite("tables", () => syncStoreKeyToSheets("tables"));
}
