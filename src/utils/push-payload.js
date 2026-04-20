/**
 * push-payload.js — Web Push notification payload builder (Phase 4.2)
 *
 * Constructs structured push notification payloads for wedding app events.
 * All payload builders return plain objects — no DOM, no network, no state.
 *
 * Payload shape matches the `PushPayload` type from push-notifications.js:
 *   { title, body?, icon?, badge?, tag?, url?, data? }
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_ICON = '/icons/icon-192.png';
const DEFAULT_BADGE = '/icons/badge-72.png';

/** Notification tags — one per category so later notifications collapse the older one */
const TAG = {
  RSVP: 'rsvp',
  CHECKIN: 'checkin',
  VENDOR: 'vendor',
  BUDGET: 'budget',
  TABLE: 'table',
  REMINDER: 'reminder',
  SYSTEM: 'system',
};

// ---------------------------------------------------------------------------
// Payload type
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   title: string,
 *   body?: string,
 *   icon?: string,
 *   badge?: string,
 *   tag?: string,
 *   url?: string,
 *   data?: Record<string, unknown>
 * }} PushPayload
 */

// ---------------------------------------------------------------------------
// RSVP payloads
// ---------------------------------------------------------------------------

/**
 * Guest confirmed attendance.
 * @param {{ firstName?: string, lastName?: string, guestCount?: number, tableName?: string }} guest
 * @returns {PushPayload}
 */
export function buildRsvpConfirmedPayload(guest) {
  const name = [guest.firstName, guest.lastName].filter(Boolean).join(' ') || 'Guest';
  const count = guest.guestCount ?? 1;
  const table = guest.tableName ? ` · ${guest.tableName}` : '';
  return {
    title: `✅ RSVP Confirmed — ${name}`,
    body: `${count} guest${count !== 1 ? 's' : ''}${table}`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: TAG.RSVP,
    url: '#guests',
    data: { type: 'rsvp_confirmed', guestName: name, guestCount: count },
  };
}

/**
 * Guest declined attendance.
 * @param {{ firstName?: string, lastName?: string }} guest
 * @returns {PushPayload}
 */
export function buildRsvpDeclinedPayload(guest) {
  const name = [guest.firstName, guest.lastName].filter(Boolean).join(' ') || 'Guest';
  return {
    title: `❌ RSVP Declined — ${name}`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: TAG.RSVP,
    url: '#guests',
    data: { type: 'rsvp_declined', guestName: name },
  };
}

/**
 * Bulk RSVP milestone reached (e.g. 100 confirmed).
 * @param {{ confirmed: number, total: number }} stats
 * @returns {PushPayload}
 */
export function buildRsvpMilestonePayload(stats) {
  const pct = Math.round((stats.confirmed / Math.max(1, stats.total)) * 100);
  return {
    title: `🎉 ${stats.confirmed} Guests Confirmed`,
    body: `${pct}% of ${stats.total} invited have RSVP'd`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: TAG.RSVP,
    url: '#dashboard',
    data: { type: 'rsvp_milestone', ...stats },
  };
}

// ---------------------------------------------------------------------------
// Check-in payloads
// ---------------------------------------------------------------------------

/**
 * Guest has just checked in at the venue.
 * @param {{ firstName?: string, lastName?: string, tableName?: string }} guest
 * @returns {PushPayload}
 */
export function buildCheckinPayload(guest) {
  const name = [guest.firstName, guest.lastName].filter(Boolean).join(' ') || 'Guest';
  const table = guest.tableName ? ` → ${guest.tableName}` : '';
  return {
    title: `👋 Checked In — ${name}`,
    body: `Welcome${table}`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: TAG.CHECKIN,
    url: '#checkin',
    data: { type: 'checkin', guestName: name },
  };
}

/**
 * Check-in milestone (e.g. 50% arrived).
 * @param {{ checkedIn: number, total: number }} stats
 * @returns {PushPayload}
 */
export function buildCheckinMilestonePayload(stats) {
  const pct = Math.round((stats.checkedIn / Math.max(1, stats.total)) * 100);
  return {
    title: `🚪 ${pct}% Arrived`,
    body: `${stats.checkedIn} of ${stats.total} guests checked in`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: TAG.CHECKIN,
    url: '#checkin',
    data: { type: 'checkin_milestone', ...stats },
  };
}

// ---------------------------------------------------------------------------
// Vendor payloads
// ---------------------------------------------------------------------------

/**
 * Vendor payment is due soon.
 * @param {{ name: string, dueDate: string, amount?: number }} vendor
 * @returns {PushPayload}
 */
export function buildVendorDuePayload(vendor) {
  const amountStr = vendor.amount != null ? ` · ₪${vendor.amount.toLocaleString()}` : '';
  return {
    title: `💸 Payment Due — ${vendor.name}`,
    body: `${vendor.dueDate}${amountStr}`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: TAG.VENDOR,
    url: '#vendors',
    data: { type: 'vendor_due', vendorName: vendor.name, dueDate: vendor.dueDate },
  };
}

// ---------------------------------------------------------------------------
// Budget payloads
// ---------------------------------------------------------------------------

/**
 * Budget threshold exceeded.
 * @param {{ category: string, spent: number, budget: number }} info
 * @returns {PushPayload}
 */
export function buildBudgetAlertPayload(info) {
  const pct = Math.round((info.spent / Math.max(1, info.budget)) * 100);
  return {
    title: `⚠️ Budget Alert — ${info.category}`,
    body: `${pct}% used (₪${info.spent.toLocaleString()} of ₪${info.budget.toLocaleString()})`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: TAG.BUDGET,
    url: '#budget',
    data: { type: 'budget_alert', category: info.category, pct },
  };
}

// ---------------------------------------------------------------------------
// Reminder payloads
// ---------------------------------------------------------------------------

/**
 * RSVP deadline reminder.
 * @param {{ daysLeft: number, pending: number }} info
 * @returns {PushPayload}
 */
export function buildRsvpDeadlinePayload(info) {
  return {
    title: `⏰ RSVP Deadline in ${info.daysLeft} day${info.daysLeft !== 1 ? 's' : ''}`,
    body: `${info.pending} guest${info.pending !== 1 ? 's' : ''} haven't responded yet`,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: TAG.REMINDER,
    url: '#guests',
    data: { type: 'rsvp_deadline', ...info },
  };
}

/**
 * Generic reminder.
 * @param {{ title: string, body?: string, url?: string }} opts
 * @returns {PushPayload}
 */
export function buildReminderPayload(opts) {
  return {
    title: opts.title,
    body: opts.body,
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: TAG.REMINDER,
    url: opts.url ?? '#dashboard',
    data: { type: 'reminder' },
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a push payload object has the required `title` field.
 * Returns an array of error strings (empty if valid).
 * @param {unknown} payload
 * @returns {string[]}
 */
export function validatePushPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('Payload must be an object');
    return errors;
  }
  const p = /** @type {Record<string, unknown>} */ (payload);
  if (!p.title || typeof p.title !== 'string' || !p.title.trim()) {
    errors.push('title is required and must be a non-empty string');
  }
  if (p.body !== undefined && typeof p.body !== 'string') {
    errors.push('body must be a string when present');
  }
  if (p.url !== undefined && typeof p.url !== 'string') {
    errors.push('url must be a string when present');
  }
  return errors;
}

/**
 * Exported tag constants for use in tests and consumers.
 */
export { TAG as PUSH_TAGS, DEFAULT_ICON, DEFAULT_BADGE };
