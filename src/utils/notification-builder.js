/**
 * src/utils/notification-builder.js — In-app notification data builders
 *
 * S58: Pure data factories that produce ready-to-display notification objects
 * for the UI layer (toasts, banners, alert items). No DOM access — consumers
 * decide how to render the returned payload.
 *
 * Each notification object has the shape:
 *   { id, type, severity, title, message, timestamp, data? }
 */

// ── Notification type constants ────────────────────────────────────────────

/** @type {Record<string, string>} */
export const NOTIFICATION_TYPES = Object.freeze({
  // Guest lifecycle
  GUEST_RSVP_CONFIRMED: "guest_rsvp_confirmed",
  GUEST_RSVP_DECLINED: "guest_rsvp_declined",
  GUEST_CHECKED_IN: "guest_checked_in",
  GUEST_ADDED: "guest_added",
  GUEST_UPDATED: "guest_updated",
  // Vendor lifecycle
  VENDOR_PAYMENT_DUE: "vendor_payment_due",
  VENDOR_PAYMENT_MADE: "vendor_payment_made",
  VENDOR_ADDED: "vendor_added",
  // Budget
  BUDGET_OVER_LIMIT: "budget_over_limit",
  BUDGET_MILESTONE: "budget_milestone",
  // System
  SYNC_COMPLETED: "sync_completed",
  SYNC_FAILED: "sync_failed",
  UPDATE_AVAILABLE: "update_available",
  OFFLINE: "offline",
  ONLINE: "online",
});

/** @type {Record<string, string>} */
export const SEVERITY = Object.freeze({
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
});

// ── Private helpers ────────────────────────────────────────────────────────

let _counter = 0;

/** Generates a monotonic notification ID. */
function _nextId() {
  _counter += 1;
  return `notif-${Date.now()}-${_counter}`;
}

/**
 * @param {string} type
 * @param {string} severity
 * @param {string} title
 * @param {string} message
 * @param {unknown} [data]
 * @returns {{id: string; type: string; severity: string; title: string; message: string; timestamp: number; data?: unknown}}
 */
function _build(type, severity, title, message, data) {
  /** @type {{id: string; type: string; severity: string; title: string; message: string; timestamp: number; data?: unknown}} */
  const notif = {
    id: _nextId(),
    type,
    severity,
    title,
    message,
    timestamp: Date.now(),
  };
  if (data !== undefined) notif.data = data;
  return notif;
}

// ── Guest notifications ────────────────────────────────────────────────────

/**
 * Builds a notification for a guest RSVP response.
 * @param {{ name?: string; status?: string; tableNumber?: number | null }} guest
 * @returns {ReturnType<typeof _build>}
 */
export function buildRsvpNotification(guest) {
  const name = guest.name ?? "Guest";
  const confirmed = guest.status === "confirmed";
  const type = confirmed
    ? NOTIFICATION_TYPES.GUEST_RSVP_CONFIRMED
    : NOTIFICATION_TYPES.GUEST_RSVP_DECLINED;
  const severity = confirmed ? SEVERITY.SUCCESS : SEVERITY.INFO;
  const title = confirmed ? "RSVP Confirmed" : "RSVP Declined";
  const message = confirmed
    ? `${name} confirmed attendance`
    : `${name} declined the invitation`;
  return _build(type, severity, title, message, { guest });
}

/**
 * Builds a notification for a guest check-in.
 * @param {{ name?: string; tableNumber?: number | null }} guest
 * @returns {ReturnType<typeof _build>}
 */
export function buildCheckinNotification(guest) {
  const name = guest.name ?? "Guest";
  const table =
    guest.tableNumber != null ? ` — Table ${guest.tableNumber}` : "";
  return _build(
    NOTIFICATION_TYPES.GUEST_CHECKED_IN,
    SEVERITY.SUCCESS,
    "Guest Checked In",
    `${name} has arrived${table}`,
    { guest },
  );
}

/**
 * Builds a notification for a generic guest lifecycle event.
 * @param {"added" | "updated"} type
 * @param {{ name?: string }} guest
 * @returns {ReturnType<typeof _build>}
 */
export function buildGuestNotification(type, guest) {
  const name = guest.name ?? "Guest";
  const notifType =
    type === "added"
      ? NOTIFICATION_TYPES.GUEST_ADDED
      : NOTIFICATION_TYPES.GUEST_UPDATED;
  const title = type === "added" ? "Guest Added" : "Guest Updated";
  const message =
    type === "added"
      ? `${name} has been added to the guest list`
      : `${name}'s details were updated`;
  return _build(notifType, SEVERITY.INFO, title, message, { guest });
}

// ── Vendor notifications ────────────────────────────────────────────────────

/**
 * Builds a notification for a vendor lifecycle event.
 * @param {"added" | "payment_due" | "payment_made"} type
 * @param {{ name?: string; amount?: number; currency?: string }} vendor
 * @returns {ReturnType<typeof _build>}
 */
export function buildVendorNotification(type, vendor) {
  const name = vendor.name ?? "Vendor";
  const amount =
    vendor.amount != null
      ? ` (${vendor.currency ?? "ILS"} ${vendor.amount.toLocaleString()})`
      : "";

  if (type === "payment_due") {
    return _build(
      NOTIFICATION_TYPES.VENDOR_PAYMENT_DUE,
      SEVERITY.WARNING,
      "Payment Due",
      `Payment due for ${name}${amount}`,
      { vendor },
    );
  }
  if (type === "payment_made") {
    return _build(
      NOTIFICATION_TYPES.VENDOR_PAYMENT_MADE,
      SEVERITY.SUCCESS,
      "Payment Recorded",
      `Payment recorded for ${name}${amount}`,
      { vendor },
    );
  }
  // "added"
  return _build(
    NOTIFICATION_TYPES.VENDOR_ADDED,
    SEVERITY.INFO,
    "Vendor Added",
    `${name} has been added to your vendor list`,
    { vendor },
  );
}

// ── Budget notifications ────────────────────────────────────────────────────

/**
 * Builds a budget over-limit or milestone notification.
 * @param {{ spent: number; budget: number; currency?: string; milestone?: number }} info
 * @returns {ReturnType<typeof _build>}
 */
export function buildBudgetNotification(info) {
  const cur = info.currency ?? "ILS";
  const over = info.spent > info.budget;

  if (over) {
    const excess = (info.spent - info.budget).toLocaleString();
    return _build(
      NOTIFICATION_TYPES.BUDGET_OVER_LIMIT,
      SEVERITY.ERROR,
      "Budget Exceeded",
      `You are ${cur} ${excess} over budget`,
      { spent: info.spent, budget: info.budget, currency: cur },
    );
  }

  const pct = info.milestone ?? Math.round((info.spent / info.budget) * 100);
  return _build(
    NOTIFICATION_TYPES.BUDGET_MILESTONE,
    SEVERITY.WARNING,
    "Budget Milestone",
    `${pct}% of the budget has been used`,
    { spent: info.spent, budget: info.budget, currency: cur, milestone: pct },
  );
}

// ── System notifications ────────────────────────────────────────────────────

/**
 * Builds a system-level notification.
 * @param {"sync_completed" | "sync_failed" | "update_available" | "offline" | "online"} key
 * @param {unknown} [data]
 * @returns {ReturnType<typeof _build>}
 */
export function buildSystemNotification(key, data) {
  switch (key) {
    case "sync_completed":
      return _build(
        NOTIFICATION_TYPES.SYNC_COMPLETED,
        SEVERITY.SUCCESS,
        "Sync Complete",
        "Your data has been synced to the cloud",
        data,
      );
    case "sync_failed":
      return _build(
        NOTIFICATION_TYPES.SYNC_FAILED,
        SEVERITY.ERROR,
        "Sync Failed",
        "Could not sync — changes saved locally",
        data,
      );
    case "update_available":
      return _build(
        NOTIFICATION_TYPES.UPDATE_AVAILABLE,
        SEVERITY.INFO,
        "Update Available",
        "A new version is ready — refresh to update",
        data,
      );
    case "offline":
      return _build(
        NOTIFICATION_TYPES.OFFLINE,
        SEVERITY.WARNING,
        "You are offline",
        "Changes will sync when back online",
        data,
      );
    case "online":
      return _build(
        NOTIFICATION_TYPES.ONLINE,
        SEVERITY.SUCCESS,
        "Back online",
        "Connection restored",
        data,
      );
    default:
      return _build(
        `system_${key}`,
        SEVERITY.INFO,
        "System Notice",
        String(key),
        data,
      );
  }
}
