/**
 * src/services/analytics.js — Unified analytics service (S238)
 *
 * Merged from:
 *   - financial-analytics.js (S216) — expense + vendor analytics (pure functions)
 *   - guest-analytics.js     (S216) — guest RSVP + invitation analytics (pure functions)
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
 */

import { storeGet, storeSet } from "../core/store.js";
import { enqueueWrite } from "./sheets.js";

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
