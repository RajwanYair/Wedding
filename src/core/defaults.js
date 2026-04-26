/**
 * src/core/defaults.js — Default data + store definition builder
 *
 * Extracted from main.js (v6.0-S5) to keep bootstrap under 200 LOC.
 * Provides the default wedding info template and the factory function
 * that builds initial store definitions from localStorage.
 */

import { load } from "./state.js";

// ── Default data ──────────────────────────────────────────────────────────

/** @type {Record<string, string>} */
export const defaultWeddingInfo = {
  groom: "",
  bride: "",
  groomEn: "",
  brideEn: "",
  date: "",
  hebrewDate: "",
  time: "18:00",
  ceremonyTime: "19:30",
  rsvpDeadline: "",
  venue: "",
  venueAddress: "",
  venueWaze: "",
  venueMapLink: "",
  budgetTarget: "",
  registryLinks: "[]",
};

export const defaultTimeline = [
  { id: "tl_invite", time: "18:00", title: "קבלת פנים" },
  { id: "tl_bedeken", time: "18:40", title: "כיסוי כלה בהינומה" },
  { id: "tl_chuppah", time: "18:50", title: "חופה" },
];

// ── Store definition builder ──────────────────────────────────────────────

/**
 * Build store definitions from the CURRENT event's localStorage.
 * @returns {Record<string, { value: unknown, storageKey?: string }>}
 */
export function buildStoreDefs() {
  const savedInfo = /** @type {Record<string, string>} */ (load("weddingInfo", {}));
  const weddingInfo = { ...defaultWeddingInfo, ...savedInfo };

  const savedTimeline = load("timeline", null);
  const timeline =
    savedTimeline && /** @type {any[]} */ (savedTimeline).length > 0
      ? savedTimeline
      : defaultTimeline;

  return {
    guests: { value: load("guests", []), storageKey: "guests" },
    campaigns: { value: load("campaigns", []), storageKey: "campaigns" },
    approvedEmails: {
      value: load("approvedEmails", []),
      storageKey: "approvedEmails",
    },
    auditLog: { value: load("auditLog", []), storageKey: "auditLog" },
    backendType: { value: load("backendType", ""), storageKey: "backendType" },
    tables: { value: load("tables", []), storageKey: "tables" },
    vendors: { value: load("vendors", []), storageKey: "vendors" },
    expenses: { value: load("expenses", []), storageKey: "expenses" },
    donationGoals: {
      value: load("donationGoals", []),
      storageKey: "donationGoals",
    },
    donations: { value: load("donations", []), storageKey: "donations" },
    appErrors: { value: load("appErrors", []), storageKey: "appErrors" },
    weddingInfo: { value: weddingInfo, storageKey: "weddingInfo" },
    gallery: { value: load("gallery", []), storageKey: "gallery" },
    timeline: { value: timeline, storageKey: "timeline" },
    contacts: { value: load("contacts", []), storageKey: "contacts" },
    budget: { value: load("budget", []), storageKey: "budget" },
    budgetEnvelopes: {
      value: load("budgetEnvelopes", {}),
      storageKey: "budgetEnvelopes",
    },
    checkinSessions: {
      value: load("checkinSessions", []),
      storageKey: "checkinSessions",
    },
    deliveries: { value: load("deliveries", []), storageKey: "deliveries" },
    issuedTokens: {
      value: load("issuedTokens", []),
      storageKey: "issuedTokens",
    },
    notificationPreferences: {
      value: load("notificationPreferences", {}),
      storageKey: "notificationPreferences",
    },
    offline_queue: {
      value: load("offline_queue", []),
      storageKey: "offline_queue",
    },
    push_subscriptions: {
      value: load("push_subscriptions", []),
      storageKey: "push_subscriptions",
    },
    rsvp_log: { value: load("rsvp_log", []), storageKey: "rsvp_log" },
    seatingConstraints: {
      value: load("seatingConstraints", []),
      storageKey: "seatingConstraints",
    },
    sheetsWebAppUrl: {
      value: load("sheetsWebAppUrl", ""),
      storageKey: "sheetsWebAppUrl",
    },
    supabaseAnonKey: {
      value: load("supabaseAnonKey", ""),
      storageKey: "supabaseAnonKey",
    },
    supabaseUrl: { value: load("supabaseUrl", ""), storageKey: "supabaseUrl" },
    timelineDone: {
      value: load("timelineDone", {}),
      storageKey: "timelineDone",
    },
    commLog: { value: load("commLog", []), storageKey: "commLog" },
    webhookDeliveries: {
      value: load("webhookDeliveries", []),
      storageKey: "webhookDeliveries",
    },
    webhooks: { value: load("webhooks", []), storageKey: "webhooks" },
  };
}
