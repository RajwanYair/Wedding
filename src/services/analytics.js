/**
 * src/services/analytics.js — Unified analytics + search service (S238 + S279 + S281)
 *
 * Merged from:
 *   - financial-analytics.js (S216) — expense + vendor analytics (pure functions)
 *   - guest-analytics.js     (S216) — guest RSVP + invitation analytics (pure functions)
 *   - budget-burndown.js     (S193) — budget burn-down + envelope tracker
 *   - search-index.js        (S109) — Cmd-K command palette index
 *
 * Pure functions — no DOM, no network.
 *
 * Public API:
 *   Financial:  getTotalExpenses · groupByCategory · getTopCategories · getMonthlyTotals
 *               getBudgetUtilization · getVendorPaymentSummary · getVendorsByCategory
 *               getOverdueVendors · getPaymentsByMonth · buildPaymentTimeline
 *               buildOutstandingByVendor · topVendorsByCost
 *   Guest RSVP: getRsvpFunnel · getRsvpConversionRates · unseatedConfirmedCount
 *               buildRsvpFunnel · rsvpConversionRate
 *   Invitations: recordEvent · getGuestEvents · getEventsByType · uniqueOpens
 *                uniqueClicks · uniqueRsvps · getAnalyticsSummary · clearAnalytics
 *   Search:     buildSearchIndex · searchIndex
 */

import { storeGet, storeSet } from "../core/store.js";
import { enqueueWrite } from "./sheets.js";
import { t as _t } from "../core/i18n.js";
import { SECTION_LIST } from "../core/constants.js";

// ═══════════════════════════════════════════════════════════════════════════
// § 1 — Expense Analytics (from financial-analytics.js)
// ═══════════════════════════════════════════════════════════════════════════

const _EXPENSE_KEY = "expenses";

/**
 * @typedef {{ id: string, category: string, description: string,
 *   amount: number, date: string, createdAt: string }} Expense
 */

/** @returns {Expense[]} */
function _allExpenses() {
  const raw = storeGet(_EXPENSE_KEY);
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Sum all expenses.
 * @returns {number}
 */
export function getTotalExpenses() {
  return _allExpenses().reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

/**
 * Group expenses by category with subtotals.
 * @returns {Record<string, { count: number, total: number, items: Expense[] }>}
 */
export function groupByCategory() {
  /** @type {Record<string, { count: number, total: number, items: Expense[] }>} */
  const result = {};
  for (const e of _allExpenses()) {
    const cat = e.category ?? "other";
    if (!result[cat]) result[cat] = { count: 0, total: 0, items: [] };
    result[cat].count += 1;
    result[cat].total += e.amount ?? 0;
    result[cat].items.push(e);
  }
  return result;
}

/**
 * Return the top N categories by spend.
 * @param {number} [n=5]
 * @returns {{ category: string, total: number, count: number }[]}
 */
export function getTopCategories(n = 5) {
  return Object.entries(groupByCategory())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

/**
 * Monthly expense totals.
 * @returns {{ month: string, total: number }[]}   sorted ascending by month
 */
export function getMonthlyTotals() {
  /** @type {Record<string, number>} */
  const months = {};
  for (const e of _allExpenses()) {
    if (!e.date) continue;
    const month = e.date.slice(0, 7); // "YYYY-MM"
    months[month] = (months[month] ?? 0) + (e.amount ?? 0);
  }
  return Object.entries(months)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => (a.month > b.month ? 1 : -1));
}

/**
 * Budget utilisation as a ratio (0–1+).
 * @param {number} budget  Total budget
 * @returns {{ spent: number, remaining: number, utilizationRate: number, isOver: boolean }}
 */
export function getBudgetUtilization(budget) {
  const spent = getTotalExpenses();
  return {
    spent,
    remaining: budget - spent,
    utilizationRate: budget > 0 ? spent / budget : 0,
    isOver: spent > budget,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// § 2 — Vendor Analytics (from financial-analytics.js)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {{ id: string, name?: string, category?: string,
 *   price?: number, paid?: number, dueDate?: string, updatedAt?: string }} VendorRecord
 *
 * @typedef {{ total: number, paid: number, remaining: number, paymentRate: number }} VendorPaymentSummary
 */

/** @returns {VendorRecord[]} */
function _allVendors() {
  const raw = storeGet("vendors");
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Overall payment summary across all vendors.
 * @returns {VendorPaymentSummary}
 */
export function getVendorPaymentSummary() {
  const vendors = _allVendors();
  const total = vendors.reduce((sum, v) => sum + (v.price ?? 0), 0);
  const paid = vendors.reduce((sum, v) => sum + (v.paid ?? 0), 0);
  const remaining = total - paid;
  const paymentRate = total > 0 ? paid / total : 0;
  return { total, paid, remaining, paymentRate };
}

/**
 * Per-category payment totals.
 * @returns {{ category: string, total: number, paid: number, remaining: number }[]}
 */
export function getVendorsByCategory() {
  const vendors = _allVendors();
  /** @type {Map<string, { total: number, paid: number }>} */
  const map = new Map();
  for (const v of vendors) {
    const cat = v.category ?? "—";
    const existing = map.get(cat) ?? { total: 0, paid: 0 };
    existing.total += v.price ?? 0;
    existing.paid += v.paid ?? 0;
    map.set(cat, existing);
  }
  return Array.from(map.entries()).map(([category, { total, paid }]) => ({
    category,
    total,
    paid,
    remaining: total - paid,
  }));
}

/**
 * Vendors with a due date in the past and remaining balance > 0.
 * @param {Date} [now]
 * @returns {VendorRecord[]}
 */
export function getOverdueVendors(now = new Date()) {
  return _allVendors().filter((v) => {
    if (!v.dueDate) return false;
    const remaining = (v.price ?? 0) - (v.paid ?? 0);
    return remaining > 0 && new Date(v.dueDate) < now;
  });
}

/**
 * Monthly breakdown of cumulative payments, ordered chronologically.
 * @returns {{ month: string, paid: number }[]}
 */
export function getPaymentsByMonth() {
  const vendors = _allVendors().filter((v) => (v.paid ?? 0) > 0 && v.updatedAt);

  /** @type {Map<string, number>} */
  const monthMap = new Map();
  for (const v of vendors) {
    const d = new Date(/** @type {string} */ (v.updatedAt));
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + (v.paid ?? 0));
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, paid]) => ({ month, paid }));
}

// ── Timeline helpers ─────────────────────────────────────────────────────────

/** @typedef {{ id: string, name: string, cost?: number, paid?: number, dueDate?: string, category?: string }} VendorInput */
/** @typedef {{ vendorId: string, amount: number, paidAt: string, note?: string }} PaymentInput */
/** @typedef {{ date: string, paid: number, cumulative: number }} TimelinePoint */

const _ymd = (/** @type {string} */ s) => {
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
};

/**
 * Build a daily-aggregated payment timeline (ascending).
 * @param {PaymentInput[]} payments
 * @returns {TimelinePoint[]}
 */
export function buildPaymentTimeline(payments) {
  /** @type {Map<string, number>} */
  const perDay = new Map();
  for (const p of payments ?? []) {
    if (typeof p.amount !== "number" || p.amount <= 0) continue;
    const d = _ymd(p.paidAt);
    if (!d) continue;
    perDay.set(d, (perDay.get(d) ?? 0) + p.amount);
  }
  const dates = Array.from(perDay.keys()).sort();
  let cum = 0;
  return dates.map((date) => {
    const paid = perDay.get(date) ?? 0;
    cum += paid;
    return { date, paid, cumulative: cum };
  });
}

/**
 * Per-vendor outstanding balance (cost - paid). Sorted by outstanding desc.
 * @param {VendorInput[]} vendors
 */
export function buildOutstandingByVendor(vendors) {
  return (vendors ?? [])
    .map((v) => {
      const cost = Number(v.cost ?? 0);
      const paid = Number(v.paid ?? 0);
      return {
        vendorId: v.id,
        name: v.name,
        cost,
        paid,
        outstanding: Math.max(cost - paid, 0),
        overpaid: paid > cost ? paid - cost : 0,
      };
    })
    .sort((a, b) => b.outstanding - a.outstanding);
}

/**
 * Top-N vendors by total cost.
 * @param {VendorInput[]} vendors
 * @param {number} [n=5]
 */
export function topVendorsByCost(vendors, n = 5) {
  return (vendors ?? [])
    .map((v) => ({ id: v.id, name: v.name, cost: Number(v.cost ?? 0) }))
    .filter((v) => v.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, Math.max(0, n));
}

// ═══════════════════════════════════════════════════════════════════════════
// § 3 — Guest RSVP Analytics (from guest-analytics.js)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {{ id: string, firstName?: string, status?: string,
 *   phone?: string, tableId?: string, count?: number }} GuestRecord
 *
 * @typedef {{
 *   invited:   number,
 *   reachable: number,
 *   responded: number,
 *   confirmed: number,
 *   attending: number,
 *   seated:    number,
 * }} RsvpFunnelStages
 */

/** @returns {GuestRecord[]} */
function _allGuests() {
  const raw = storeGet("guests");
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Compute the 6-stage RSVP funnel counts.
 * @returns {RsvpFunnelStages}
 */
export function getRsvpFunnel() {
  const guests = _allGuests();
  const invited = guests.length;
  const reachable = guests.filter((g) => g.phone && String(g.phone).trim() !== "").length;
  const responded = guests.filter((g) => g.status && g.status !== "pending").length;
  const confirmed = guests.filter((g) => g.status === "confirmed").length;
  const attending = guests
    .filter((g) => g.status === "confirmed")
    .reduce((sum, g) => sum + (g.count ?? 1), 0);
  const seated = guests.filter((g) => g.status === "confirmed" && g.tableId).length;

  return { invited, reachable, responded, confirmed, attending, seated };
}

/**
 * Compute conversion rates between adjacent stages.
 * Returns 0 when the denominator is 0.
 * @returns {Record<string, number>}   values between 0 and 1
 */
export function getRsvpConversionRates() {
  const f = getRsvpFunnel();
  return {
    invitedToReachable: f.invited > 0 ? f.reachable / f.invited : 0,
    reachableToResponded: f.reachable > 0 ? f.responded / f.reachable : 0,
    respondedToConfirmed: f.responded > 0 ? f.confirmed / f.responded : 0,
    confirmedToSeated: f.confirmed > 0 ? f.seated / f.confirmed : 0,
    overallRate: f.invited > 0 ? f.confirmed / f.invited : 0,
  };
}

/**
 * Compute the no-show risk count — confirmed guests not yet seated.
 * @returns {number}
 */
export function unseatedConfirmedCount() {
  return _allGuests().filter((g) => g.status === "confirmed" && !g.tableId).length;
}

// ── Funnel chart helpers ─────────────────────────────────────────────────────

/** @typedef {{ id: string, status?: "confirmed"|"pending"|"declined"|"maybe", invited?: boolean, sent?: boolean, opened?: boolean, respondedAt?: string|null }} GuestRsvp */
/** @typedef {{ key: string, label: string, count: number, pct: number, dropoff: number }} FunnelStep */

/**
 * Build a 5-stage RSVP funnel for chart consumption.
 * @param {GuestRsvp[]} guests
 * @returns {FunnelStep[]}
 */
export function buildRsvpFunnel(guests) {
  const list = Array.isArray(guests) ? guests : [];
  const invited = list.filter((g) => g.invited !== false).length;
  const sent = list.filter((g) => g.sent === true).length;
  const opened = list.filter((g) => g.opened === true).length;
  const responded = list.filter(
    (g) => Boolean(g.respondedAt) || g.status === "confirmed" || g.status === "declined",
  ).length;
  const confirmed = list.filter((g) => g.status === "confirmed").length;

  const top = invited;
  /** @type {Array<[string,string,number]>} */
  const raw = [
    ["invited", "Invited", invited],
    ["sent", "Sent", sent],
    ["opened", "Opened", opened],
    ["responded", "Responded", responded],
    ["confirmed", "Confirmed", confirmed],
  ];
  let prev = top;
  return raw.map(([key, label, count]) => {
    const pct = top > 0 ? count / top : 0;
    const dropoff = prev > 0 ? Math.max(0, (prev - count) / prev) : 0;
    prev = count;
    return { key, label, count, pct, dropoff };
  });
}

/**
 * Conversion rate of `respondedAt` → `confirmed`. 0 when no responses.
 * @param {GuestRsvp[]} guests
 * @returns {number}
 */
export function rsvpConversionRate(guests) {
  const list = Array.isArray(guests) ? guests : [];
  const responded = list.filter(
    (g) => Boolean(g.respondedAt) || g.status === "confirmed" || g.status === "declined",
  ).length;
  if (responded === 0) return 0;
  const confirmed = list.filter((g) => g.status === "confirmed").length;
  return confirmed / responded;
}

// ═══════════════════════════════════════════════════════════════════════════
// § 4 — Invitation Event Analytics (from guest-analytics.js)
// ═══════════════════════════════════════════════════════════════════════════

const _INVITE_KEY = "invitationAnalytics";

/**
 * @typedef {{ guestId: string, type: "open"|"click"|"rsvp",
 *   timestamp: string, meta?: Record<string, unknown> }} AnalyticsEvent
 */

/** @returns {AnalyticsEvent[]} */
function _allEvents() {
  return storeGet(_INVITE_KEY) ?? [];
}
function _saveEvents(/** @type {any[]} */ list) {
  storeSet(_INVITE_KEY, list);
  enqueueWrite(_INVITE_KEY, () => Promise.resolve());
}

/**
 * Record an analytics event for a guest invitation.
 * @param {string} guestId
 * @param {"open"|"click"|"rsvp"} type
 * @param {Record<string, unknown>} [meta]
 */
export function recordEvent(guestId, type, meta = {}) {
  if (!guestId) throw new Error("guestId required");
  if (!["open", "click", "rsvp"].includes(type)) throw new Error(`Unknown event type: ${type}`);
  _saveEvents([..._allEvents(), { guestId, type, timestamp: new Date().toISOString(), meta }]);
}

/**
 * Get all events for a guest.
 * @param {string} guestId
 * @returns {AnalyticsEvent[]}
 */
export function getGuestEvents(guestId) {
  return _allEvents().filter((e) => e.guestId === guestId);
}

/**
 * Get events of a specific type.
 * @param {"open"|"click"|"rsvp"} type
 * @returns {AnalyticsEvent[]}
 */
export function getEventsByType(type) {
  return _allEvents().filter((e) => e.type === type);
}

/**
 * Count of unique guests who opened the invitation.
 * @returns {number}
 */
export function uniqueOpens() {
  return new Set(
    _allEvents()
      .filter((e) => e.type === "open")
      .map((e) => e.guestId),
  ).size;
}

/**
 * Count of unique guests who clicked a link.
 * @returns {number}
 */
export function uniqueClicks() {
  return new Set(
    _allEvents()
      .filter((e) => e.type === "click")
      .map((e) => e.guestId),
  ).size;
}

/**
 * Count of unique guests who completed RSVP.
 * @returns {number}
 */
export function uniqueRsvps() {
  return new Set(
    _allEvents()
      .filter((e) => e.type === "rsvp")
      .map((e) => e.guestId),
  ).size;
}

/**
 * Summary: total events, unique guests, conversion metrics.
 * @returns {{ totalEvents: number, uniqueGuests: number, opens: number, clicks: number, rsvps: number, conversionRate: number }}
 */
export function getAnalyticsSummary() {
  const events = _allEvents();
  const totalEvents = events.length;
  const uniqueGuests = new Set(events.map((e) => e.guestId)).size;
  const opens = uniqueOpens();
  const clicks = uniqueClicks();
  const rsvps = uniqueRsvps();
  const totalInvited = _allGuests().length;
  return {
    totalEvents,
    uniqueGuests,
    opens,
    clicks,
    rsvps,
    conversionRate: totalInvited > 0 ? rsvps / totalInvited : 0,
  };
}

/**
 * Funnel rates relative to total invited.
 * @param {number} totalInvited
 * @returns {{ openRate: number, clickRate: number, conversionRate: number }}
 */
export function getFunnelStats(totalInvited) {
  const opens = uniqueOpens();
  const clicks = uniqueClicks();
  const rsvps = uniqueRsvps();
  if (totalInvited === 0) return { openRate: 0, clickRate: 0, conversionRate: 0 };
  return {
    openRate: opens / totalInvited,
    clickRate: clicks / totalInvited,
    conversionRate: rsvps / totalInvited,
  };
}

/**
 * Clear all invitation analytics data.
 */
export function clearAnalytics() {
  storeSet(_INVITE_KEY, []);
}

// ═══════════════════════════════════════════════════════════════════════════
// § 4 — Budget burn-down + envelope tracker (from budget-burndown.js, S193)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {{ date: string, cumulative: number, target: number }} BurndownPoint
 * @typedef {{ points: BurndownPoint[], totalBudget: number, totalSpent: number }} BurndownData
 */

/** @returns {{ amount: number, createdAt?: string, updatedAt?: string }[]} */
function _allBudgetExpenses() {
  const raw = storeGet("expenses");
  if (!raw) return [];
  return Array.isArray(raw) ? raw : Object.values(raw);
}

/**
 * Compute cumulative spend timeline for a burn-down chart.
 *
 * @param {number} [budgetTarget]  Total budget ceiling; defaults to weddingInfo.budget or 0.
 * @returns {BurndownData}
 */
export function getBurndownData(budgetTarget) {
  const info = /** @type {any} */ (storeGet("weddingInfo") ?? {});
  const target = budgetTarget ?? (typeof info.budget === "number" ? info.budget : 0);

  const expenses = _allBudgetExpenses().filter((e) => {
    const ts = e.createdAt ?? e.updatedAt;
    return ts && !Number.isNaN(new Date(ts).getTime());
  });

  // Sort by creation date
  expenses.sort((a, b) => {
    const ta = new Date(a.createdAt ?? a.updatedAt ?? 0).getTime();
    const tb = new Date(b.createdAt ?? b.updatedAt ?? 0).getTime();
    return ta - tb;
  });

  let cumulative = 0;
  /** @type {BurndownPoint[]} */
  const points = expenses.map((e) => {
    cumulative += e.amount ?? 0;
    const rawDate = e.createdAt ?? e.updatedAt ?? "";
    const date = rawDate.slice(0, 10); // YYYY-MM-DD
    return { date, cumulative, target };
  });

  return { points, totalBudget: target, totalSpent: cumulative };
}

/**
 * Estimated date when spending reaches the budget target.
 * Returns null if there are fewer than 2 data points or no remaining budget.
 *
 * @param {number} [budgetTarget]
 * @returns {string|null}  ISO date string (YYYY-MM-DD) or null
 */
export function getProjectedEndDate(budgetTarget) {
  const { points, totalBudget } = getBurndownData(budgetTarget);
  if (points.length < 2 || totalBudget <= 0) return null;

  const first = /** @type {NonNullable<(typeof points)[number]>} */ (points[0]);
  const last = /** @type {NonNullable<(typeof points)[number]>} */ (points[points.length - 1]);
  if (last.cumulative >= totalBudget) return last.date;

  const msDiff = new Date(last.date).getTime() - new Date(first.date).getTime();
  const spendDiff = last.cumulative - first.cumulative;
  if (spendDiff <= 0) return null;

  const msPerUnit = msDiff / spendDiff;
  const remaining = totalBudget - last.cumulative;
  const projectedMs = new Date(last.date).getTime() + remaining * msPerUnit;
  return new Date(projectedMs).toISOString().slice(0, 10);
}

/**
 * Percentage of budget consumed.
 * @param {number} [budgetTarget]
 * @returns {number}  0–100
 */
export function getBudgetConsumptionPct(budgetTarget) {
  const { points, totalBudget } = getBurndownData(budgetTarget);
  if (totalBudget <= 0 || points.length === 0) return 0;
  const lastPt = points[points.length - 1];
  return Math.min(100, Math.round(((lastPt?.cumulative ?? 0) / totalBudget) * 100));
}

// ── Projection helpers ────────────────────────────────────────────────────

/** @typedef {{ amount: number, paidAt: string, category?: string }} ExpenseInput */
/** @typedef {{ date: string, spent: number, remaining: number }} SpendingPoint */

// _ymd helper shared with § 1 (already declared above)

/**
 * Build a per-day burn-down series.
 * @param {number} budgetTotal
 * @param {ExpenseInput[]} expenses
 * @returns {SpendingPoint[]}
 */
export function buildBurndownSeries(budgetTotal, expenses) {
  const total = Math.max(0, Number(budgetTotal) || 0);
  /** @type {Map<string, number>} */
  const perDay = new Map();
  for (const e of expenses ?? []) {
    if (typeof e.amount !== "number" || e.amount <= 0) continue;
    const d = _ymd(e.paidAt);
    if (!d) continue;
    perDay.set(d, (perDay.get(d) ?? 0) + e.amount);
  }
  const dates = Array.from(perDay.keys()).sort();
  let spent = 0;
  return dates.map((date) => {
    spent += perDay.get(date) ?? 0;
    return { date, spent, remaining: total - spent };
  });
}

/**
 * Project total spend at event date using average daily burn.
 * @param {number} budgetTotal
 * @param {ExpenseInput[]} expenses
 * @param {string} eventDate ISO date
 * @param {Date} [now=new Date()]
 */
export function projectOverrun(budgetTotal, expenses, eventDate, now = new Date()) {
  const total = Math.max(0, Number(budgetTotal) || 0);
  const list = (expenses ?? []).filter(
    (e) => typeof e.amount === "number" && e.amount > 0 && _ymd(e.paidAt),
  );
  if (list.length === 0) {
    return { projectedSpend: 0, projectedOverrun: -total, dailyBurn: 0 };
  }
  const sortedMs = list.map((e) => Date.parse(e.paidAt)).sort((a, b) => a - b);
  const first = sortedMs[0] ?? Date.now();
  const todayMs = now.getTime();
  const eventMs = Date.parse(eventDate);
  const daysSoFar = Math.max(1, Math.ceil((todayMs - first) / 86_400_000));
  const spent = list.reduce((s, e) => s + e.amount, 0);
  const dailyBurn = spent / daysSoFar;
  const daysRemaining = Math.max(0, Math.ceil((eventMs - todayMs) / 86_400_000));
  const projectedSpend = spent + dailyBurn * daysRemaining;
  return { projectedSpend, projectedOverrun: projectedSpend - total, dailyBurn };
}

/**
 * Sum spend per category (sorted desc).
 * @param {ExpenseInput[]} expenses
 */
export function categoryBreakdown(expenses) {
  /** @type {Map<string, number>} */
  const perCat = new Map();
  for (const e of expenses ?? []) {
    if (typeof e.amount !== "number" || e.amount <= 0) continue;
    const c = e.category ?? "uncategorised";
    perCat.set(c, (perCat.get(c) ?? 0) + e.amount);
  }
  return Array.from(perCat.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// ── Budget envelope tracker ───────────────────────────────────────────────

/**
 * @typedef {{
 *   category:    string,
 *   limit:       number,
 *   spent:       number,
 *   entries:     { amount: number, note?: string, ts: number }[],
 *   updatedAt:   number,
 * }} BudgetEnvelope
 *
 * @typedef {{ limit: number, spent: number, remaining: number, isOver: boolean, runRate: number }} EnvelopeSummary
 */

/** @returns {Record<string, BudgetEnvelope>} */
function _getEnvelopes() {
  return /** @type {Record<string, BudgetEnvelope>} */ (storeGet("budgetEnvelopes") ?? {});
}

/** @param {Record<string, BudgetEnvelope>} all */
function _saveEnvelopes(all) {
  storeSet("budgetEnvelopes", all);
}

/**
 * Create or overwrite a budget envelope.
 * @param {{ category: string, limit: number }} opts
 */
export function createEnvelope({ category, limit }) {
  if (!category?.trim()) throw new Error("budget-tracker: category is required");
  if (limit < 0) throw new Error("budget-tracker: limit must be >= 0");
  const all = _getEnvelopes();
  all[category] = {
    category,
    limit,
    spent: all[category]?.spent ?? 0,
    entries: all[category]?.entries ?? [],
    updatedAt: Date.now(),
  };
  _saveEnvelopes(all);
}

/**
 * Record a spend against a category.
 * @param {string} category
 * @param {number} amount
 * @param {string} [note]
 * @returns {boolean}
 */
export function recordSpend(category, amount, note) {
  const all = _getEnvelopes();
  const env = all[category];
  if (!env) return false;
  if (amount <= 0) throw new Error("budget-tracker: amount must be > 0");
  env.entries.push({ amount, note, ts: Date.now() });
  env.spent += amount;
  env.updatedAt = Date.now();
  _saveEnvelopes(all);
  return true;
}

/**
 * Get a summary for one envelope.
 * @param {string} category
 * @returns {EnvelopeSummary | null}
 */
export function getEnvelopeSummary(category) {
  const env = _getEnvelopes()[category];
  if (!env) return null;
  const remaining = env.limit - env.spent;
  const runRate = env.entries.length > 0 ? env.spent / env.entries.length : 0;
  return { limit: env.limit, spent: env.spent, remaining, isOver: remaining < 0, runRate };
}

/**
 * Get summaries for all envelopes.
 * @returns {Record<string, EnvelopeSummary>}
 */
export function getAllSummaries() {
  const all = _getEnvelopes();
  /** @type {Record<string, EnvelopeSummary>} */
  const out = {};
  for (const cat of Object.keys(all)) {
    const summary = getEnvelopeSummary(cat);
    if (summary) out[cat] = summary;
  }
  return out;
}

/**
 * Total budget vs total spent across all envelopes.
 * @returns {{ totalLimit: number, totalSpent: number, totalRemaining: number }}
 */
export function getTotalBudget() {
  const envs = Object.values(_getEnvelopes());
  const totalLimit = envs.reduce((s, e) => s + e.limit, 0);
  const totalSpent = envs.reduce((s, e) => s + e.spent, 0);
  return { totalLimit, totalSpent, totalRemaining: totalLimit - totalSpent };
}

/**
 * List categories that are over budget.
 * @returns {string[]}
 */
export function getOverBudgetCategories() {
  return Object.values(_getEnvelopes())
    .filter((e) => e.spent > e.limit)
    .map((e) => e.category);
}


// ══════════════════════════════════════════════════════════════════════════════════════════════════
// §5 — Search index: Cmd-K command palette (from search-index.js, S109)
// ══════════════════════════════════════════════════════════════════════════════════════════════════

/** @typedef {{ id: string, type: "guest"|"table"|"vendor"|"section", label: string, hint?: string }} SearchEntry */

/**
 * Build the command-palette index from current store state.
 * @returns {SearchEntry[]}
 */
export function buildSearchIndex() {
  /** @type {SearchEntry[]} */
  const out = [];

  for (const sectionId of SECTION_LIST) {
    const key = `nav_${sectionId}`;
    const label = (_t(key) || sectionId);
    out.push({ id: `section:${sectionId}`, type: "section", label, hint: sectionId });
  }

  const guests = /** @type {Array<{id:string, name?:string, phone?:string}>} */ (
    storeGet("guests") ?? []
  );
  for (const g of guests) {
    if (!g?.id) continue;
    out.push({ id: `guest:${g.id}`, type: "guest", label: g.name ?? g.id, hint: g.phone ?? "" });
  }

  const tables = /** @type {Array<{id:string, name?:string, capacity?:number}>} */ (
    storeGet("tables") ?? []
  );
  for (const tbl of tables) {
    if (!tbl?.id) continue;
    out.push({
      id: `table:${tbl.id}`,
      type: "table",
      label: tbl.name ?? `#${tbl.id}`,
      hint: tbl.capacity != null ? String(tbl.capacity) : "",
    });
  }

  const vendors = /** @type {Array<{id:string, name?:string, category?:string}>} */ (
    storeGet("vendors") ?? []
  );
  for (const v of vendors) {
    if (!v?.id) continue;
    out.push({ id: `vendor:${v.id}`, type: "vendor", label: v.name ?? v.id, hint: v.category ?? "" });
  }

  return out;
}

/**
 * Score an entry against a query. Higher is better; 0 means no match.
 * @param {SearchEntry} entry
 * @param {string} query lowercase trimmed
 * @returns {number}
 */
function _scoreEntry(entry, query) {
  if (!query) return 1;
  const label = entry.label.toLowerCase();
  if (label === query) return 100;
  if (label.startsWith(query)) return 80;
  if (label.includes(` ${query}`)) return 60;
  if (label.includes(query)) return 40;
  const hint = (entry.hint ?? "").toLowerCase();
  if (hint.includes(query)) return 20;
  return 0;
}

/**
 * Search the index. Returns top-N matches by descending score.
 * @param {SearchEntry[]} index
 * @param {string} query
 * @param {number} [limit=20]
 * @returns {SearchEntry[]}
 */
export function searchIndex(index, query, limit = 20) {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return index.slice(0, limit);
  const scored = /** @type {Array<{e: SearchEntry, s: number}>} */ ([]);
  for (const e of index) {
    const s = _scoreEntry(e, q);
    if (s > 0) scored.push({ e, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.e);
}
