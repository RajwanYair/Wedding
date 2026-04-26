/**
 * src/handlers/event-handlers.js — Event switcher handler registration (Phase 6.3)
 *
 * Handles S9.2 multi-event switcher actions: switch, add, delete events.
 * Extracted from main.js to reduce it to ≤200 lines.
 */

import { on } from "../core/events.js";
import { t } from "../core/i18n.js";
import { showToast, showConfirmDialog } from "../core/ui.js";
import {
  getActiveEventId,
  setActiveEvent,
  listEvents,
  addEvent,
  removeEvent,
  clearEventData,
} from "../core/state.js";
import { reinitStore } from "../core/store.js";
import { buildStoreDefs } from "../core/defaults.js";
import { currentUser } from "../services/auth.js";
import { resolveSection, switchSection } from "../core/section-resolver.js";

// ── Event switcher UI ───────────────────────────────────────────────────

/**
 * Populate the event switcher <select> with current events.
 */
export function renderEventSwitcher() {
  const select = /** @type {HTMLSelectElement | null} */ (document.getElementById("eventSelect"));
  if (!select) return;
  const events = listEvents();
  const activeId = getActiveEventId();
  select.textContent = "";
  events.forEach((evt) => {
    const opt = document.createElement("option");
    opt.value = evt.id;
    opt.textContent = evt.label || (evt.id === "default" ? t("event_default") : evt.id);
    if (evt.id === activeId) opt.selected = true;
    select.appendChild(opt);
  });
}

/**
 * Switch to a different event — reloads all store data.
 * @param {string} eventId
 */
export async function doSwitchEvent(eventId) {
  if (eventId === getActiveEventId()) return;
  // Unmount active section handled by switchSection
  setActiveEvent(eventId);
  reinitStore(buildStoreDefs());
  // Refresh dashboard top-bar
  const dash = /** @type {any} */ (await resolveSection("dashboard"));
  dash?.updateTopBar?.();
  dash?.updateCountdown?.();
  renderEventSwitcher();
  const target = currentUser()?.isAdmin ? "dashboard" : "landing";
  await switchSection(target);
  showToast(t("event_switched"));
}

/**
 * Create a new event via prompt.
 */
export function doAddEvent() {
  const id = `evt_${Date.now().toString(36)}`;
  const label = prompt(t("event_name_prompt")) ?? "";
  if (!label.trim()) return;
  addEvent(id, label.trim());
  doSwitchEvent(id);
}

/**
 * Delete the current event (if not default).
 */
export async function doDeleteEvent() {
  const eid = getActiveEventId();
  if (eid === "default") {
    showToast(t("event_cannot_delete_default"));
    return;
  }
  const ok = showConfirmDialog(t("event_delete_confirm"), () => {});
  if (!ok) return;
  clearEventData(eid);
  removeEvent(eid);
  await doSwitchEvent("default");
}

// ── Handler registration ─────────────────────────────────────────────────

/**
 * Register all event-switcher data-action handlers.
 * Call once at bootstrap.
 */
export function registerEventHandlers() {
  on("switchEvent", (el) => doSwitchEvent(/** @type {HTMLSelectElement} */ (el).value));
  on("addNewEvent", () => doAddEvent());
  on("deleteEvent", () => doDeleteEvent());
}
