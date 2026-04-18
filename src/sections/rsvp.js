/**
 * src/sections/rsvp.js — RSVP section ESM module (S0.8)
 *
 * Public-facing RSVP form. Phone-first lookup flow (S2.5 / lookupRsvpByPhone).
 * No window.* dependencies.
 */

import { storeGet, storeSet } from "../core/store.js";
import { t } from "../core/i18n.js";
import { cleanPhone, isValidPhone } from "../utils/phone.js";
import { sanitize } from "../utils/sanitize.js";
import { nowISOJerusalem } from "../utils/date.js";
import { enqueueWrite, appendToRsvpLog, syncStoreKeyToSheets } from "../services/sheets.js";

/** @type {HTMLElement|null} */
let _container = null;

export function mount(container) {
  _container = container;
  // S12.5 — Check RSVP deadline
  if (_isRsvpDeadlinePassed()) {
    _showDeadlineMessage();
    return;
  }
  // S11.1 — Auto-lookup from URL guestId param
  _autoLookupFromUrl();
}

export function unmount() {
  _container = null;
}

// ── S11.1 Auto-lookup from URL ────────────────────────────────────────────

/**
 * If URL contains ?guestId=xxx or ?phone=05x, auto-lookup and pre-fill.
 */
function _autoLookupFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const guestId = params.get("guestId");
  const phone = params.get("phone");

  if (guestId) {
    const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
    const guest = guests.find((g) => g.id === guestId);
    if (guest) {
      _prefillForm(guest);
      const statusEl = document.getElementById("rsvpLookupStatus");
      if (statusEl) {
        statusEl.classList.remove("u-hidden");
        statusEl.textContent = t("rsvp_welcome_name").replace("{name}", `${guest.firstName} ${guest.lastName || ""}`.trim());
      }
      return;
    }
  }
  if (phone) {
    const result = lookupRsvpByPhone(phone);
    const phoneInput = /** @type {HTMLInputElement|null} */ (document.getElementById("rsvpPhone"));
    if (phoneInput) phoneInput.value = phone;
    if (result.found) {
      const statusEl = document.getElementById("rsvpLookupStatus");
      if (statusEl) {
        statusEl.classList.remove("u-hidden");
        statusEl.textContent = t("rsvp_lookup_found");
      }
    }
  }
}

// ── RSVP flow ─────────────────────────────────────────────────────────────

/**
 * Phone-first lookup: search for guest by normalised phone, pre-fill form.
 * @param {string} rawPhone
 * @returns {{ found: boolean, guest?: any }}
 */
export function lookupRsvpByPhone(rawPhone) {
  if (!isValidPhone(rawPhone)) return { found: false };
  const phone = cleanPhone(rawPhone);
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const guest = guests.find((g) => cleanPhone(g.phone || "") === phone);
  if (guest) {
    _prefillForm(guest);
    return { found: true, guest };
  }
  return { found: false };
}

/**
 * Submit the RSVP form.
 * @param {Record<string, unknown>} data
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function submitRsvp(data) {
  const { value, errors } = sanitize(data, {
    phone: { type: "string", required: true },
    firstName: { type: "string", required: false, maxLength: 80 },
    lastName: { type: "string", required: false, maxLength: 80 },
    side: { type: "enum", values: ["groom", "bride", "mutual"], default: "mutual" },
    status: {
      type: "enum",
      values: ["confirmed", "declined", "maybe"],
      required: true,
    },
    count: { type: "number", min: 1, max: 50, default: 1 },
    children: { type: "number", min: 0, max: 20, default: 0 },
    meal: {
      type: "enum",
      values: ["regular", "vegetarian", "vegan", "gluten_free", "kosher", "other"],
      default: "regular",
    },
    accessibility: { type: "string", required: false, maxLength: 10 },
    transport: { type: "string", required: false, maxLength: 60 },
    notes: { type: "string", required: false, maxLength: 500 },
  });
  if (errors.length) return { ok: false, errors };

  const phone = cleanPhone(String(value.phone));
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const idx = guests.findIndex((g) => cleanPhone(g.phone || "") === phone);

  const now = nowISOJerusalem();
  if (idx !== -1) {
    guests[idx] = {
      ...guests[idx],
      status: value.status,
      count: value.count,
      children: value.children,
      meal: value.meal,
      notes: value.notes ?? guests[idx].notes,
      ...(value.firstName ? { firstName: value.firstName } : {}),
      ...(value.lastName !== undefined ? { lastName: value.lastName } : {}),
      ...(value.side ? { side: value.side } : {}),
      accessibility: value.accessibility === "true",
      transport: value.transport ?? guests[idx].transport,
      rsvpDate: now,
      updatedAt: now,
    };
  } else {
    // Unknown phone — create a new pending guest record
    guests.push({
      id: `rsvp-${phone}`,
      phone,
      firstName: /** @type {string} */ (value.firstName) || "",
      lastName: /** @type {string} */ (value.lastName) || "",
      side: value.side || "mutual",
      status: value.status,
      count: value.count,
      children: value.children,
      meal: value.meal,
      accessibility: value.accessibility === "true",
      transport: value.transport || "",
      notes: value.notes ?? "",
      rsvpDate: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
  enqueueWrite("rsvp_log", () => appendToRsvpLog({
    phone,
    firstName: String(value.firstName ?? ""),
    lastName: String(value.lastName ?? ""),
    status: String(value.status),
    count: Number(value.count ?? 1),
    timestamp: now,
  }));
  _showConfirmation(/** @type {string} */ (value.status));
  return { ok: true };
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Pre-fill RSVP form fields from an existing guest record. */
function _prefillForm(guest) {
  /** @type {Record<string,string>} */
  const fieldMap = {
    phone: "rsvpPhone",
    firstName: "rsvpFirstName",
    lastName: "rsvpLastName",
    count: "rsvpGuests",
    children: "rsvpChildren",
    meal: "rsvpMeal",
    notes: "rsvpNotes",
    side: "rsvpSide",
    transport: "rsvpTransport",
  };
  Object.entries(fieldMap).forEach(([key, id]) => {
    const input = /** @type {HTMLInputElement|HTMLSelectElement|null} */ (
      document.getElementById(id)
    );
    if (input && guest[key] !== undefined) input.value = String(guest[key]);
  });
  // Accessibility checkbox
  const acc = /** @type {HTMLInputElement|null} */ (
    document.getElementById("rsvpAccessibility")
  );
  if (acc) acc.checked = Boolean(guest.accessibility);
  // Reveal the rest of the form
  const formBody = document.getElementById("rsvpDetails");
  if (formBody) formBody.classList.remove("u-hidden");
}

/** Show RSVP success message. */
function _showConfirmation(status) {
  const confirmEl = document.getElementById("rsvpConfirm");
  if (!confirmEl) return;
  if (status === "confirmed") {
    confirmEl.textContent = t("rsvp_confirmed");
  } else if (status === "declined") {
    confirmEl.textContent = t("rsvp_declined");
  } else {
    confirmEl.textContent = t("saved");
  }
  confirmEl.classList.remove("u-hidden");
  const details = document.getElementById("rsvpDetails");
  if (details) details.classList.add("u-hidden");
}

// ── S12.5 RSVP Deadline Enforcement ───────────────────────────────────────

/**
 * Check if the RSVP deadline has passed.
 * @returns {boolean}
 */
function _isRsvpDeadlinePassed() {
  const info = /** @type {Record<string, string|undefined>} */ (storeGet("weddingInfo") ?? {});
  const deadline = info.rsvpDeadline;
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const now = new Date();
  return now > deadlineDate;
}

/**
 * Show a "RSVP is closed" message and disable the form.
 */
function _showDeadlineMessage() {
  if (!_container) return;
  const form = _container.querySelector(".rsvp-form");
  if (form) {
    form.textContent = "";
    const msg = document.createElement("div");
    msg.className = "rsvp-deadline-msg u-text-center u-p-lg";
    const icon = document.createElement("div");
    icon.textContent = "⏰";
    icon.style.fontSize = "3rem";
    msg.appendChild(icon);
    const p = document.createElement("p");
    p.textContent = t("rsvp_deadline_passed") || "RSVP deadline has passed. Please contact the couple directly.";
    p.style.fontSize = "1.2rem";
    p.style.marginTop = "1rem";
    msg.appendChild(p);
    form.appendChild(msg);
  }
}

/**
 * Response rate by side.
 * @returns {{ side: string, total: number, responded: number, rate: number }[]}
 */
export function getRsvpRateBySide() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  /** @type {Map<string, { total: number, responded: number }>} */
  const map = new Map();
  for (const guest of guests) {
    const side = guest.side || "mutual";
    const entry = map.get(side) ?? { total: 0, responded: 0 };
    entry.total += 1;
    if (["confirmed", "declined", "maybe"].includes(guest.status)) {
      entry.responded += 1;
    }
    map.set(side, entry);
  }
  return [...map.entries()].map(([side, values]) => ({
    side,
    total: values.total,
    responded: values.responded,
    rate: values.total ? Math.round((values.responded / values.total) * 100) : 0,
  }));
}

/**
 * Average response time in days.
 * @returns {{ avgDays: number, fastest: number, slowest: number, count: number }}
 */
export function getRsvpResponseTime() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const times = guests
    .filter((guest) => guest.createdAt && guest.rsvpDate)
    .map((guest) => (new Date(guest.rsvpDate).getTime() - new Date(guest.createdAt).getTime()) / 86400000)
    .filter((days) => days >= 0);
  if (times.length === 0) {
    return { avgDays: 0, fastest: 0, slowest: 0, count: 0 };
  }
  const total = times.reduce((sum, days) => sum + days, 0);
  return {
    avgDays: Math.round(total / times.length),
    fastest: Math.round(Math.min(...times)),
    slowest: Math.round(Math.max(...times)),
    count: times.length,
  };
}

/**
 * RSVP submissions per day.
 * @returns {{ date: string, count: number }[]}
 */
export function getRsvpDailyTrend() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  /** @type {Map<string, number>} */
  const byDay = new Map();
  for (const guest of guests) {
    if (!guest.rsvpDate) continue;
    const day = String(guest.rsvpDate).slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return [...byDay.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
