/**
 * src/core/defaults.js — Default data + store definition builder
 *
 * Extracted from main.js (v6.0-S5) to keep bootstrap under 200 LOC.
 * Provides the default wedding info template and the factory function
 * that builds initial store definitions from localStorage.
 */

import { load } from "./state.js";
import { isPiiKey, loadPii } from "../services/compliance.js";

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
  venueLat: "",
  venueLon: "",
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
 * Load a store value — uses encrypted storage for PII keys,
 * plain localStorage for others.
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {Promise<T>}
 */
async function _load(key, fallback) {
  if (isPiiKey(key)) return loadPii(key, fallback);
  return /** @type {T} */ (load(key, fallback) ?? fallback);
}

/**
 * Build store definitions from the CURRENT event's localStorage.
 * Async because PII keys are loaded from encrypted storage.
 * @returns {Promise<Record<string, { value: unknown, storageKey?: string }>>}
 */
export async function buildStoreDefs() {
  const savedInfo = /** @type {Record<string, string>} */ (await _load("weddingInfo", {}));
  const weddingInfo = { ...defaultWeddingInfo, ...savedInfo };

  const savedTimeline = await _load("timeline", null);
  const timeline =
    savedTimeline && /** @type {any[]} */ (savedTimeline).length > 0
      ? savedTimeline
      : defaultTimeline;

  return {
    guests: { value: await _load("guests", []), storageKey: "guests" },
    campaigns: { value: await _load("campaigns", []), storageKey: "campaigns" },
    approvedEmails: {
      value: await _load("approvedEmails", []),
      storageKey: "approvedEmails",
    },
    auditLog: { value: await _load("auditLog", []), storageKey: "auditLog" },
    backendType: { value: await _load("backendType", ""), storageKey: "backendType" },
    tables: { value: await _load("tables", []), storageKey: "tables" },
    vendors: { value: await _load("vendors", []), storageKey: "vendors" },
    expenses: { value: await _load("expenses", []), storageKey: "expenses" },
    donationGoals: {
      value: await _load("donationGoals", []),
      storageKey: "donationGoals",
    },
    donations: { value: await _load("donations", []), storageKey: "donations" },
    appErrors: { value: await _load("appErrors", []), storageKey: "appErrors" },
    weddingInfo: { value: weddingInfo, storageKey: "weddingInfo" },
    gallery: { value: await _load("gallery", []), storageKey: "gallery" },
    timeline: { value: timeline, storageKey: "timeline" },
    contacts: { value: await _load("contacts", []), storageKey: "contacts" },
    budget: { value: await _load("budget", []), storageKey: "budget" },
    budgetEnvelopes: {
      value: await _load("budgetEnvelopes", {}),
      storageKey: "budgetEnvelopes",
    },
    checkinSessions: {
      value: await _load("checkinSessions", []),
      storageKey: "checkinSessions",
    },
    deliveries: { value: await _load("deliveries", []), storageKey: "deliveries" },
    issuedTokens: {
      value: await _load("issuedTokens", []),
      storageKey: "issuedTokens",
    },
    notificationPreferences: {
      value: await _load("notificationPreferences", {}),
      storageKey: "notificationPreferences",
    },
    offline_queue: {
      value: await _load("offline_queue", []),
      storageKey: "offline_queue",
    },
    push_subscriptions: {
      value: await _load("push_subscriptions", []),
      storageKey: "push_subscriptions",
    },
    rsvp_log: { value: await _load("rsvp_log", []), storageKey: "rsvp_log" },
    seatingConstraints: {
      value: await _load("seatingConstraints", []),
      storageKey: "seatingConstraints",
    },
    sheetsWebAppUrl: {
      value: await _load("sheetsWebAppUrl", ""),
      storageKey: "sheetsWebAppUrl",
    },
    supabaseAnonKey: {
      value: await _load("supabaseAnonKey", ""),
      storageKey: "supabaseAnonKey",
    },
    supabaseUrl: { value: await _load("supabaseUrl", ""), storageKey: "supabaseUrl" },
    timelineDone: {
      value: await _load("timelineDone", {}),
      storageKey: "timelineDone",
    },
    commLog: { value: await _load("commLog", []), storageKey: "commLog" },
    webhookDeliveries: {
      value: await _load("webhookDeliveries", []),
      storageKey: "webhookDeliveries",
    },
    webhooks: { value: await _load("webhooks", []), storageKey: "webhooks" },
  };
}
