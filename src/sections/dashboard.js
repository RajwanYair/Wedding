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
import { load, save } from "../core/state.js";
import { renderArrivalForecast } from "./analytics.js";

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
  _unsubs.push(storeSubscribe("vendors", renderDashboard)); // S17.5 budget alert
  _unsubs.push(storeSubscribe("expenses", renderDashboard)); // S17.5 budget alert
  _unsubs.push(storeSubscribe("vendors", renderExpenseSummary));
  _unsubs.push(storeSubscribe("expenses", renderExpenseSummary));
  _unsubs.push(storeSubscribe("guests", () => _logActivity("guests")));
  _unsubs.push(storeSubscribe("vendors", () => _logActivity("vendors")));
  // S18.2 arrival forecast
  _unsubs.push(storeSubscribe("guests", renderArrivalForecast));
  _unsubs.push(storeSubscribe("tables", renderArrivalForecast));
  // S19.3 vendor category card
  _unsubs.push(storeSubscribe("vendors", renderVendorCategories));
  // S19.4 follow-up pending list
  _unsubs.push(storeSubscribe("guests", renderFollowUpList));
  // S20.4 invitation stats
  _unsubs.push(storeSubscribe("guests", renderInvitationStats));
  // S22.1 check-in progress bar
  _unsubs.push(storeSubscribe("guests", renderCheckinProgress));
  // S22.5 guest target ring
  _unsubs.push(storeSubscribe("guests", renderGuestTargetRing));
  // S23.4 suggested actions
  _unsubs.push(storeSubscribe("guests", renderSuggestedActions));
  _unsubs.push(storeSubscribe("vendors", renderSuggestedActions));
  _unsubs.push(storeSubscribe("tables", renderSuggestedActions));
  // S24.3 gift progress
  _unsubs.push(storeSubscribe("guests", renderGiftProgress));
  // S24.5 next timeline event
  _unsubs.push(storeSubscribe("timeline", renderNextTimelineEvent));
  // F4.1 budget forecast
  _unsubs.push(storeSubscribe("guests", renderBudgetForecast));
  _unsubs.push(storeSubscribe("vendors", renderBudgetForecast));
  _unsubs.push(
    storeSubscribe("weddingInfo", () => {
      updateTopBar();
      updateCountdown();
      updateRsvpDeadlineBanner();
    }),
  );
  renderDashboard();
  renderExpenseSummary();
  renderActivityFeed();
  renderArrivalForecast(); // S18.2
  renderVendorCategories(); // S19.3
  renderFollowUpList(); // S19.4
  renderInvitationStats(); // S20.4
  renderCheckinProgress(); // S22.1
  renderGuestTargetRing(); // S22.5
  renderSuggestedActions(); // S23.4
  renderGiftProgress(); // S24.3
  renderNextTimelineEvent(); // S24.5
  renderBudgetForecast(); // F4.1
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

  // S17.5 Budget overshoot alert
  const budgetAlertEl = document.getElementById("dashBudgetAlert");
  if (budgetAlertEl) {
    if (budgetTarget > 0 && totalCommitted > budgetTarget) {
      const over = totalCommitted - budgetTarget;
      budgetAlertEl.textContent = `🚨 ${t("budget_overshoot").replace("{amount}", `₪${over.toLocaleString()}`)}`;
      budgetAlertEl.classList.remove("u-hidden");
    } else {
      budgetAlertEl.classList.add("u-hidden");
    }
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

// ── F4.1 Budget Forecast (headcount × per-plate vs target) ────────────────

/**
 * Render a budget forecast card showing estimated total cost based on
 * confirmed guest headcount × per-plate estimate vs budget target.
 * Displays in #dashBudgetForecast.
 */
export function renderBudgetForecast() {
  const container = document.getElementById("dashBudgetForecast");
  if (!container) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const budgetTarget = Number(info.budgetTarget) || 0;

  // Count confirmed attendees (adults + children)
  const confirmed = guests.filter((g) => g.status === "confirmed");
  const headcount = confirmed.reduce((s, g) => s + (Number(g.count) || 1), 0);

  // Estimate per-plate from catering vendor or default fallback
  const cateringVendor = vendors.find(
    (v) => (v.category || "").toLowerCase() === "catering" || (v.category || "").includes("קייטרינג"),
  );
  let perPlate = 0;
  if (cateringVendor && headcount > 0) {
    perPlate = Math.round((cateringVendor.price || 0) / headcount);
  }

  const estimatedCatering = perPlate * headcount;
  const vendorTotalNoCatering = vendors
    .filter((v) => v !== cateringVendor)
    .reduce((s, v) => s + (v.price || 0), 0);
  const forecastTotal = vendorTotalNoCatering + estimatedCatering;

  container.textContent = "";

  if (headcount === 0) {
    container.textContent = t("forecast_no_guests") || "אין אורחים מאושרים עדיין";
    return;
  }

  const items = [
    { label: t("forecast_headcount") || "מוזמנים מאושרים", val: String(headcount) },
    { label: t("forecast_per_plate") || "עלות למנה (משוער)", val: perPlate > 0 ? `₪${perPlate.toLocaleString()}` : "—" },
    { label: t("forecast_total") || "תחזית כוללת", val: `₪${forecastTotal.toLocaleString()}` },
  ];

  if (budgetTarget > 0) {
    const diff = budgetTarget - forecastTotal;
    const cls = diff >= 0 ? "u-text-success" : "u-text-danger";
    items.push({
      label: t("forecast_vs_budget") || "מול תקציב",
      val: `<span class="${cls}">${diff >= 0 ? "+" : ""}₪${diff.toLocaleString()}</span>`,
    });
  }

  items.forEach(({ label, val }) => {
    const row = document.createElement("div");
    row.className = "forecast-row";
    const lbl = document.createElement("span");
    lbl.className = "forecast-label u-text-muted";
    lbl.textContent = label;
    const v = document.createElement("span");
    v.className = "forecast-value";
    v.innerHTML = val; // safe: values are computed numbers / class names
    row.appendChild(lbl);
    row.appendChild(v);
    container.appendChild(row);
  });
}

// ── S15.4 Dashboard Activity Feed ────────────────────────────────────────

/** @type {boolean} */
let _activityMounted = false;

/**
 * Log an activity event when a store key changes.
 * @param {string} key
 */
function _logActivity(key) {
  if (!_activityMounted) { _activityMounted = true; return; } // skip initial load
  const feed = /** @type {Array<{ts: string, key: string}>} */ (load("activityFeed", []) || []);
  feed.unshift({ ts: new Date().toISOString(), key });
  if (feed.length > 50) feed.length = 50; // cap at 50 entries
  save("activityFeed", feed);
  renderActivityFeed();
}

/**
 * Render the activity feed into the dashboard widget.
 */
export function renderActivityFeed() {
  const container = document.getElementById("dashActivityFeed");
  if (!container) return;
  const feed = /** @type {Array<{ts: string, key: string}>} */ (load("activityFeed", []) || []);
  container.textContent = "";
  if (feed.length === 0) {
    container.textContent = t("activity_none");
    return;
  }
  const icons = { guests: "👤", vendors: "🏢", tables: "🪑", expenses: "💸" };
  feed.slice(0, 10).forEach((entry) => {
    const row = document.createElement("div");
    row.className = "activity-feed-item";
    const icon = icons[entry.key] || "📋";
    const time = new Date(entry.ts);
    const relative = _timeAgo(time);
    row.textContent = `${icon} ${t(`activity_${entry.key}_changed`)} — ${relative}`;
    container.appendChild(row);
  });
}

/**
 * Simple relative time formatter.
 * @param {Date} date
 * @returns {string}
 */
function _timeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return t("time_just_now");
  if (diff < 3600) return `${Math.floor(diff / 60)} ${t("time_minutes_ago")}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${t("time_hours_ago")}`;
  return `${Math.floor(diff / 86400)} ${t("time_days_ago")}`;
}

// ── S19.3 Vendor Category Dashboard Card ─────────────────────────────────

/**
 * Render a summary of vendors grouped by category into #dashVendorCategories.
 */
export function renderVendorCategories() {
  const el = document.getElementById("dashVendorCategories");
  if (!el) return;
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);
  if (vendors.length === 0) {
    el.textContent = t("no_vendors");
    return;
  }
  /** @type {Map<string, { count: number, cost: number, paid: number, overdue: number }>} */
  const catMap = new Map();
  const now = new Date();
  vendors.forEach((v) => {
    const cat = v.category || t("other");
    const entry = catMap.get(cat) ?? { count: 0, cost: 0, paid: 0, overdue: 0 };
    entry.count += 1;
    entry.cost += v.price || 0;
    entry.paid += v.paid || 0;
    if (v.dueDate && new Date(v.dueDate) < now && (v.paid || 0) < (v.price || 0)) {
      entry.overdue += 1;
    }
    catMap.set(cat, entry);
  });
  el.textContent = "";
  catMap.forEach((entry, cat) => {
    const row = document.createElement("div");
    row.className = "vendor-cat-row";
    const outstanding = entry.cost - entry.paid;
    const overdueTag = entry.overdue > 0
      ? ` <span class="badge badge--danger">${entry.overdue} ${t("overdue")}</span>`
      : "";
    row.innerHTML = `<span class="vendor-cat-name">${_escDash(cat)}</span>
      <span class="vendor-cat-stat">₪${entry.paid.toLocaleString()} / ₪${entry.cost.toLocaleString()} ${outstanding > 0 ? `(<span class="u-text-danger">-₪${outstanding.toLocaleString()}</span>)` : "✅"}${overdueTag}</span>`;
    el.appendChild(row);
  });
}

/** @param {string} s */
function _escDash(s) {
  return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── S19.4 Follow-up Pending List Card ────────────────────────────────────

/**
 * Render guests who received an invitation but haven't RSVP'd (sent=true + pending).
 */
export function renderFollowUpList() {
  const el = document.getElementById("dashFollowUpList");
  if (!el) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const pending = guests.filter((g) => g.sent && g.status === "pending");
  const badge = document.getElementById("dashFollowUpBadge");
  if (badge) badge.textContent = String(pending.length);
  if (pending.length === 0) {
    el.textContent = t("followup_none");
    return;
  }
  // F4.1 — Sort by longest-pending first (createdAt or sent date)
  const now = Date.now();
  const sorted = [...pending].sort((a, b) => {
    const aTs = new Date(a.createdAt || 0).getTime();
    const bTs = new Date(b.createdAt || 0).getTime();
    return aTs - bTs; // oldest first
  });
  el.textContent = "";
  sorted.slice(0, 15).forEach((g) => {
    const row = document.createElement("div");
    row.className = "followup-row";
    const name = document.createElement("span");
    name.className = "followup-name";
    name.textContent = `${g.firstName} ${g.lastName || ""}`;
    row.appendChild(name);
    // F4.1 — Show days pending as a timing hint
    const created = g.createdAt ? new Date(g.createdAt) : null;
    if (created) {
      const daysPending = Math.floor((now - created.getTime()) / 86_400_000);
      if (daysPending > 0) {
        const age = document.createElement("span");
        age.className = "followup-age u-text-muted u-text-sm u-ml-sm";
        age.textContent = `${daysPending}d`;
        if (daysPending >= 7) age.classList.add("u-text-warning");
        if (daysPending >= 14) age.classList.replace("u-text-warning", "u-text-danger");
        row.appendChild(age);
      }
    }
    if (g.phone) {
      const phone = document.createElement("a");
      phone.href = `tel:${g.phone}`;
      phone.className = "followup-phone u-text-muted u-ml-sm";
      phone.textContent = g.phone;
      row.appendChild(phone);
    }
    el.appendChild(row);
  });
  if (pending.length > 15) {
    const more = document.createElement("div");
    more.className = "u-text-muted u-text-sm u-mt-xs";
    more.textContent = `+${pending.length - 15} ${t("more_guests")}`;
    el.appendChild(more);
  }
}

// ── S20.4 Invitation Stats Dashboard Card ────────────────────────────────

/**
 * Render mini invitation statistics into #dashInviteStats.
 */
export function renderInvitationStats() {
  const el = document.getElementById("dashInviteStats");
  if (!el) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const total = guests.length;
  const sent = guests.filter((g) => g.sent).length;
  const unsent = total - sent;
  const rsvpd = guests.filter((g) => g.status !== "pending").length;
  const sentPct = total > 0 ? Math.round((sent / total) * 100) : 0;
  const rsvpPct = sent > 0 ? Math.round((rsvpd / sent) * 100) : 0;

  const items = [
    { label: t("stat_sent"), val: String(sent), sub: `${sentPct}%` },
    { label: t("stat_unsent"), val: String(unsent), sub: "" },
    { label: t("invite_rsvp_rate"), val: `${rsvpPct}%`, sub: `${rsvpd}/${sent}` },
  ];
  el.textContent = "";
  items.forEach(({ label, val, sub }) => {
    const item = document.createElement("div");
    item.className = "invite-stat-item";
    item.innerHTML = `<div class="invite-stat-val">${val}</div><div class="invite-stat-label">${_escDash(label)}${sub ? ` <span class="u-text-muted">(${sub})</span>` : ""}</div>`;
    el.appendChild(item);
  });
}

// ── S22.1 Check-in Progress Bar ───────────────────────────────────────────

/**
 * Render a check-in progress bar in #dashCheckinCard.
 */
export function renderCheckinProgress() {
  const card = document.getElementById("dashCheckinCard");
  if (!card) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  const arrived = guests.filter((g) => g.checkedIn).length;
  const pct = confirmed > 0 ? Math.min(100, Math.round((arrived / confirmed) * 100)) : 0;
  const bar = document.getElementById("dashCheckinBar");
  if (bar) bar.style.width = `${pct}%`;
  const label = document.getElementById("dashCheckinLabel");
  if (label) label.textContent = `${arrived} / ${confirmed} (${pct}%)`;
}

// ── S22.5 Confirmed Guest Target Ring ─────────────────────────────────────

/**
 * Render an SVG donut ring in #dashGuestTargetCard showing confirmed vs total invited.
 */
export function renderGuestTargetRing() {
  const svg = document.getElementById("guestTargetRing");
  if (!svg) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const total = guests.length;
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  const R = 48, CX = 60, CY = 60;
  const circ = 2 * Math.PI * R;
  const dash = (pct / 100) * circ;

  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("width", "120");
  svg.setAttribute("height", "120");
  svg.textContent = "";

  // Background circle
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  bg.setAttribute("cx", String(CX));
  bg.setAttribute("cy", String(CY));
  bg.setAttribute("r", String(R));
  bg.setAttribute("fill", "none");
  bg.setAttribute("stroke", "var(--card-border)");
  bg.setAttribute("stroke-width", "10");
  svg.appendChild(bg);

  // Progress arc
  if (pct > 0) {
    const arc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    arc.setAttribute("cx", String(CX));
    arc.setAttribute("cy", String(CY));
    arc.setAttribute("r", String(R));
    arc.setAttribute("fill", "none");
    arc.setAttribute("stroke", "var(--color-success, #22c55e)");
    arc.setAttribute("stroke-width", "10");
    arc.setAttribute("stroke-linecap", "round");
    arc.setAttribute("stroke-dasharray", `${dash} ${circ}`);
    arc.setAttribute("stroke-dashoffset", String(circ / 4));
    arc.setAttribute("transform", `rotate(-90 ${CX} ${CY})`);
    svg.appendChild(arc);
  }

  // Centre label
  const textPct = document.createElementNS("http://www.w3.org/2000/svg", "text");
  textPct.setAttribute("x", String(CX));
  textPct.setAttribute("y", String(CY - 4));
  textPct.setAttribute("text-anchor", "middle");
  textPct.setAttribute("dominant-baseline", "middle");
  textPct.setAttribute("font-size", "18");
  textPct.setAttribute("font-weight", "700");
  textPct.setAttribute("fill", "var(--text-primary)");
  textPct.textContent = `${pct}%`;
  svg.appendChild(textPct);

  const textSub = document.createElementNS("http://www.w3.org/2000/svg", "text");
  textSub.setAttribute("x", String(CX));
  textSub.setAttribute("y", String(CY + 14));
  textSub.setAttribute("text-anchor", "middle");
  textSub.setAttribute("font-size", "10");
  textSub.setAttribute("fill", "var(--text-muted)");
  textSub.textContent = `${confirmed}/${total}`;
  svg.appendChild(textSub);
}

// ── S23.4 Suggested Actions Card ─────────────────────────────────────────

/**
 * Render up to 3 actionable suggestions in #dashSuggestedActions.
 */
export function renderSuggestedActions() {
  const container = document.getElementById("dashSuggestedActions");
  if (!container) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const vendors = /** @type {any[]} */ (storeGet("vendors") ?? []);

  /** @type {{ icon: string; text: string; action: string; arg: string }[]} */
  const actions = [];
  const now = new Date();

  const unsentPending = guests.filter((g) => !g.sent && g.status === "pending");
  if (unsentPending.length > 0) {
    actions.push({
      icon: "📱",
      text: (t("tip_send_invitations") || "שלח הזמנה ל-{n} אורחים").replace("{n}", String(unsentPending.length)),
      action: "showSection",
      arg: "whatsapp",
    });
  }

  const sentPending = guests.filter((g) => g.sent && g.status === "pending");
  if (sentPending.length > 0) {
    actions.push({
      icon: "🔔",
      text: (t("tip_follow_up_pending") || "עקוב אחר {n} ממתינים").replace("{n}", String(sentPending.length)),
      action: "showSection",
      arg: "whatsapp",
    });
  }

  const overdue = vendors.filter(
    (v) => v.dueDate && new Date(v.dueDate) < now && (v.paid || 0) < (v.price || 0),
  );
  if (overdue.length > 0) {
    actions.push({
      icon: "💸",
      text: (t("tip_overdue_vendors") || "{n} ספקים עם תשלום באיחור").replace("{n}", String(overdue.length)),
      action: "showSection",
      arg: "vendors",
    });
  }

  const confirmedUnseated = guests.filter(
    (g) => g.status === "confirmed" && !g.tableId,
  );
  if (confirmedUnseated.length > 0) {
    actions.push({
      icon: "🪑",
      text: (t("tip_unseated_confirmed") || "{n} אורחים מאושרים ללא שולחן").replace("{n}", String(confirmedUnseated.length)),
      action: "showSection",
      arg: "tables",
    });
  }

  container.textContent = "";
  if (actions.length === 0) {
    container.textContent = t("all_actions_done") || "✅ הכל מסודר!";
    return;
  }

  actions.slice(0, 3).forEach(({ icon, text, action, arg }) => {
    const btn = document.createElement("button");
    btn.className = "suggestion-item";
    btn.dataset.action = action;
    btn.dataset.actionArg = arg;
    const iconEl = document.createElement("span");
    iconEl.className = "suggestion-icon";
    iconEl.textContent = icon;
    const textEl = document.createElement("span");
    textEl.className = "suggestion-text";
    textEl.textContent = text;
    btn.appendChild(iconEl);
    btn.appendChild(textEl);
    container.appendChild(btn);
  });
}

// ── S24.3 Gift Progress Widget ────────────────────────────────────────────

/**
 * Show how many confirmed guests have a gift recorded in #dashGiftProgress.
 */
export function renderGiftProgress() {
  const el = document.getElementById("dashGiftProgress");
  if (!el) return;
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const confirmed = guests.filter((g) => g.status === "confirmed");
  const withGift = confirmed.filter((g) => g.gift && String(g.gift).trim());
  const pct = confirmed.length > 0 ? Math.round((withGift.length / confirmed.length) * 100) : 0;
  const bar = document.getElementById("dashGiftBar");
  if (bar) /** @type {HTMLElement} */ (bar).style.width = `${pct}%`;
  el.textContent = `${withGift.length} / ${confirmed.length} (${pct}%)`;
}

// ── S24.5 Next Timeline Event Widget ─────────────────────────────────────

/**
 * Show the next upcoming timeline event in #dashNextEventContent.
 * Hides #dashNextEventCard if no upcoming events found.
 */
export function renderNextTimelineEvent() {
  const card = document.getElementById("dashNextEventCard");
  if (!card) return;
  const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
  const info = /** @type {Record<string,unknown>} */ (storeGet("weddingInfo") ?? {});
  const weddingDateStr = /** @type {string} */ (info.date ?? "");

  if (!weddingDateStr || items.length === 0) {
    /** @type {HTMLElement} */ (card).hidden = true;
    return;
  }

  const now = new Date();
  const baseDate = new Date(new Date(weddingDateStr).toDateString());

  const upcoming = items
    .filter((item) => {
      if (!item.time) return false;
      const [hh, mm] = String(item.time).split(":").map(Number);
      if (isNaN(hh) || isNaN(mm)) return false;
      const ts = new Date(baseDate);
      ts.setHours(hh, mm, 0, 0);
      return ts.getTime() >= now.getTime();
    })
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));

  const next = upcoming[0];
  const content = document.getElementById("dashNextEventContent");
  if (!content) return;

  if (!next) {
    /** @type {HTMLElement} */ (card).hidden = true;
    return;
  }

  /** @type {HTMLElement} */ (card).hidden = false;
  const [hh, mm] = String(next.time).split(":").map(Number);
  const eventTs = new Date(baseDate);
  eventTs.setHours(hh, mm, 0, 0);
  const diffMins = Math.max(0, Math.round((eventTs.getTime() - now.getTime()) / 60000));
  const isToday = now.toDateString() === baseDate.toDateString();

  let timeStr;
  if (isToday && diffMins < 60) {
    timeStr = (t("dash_next_event_soon") || "בעוד {mins} דקות").replace("{mins}", String(diffMins));
  } else if (isToday) {
    timeStr = (t("dash_next_event_in") || "ב-{time}").replace("{time}", String(next.time));
  } else {
    timeStr = `${t("dash_next_event_at") || "ב-"} ${next.time}`;
  }

  content.textContent = "";
  const iconSpan = document.createElement("span");
  iconSpan.className = "next-event-icon";
  iconSpan.textContent = String(next.icon || "📍");
  const titleSpan = document.createElement("span");
  titleSpan.className = "next-event-title";
  titleSpan.textContent = String(next.title || "");
  const timeSpan = document.createElement("span");
  timeSpan.className = "next-event-time u-text-muted";
  timeSpan.textContent = timeStr;
  content.appendChild(iconSpan);
  content.appendChild(titleSpan);
  content.appendChild(timeSpan);
}
