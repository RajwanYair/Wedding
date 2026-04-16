/**
 * src/sections/dashboard.js — Dashboard section ESM module (S0.8)
 *
 * Renders stats, countdown, and top bar. Subscribes to the reactive store so
 * updates propagate automatically. No window.* dependencies.
 */

import { storeGet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { daysUntil, formatDateHebrew } from "../utils/date.js";

/** @type {(() => void)[]} */
const _unsubs = [];

/** @type {ReturnType<typeof setInterval> | null} */
let _countdownTimer = null;

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Mount the dashboard into the given container element.
 * Wires store subscriptions and renders initial state.
 * @param {HTMLElement} _container
 */
export function mount(_container) {
  _unsubs.push(storeSubscribe("guests", renderDashboard));
  _unsubs.push(storeSubscribe("tables", renderDashboard));
  _unsubs.push(storeSubscribe("vendors", renderExpenseSummary));
  _unsubs.push(storeSubscribe("expenses", renderExpenseSummary));
  _unsubs.push(
    storeSubscribe("weddingInfo", () => {
      updateTopBar();
      updateCountdown();
      updateRsvpDeadlineBanner();
    }),
  );
  renderDashboard();
  renderExpenseSummary();
  updateTopBar();
  updateCountdown();
  updateRsvpDeadlineBanner();
  _startCountdownTimer();
  // S2.6: wire stat counter observer after first render
  setTimeout(initStatCounterObserver, 0);
}

/**
 * Unmount — unsubscribe from store, stop timers.
 */
export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
  if (_countdownTimer !== null) {
    clearInterval(_countdownTimer);
    _countdownTimer = null;
  }
  _statObserver?.disconnect();
  _statObserver = null;
}

/**
 * Render all dashboard stat elements from the current store state.
 */
export function renderDashboard() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);

  const total = guests.reduce(
    (s, g) => s + (g.count || 1) + (g.children || 0),
    0,
  );
  const confirmed = guests
    .filter((g) => g.status === "confirmed")
    .reduce((s, g) => s + (g.count || 1) + (g.children || 0), 0);
  const pending = guests
    .filter((g) => g.status === "pending")
    .reduce((s, g) => s + (g.count || 1) + (g.children || 0), 0);
  const declined = guests
    .filter((g) => g.status === "declined")
    .reduce((s, g) => s + (g.count || 1) + (g.children || 0), 0);

  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const seated = guests.filter((g) => g.tableId).length;
  const sent = guests.filter((g) => g.sent).length;
  const veg = guests.filter((g) => g.meal && g.meal !== "regular").length;
  const accessibility = guests.filter((g) => g.accessibility).length;
  const groomSide = guests.filter((g) => g.side === "groom").length;
  const brideSide = guests.filter((g) => g.side === "bride").length;
  const transport = guests.filter(
    (g) => g.transport && g.transport !== "",
  ).length;

  _setText("statTotal", total);
  _setText("statConfirmed", confirmed);
  _setText("statPending", pending);
  _setText("statDeclined", declined);
  _setText("statTables", tables.length);
  _setText("statSeated", seated);
  _setText("statSent", sent);
  _setText("statUnsent", guests.length - sent);
  _setText("statVeg", veg);
  _setText("statAccessibility", accessibility);
  _setText("statGroomSide", groomSide);
  _setText("statBrideSide", brideSide);
  _setText("statTransport", transport);

  // Progress bar
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  if (el.progressFill) {
    /** @type {HTMLElement} */ (el.progressFill).style.width = `${pct}%`;
  }
  _setText("progressPercent", `${pct}%`);
  _setText("guestCount", guests.length);
}

/**
 * Update the top bar couple names.
 */
export function updateTopBar() {
  const info = /** @type {Record<string,string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  const groom = info.groom || t("groom_placeholder");
  const bride = info.bride || t("bride_placeholder");
  if (el.topBarCouple) {
    el.topBarCouple.textContent = `${groom} & ${bride}`;
  }
  if (el.coupleNames) {
    el.coupleNames.textContent = `${groom} \u2764 ${bride}`;
  }
}

/**
 * Update the countdown widget with live d:h:m:s (S13.1).
 */
export function updateCountdown() {
  if (!el.countdown) return;
  const info = /** @type {Record<string,string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  const dateStr = info.date;
  const timeStr = info.time || "18:00";
  if (!dateStr) {
    el.countdown.textContent = "";
    _clearLiveCountdown();
    return;
  }
  const target = new Date(`${dateStr}T${timeStr}:00`);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff < 0) {
    el.countdown.textContent = t("wedding_past");
    _clearLiveCountdown();
  } else if (diff < 86_400_000 && diff >= 0) {
    // Less than 24h — show h:m:s
    _renderLiveCountdown(diff);
  } else {
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    const secs = Math.floor((diff % 60_000) / 1_000);
    el.countdown.textContent =
      `${days} ${t("countdown_days")} ${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  if (el.weddingDateDisplay) {
    el.weddingDateDisplay.textContent = formatDateHebrew(dateStr);
  }
}

/**
 * Render live countdown digits into the countdown element.
 * @param {number} diff — ms remaining
 */
function _renderLiveCountdown(diff) {
  if (!el.countdown) return;
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);
  el.countdown.textContent =
    `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/** Clear the live countdown if no longer needed. */
function _clearLiveCountdown() {
  // no-op for now; timer managed by _startCountdownTimer
}

// ── Private helpers ───────────────────────────────────────────────────────

function _setText(id, value) {
  const domEl = el[id] ?? document.getElementById(id);
  if (domEl) domEl.textContent = String(value);
}

/** @type {IntersectionObserver|null} */
let _statObserver = null;

function _startCountdownTimer() {
  if (_countdownTimer) return;
  _countdownTimer = setInterval(updateCountdown, 1_000);
}

/**
 * Animate a stat element from 0 to its current numeric text value.
 * Uses requestAnimationFrame for smooth 600ms count-up.
 * @param {Element} el
 */
function _animateStat(el) {
  const target = parseInt(el.textContent ?? "0", 10);
  if (!target || !Number.isFinite(target)) return;
  const duration = 600;
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    // Ease-out cubic
    const eased = 1 - (1 - progress) ** 3;
    el.textContent = String(Math.round(eased * target));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Set up IntersectionObserver for stat counter animation (S2.6).
 * Observes all `[data-stat]` elements in the stats grid.
 */
export function initStatCounterObserver() {
  if (_statObserver || !("IntersectionObserver" in window)) return;
  _statObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          _animateStat(entry.target);
          _statObserver?.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 },
  );
  document
    .querySelectorAll(".stat-value[id], .stat-number[id]")
    .forEach((el) => _statObserver?.observe(el));
}

/**
 * Show/hide the RSVP deadline banner based on rsvpDeadline in weddingInfo.
 * Shows a warning if the deadline is within 7 days or has passed.
 */
export function updateRsvpDeadlineBanner() {
  const banner = document.getElementById("rsvpDeadlineBanner");
  if (!banner) return;
  const info = /** @type {Record<string,string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  const deadline = info.rsvpDeadline;
  if (!deadline) {
    banner.hidden = true;
    return;
  }
  const days = daysUntil(deadline);
  if (days < 0) {
    banner.textContent = t("rsvp_deadline_passed") || "מועד ה-RSVP עבר";
    banner.className = "rsvp-deadline-banner rsvp-deadline-banner--late";
    banner.hidden = false;
  } else if (days <= 7) {
    banner.textContent = (
      t("rsvp_deadline_soon") || "נותרו {days} ימים ל-RSVP"
    ).replace("{days}", String(days));
    banner.className = "rsvp-deadline-banner rsvp-deadline-banner--soon";
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

// ── S14.2 Expense Summary Widget ──────────────────────────────────────────

/**
 * Render expense/vendor summary widget on the dashboard.
 */
export function renderExpenseSummary() {
  const container = document.getElementById("dashExpenseSummary");
  if (!container) return;
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const expenses = /** @type {any[]} */ (storeGet("expenses") ?? []);
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const budgetTarget = Number(info.budgetTarget) || 0;
  const vendorTotal = vendors.reduce((s, v) => s + (v.price || 0), 0);
  const vendorPaid = vendors.reduce((s, v) => s + (v.paid || 0), 0);
  const expenseTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalSpent = vendorPaid + expenseTotal;
  const totalCommitted = vendorTotal + expenseTotal;

  _setText("dashBudgetTarget", budgetTarget > 0 ? `₪${budgetTarget.toLocaleString()}` : "—");
  _setText("dashTotalCommitted", `₪${totalCommitted.toLocaleString()}`);
  _setText("dashTotalSpent", `₪${totalSpent.toLocaleString()}`);
  _setText("dashBudgetRemaining", budgetTarget > 0 ? `₪${(budgetTarget - totalCommitted).toLocaleString()}` : "—");

  // Progress bar
  const pctEl = document.getElementById("dashBudgetFill");
  if (pctEl && budgetTarget > 0) {
    const pct = Math.min(100, Math.round((totalCommitted / budgetTarget) * 100));
    /** @type {HTMLElement} */ (pctEl).style.width = `${pct}%`;
    pctEl.className = pct > 100 ? "progress-fill progress-fill--danger" : "progress-fill";
  }

  // Overdue vendors (S14.3)
  const now = new Date();
  const overdue = vendors.filter((v) => {
    if (!v.dueDate) return false;
    return new Date(v.dueDate) < now && (v.paid || 0) < (v.price || 0);
  });
  const overdueEl = document.getElementById("dashOverdueVendors");
  if (overdueEl) {
    if (overdue.length > 0) {
      overdueEl.textContent = `⚠️ ${overdue.length} ${t("vendor_overdue_count")}`;
      overdueEl.classList.remove("u-hidden");
    } else {
      overdueEl.classList.add("u-hidden");
    }
  }
}
