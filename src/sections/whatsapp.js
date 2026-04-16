/**
 * src/sections/whatsapp.js — WhatsApp bulk-send section ESM module (S0.8)
 *
 * Template previewer and per-guest WhatsApp link builder.
 * Phone numbers normalised via cleanPhone() → wa.me ready.
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { cleanPhone } from "../utils/phone.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";

/** @type {(() => void)[]} */
const _unsubs = [];

/** @type {boolean} */
let _unsentOnly = false;

export function mount(_container) {
  _unsubs.push(storeSubscribe("guests", renderWhatsApp));
  _unsubs.push(storeSubscribe("weddingInfo", renderWhatsApp));
  renderWhatsApp();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
  _unsentOnly = false;
}

export function renderWhatsApp() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string,string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  const template = el.waTemplate
    ? /** @type {HTMLTextAreaElement} */ (el.waTemplate).value
    : "";

  // Populate template textarea with default if empty
  if (el.waTemplate && !/** @type {HTMLTextAreaElement} */ (el.waTemplate).value) {
    /** @type {HTMLTextAreaElement} */ (el.waTemplate).value = _defaultTemplate(info);
  }

  // Show preview for first guest with phone
  const previewGuest = guests.find((g) => g.phone);
  if (previewGuest) {
    updateWaPreview(template || _defaultTemplate(info), previewGuest);
  }

  const list = el.waGuestList;
  if (!list) return;
  list.textContent = "";

  guests
    .filter((g) => {
      if (g.status === "declined" || !g.phone) return false;
      if (_unsentOnly && g.sent) return false;
      return true;
    })
    .forEach((g) => {
      const phone = cleanPhone(g.phone);
      const msg = _interpolate(template || _defaultTemplate(info), g, info);
      const encoded = encodeURIComponent(msg);

      const row = document.createElement("div");
      row.className = "wa-row";

      const name = document.createElement("span");
      name.className = "wa-guest-name";
      name.textContent = `${g.firstName} ${g.lastName || ""}`;
      row.appendChild(name);

      if (g.sent) {
        const sentBadge = document.createElement("span");
        sentBadge.className = "badge badge--success";
        sentBadge.textContent = t("stat_sent") || "נשלח";
        row.appendChild(sentBadge);
      }

      const link = document.createElement("a");
      link.href = `https://wa.me/${phone}?text=${encoded}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "btn btn-small btn-whatsapp";
      link.textContent = t("send_whatsapp");
      // Mark as sent when link is clicked
      link.addEventListener("click", () => markGuestSent(g.id));
      row.appendChild(link);

      list.appendChild(row);
    });

  // S18.5 update unsent badge after re-render
  _renderUnsentBadge();
}

/**
 * Get the wa.me URL for a single guest.
 * @param {string} guestId
 * @returns {string|null}
 */
export function getWhatsAppLink(guestId) {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const g = guests.find((gg) => gg.id === guestId);
  if (!g || !g.phone) return null;
  const info = /** @type {Record<string,string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  const msg = _interpolate(_defaultTemplate(info), g, info);
  return `https://wa.me/${cleanPhone(g.phone)}?text=${encodeURIComponent(msg)}`;
}

/**
 * Build a preview of the WhatsApp message for a given guest.
 * Uses the default template (or a supplied custom `template` string) and
 * interpolates guest + weddingInfo placeholders.
 *
 * Placeholder tokens: {name}, {date}, {venue}, {groom}, {bride}
 *
 * @param {string} guestId  — id of the guest
 * @param {string} [template]  — optional custom template; defaults to wa_default_template
 * @returns {{ message: string, link: string } | null}
 */
export function buildWhatsAppMessage(guestId, template) {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const g = guests.find((gg) => gg.id === guestId);
  if (!g || !g.phone) return null;

  const info = /** @type {Record<string,string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  const tpl = template ?? _defaultTemplate(info);
  const message = _interpolate(tpl, g, info);
  const link = `https://wa.me/${cleanPhone(g.phone)}?text=${encodeURIComponent(message)}`;
  return { message, link };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _interpolate(template, guest, info) {
  const baseUrl = window.location.origin + window.location.pathname;
  const rsvpLink = `${baseUrl}?guestId=${encodeURIComponent(guest.id)}#rsvp`;
  return template
    .replace(/\{name\}/g, `${guest.firstName} ${guest.lastName || ""}`.trim())
    .replace(/\{date\}/g, info.date || "")
    .replace(/\{venue\}/g, info.venue || "")
    .replace(/\{groom\}/g, info.groom || "")
    .replace(/\{bride\}/g, info.bride || "")
    .replace(/\{rsvpLink\}/g, rsvpLink);
}

function _defaultTemplate(info) {
  return t("wa_default_template")
    .replace(/\{date\}/g, info.date || "")
    .replace(/\{venue\}/g, info.venue || "")
    .replace(/\{groom\}/g, info.groom || "")
    .replace(/\{bride\}/g, info.bride || "");
}

/**
 * Mark a guest as having received a WhatsApp message.
 * @param {string} guestId
 */
export function markGuestSent(guestId) {
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx !== -1 && !guests[idx].sent) {
    guests[idx] = { ...guests[idx], sent: true, sentAt: new Date().toISOString() };
    storeSet("guests", guests);
  }
}

/**
 * Update the WhatsApp preview bubble with the current template text.
 * Interpolates using the first guest found (or dummy data).
 * @param {string} [templateText]
 * @param {object} [guest]
 */
export function updateWaPreview(templateText, guest) {
  const bubble = document.getElementById("waPreviewBubble");
  const timeEl = document.getElementById("waPreviewTime");
  const charCountEl = document.getElementById("waCharCount");
  if (!bubble) return;
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const tpl = templateText ?? _defaultTemplate(info);
  const demoGuest = guest ?? { firstName: t("groom_placeholder") || "חתן", lastName: "", phone: "050" };
  const message = _interpolate(tpl, demoGuest, info);
  bubble.textContent = message;
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  }
  if (charCountEl) {
    const len = message.length;
    const left = Math.max(0, 4096 - len);
    charCountEl.textContent = `${len} / 4096 (${left} ${t("wa_chars_left") || "characters left"})`;
    charCountEl.classList.toggle("wa-char-warn", left < 200);
  }
}

// ── Bulk send ─────────────────────────────────────────────────────────────

/**
 * Open all WhatsApp chat links (filter: 'pending' | 'all').
 * Uses window.open — browsers may block multiple popups; user must allow them.
 * @param {string} [filter]  'pending' to send only to pending guests, 'all' for everyone
 */
export function sendWhatsAppAll(filter = "all") {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string,string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  const template =
    /** @type {HTMLTextAreaElement|null} */ (
      document.getElementById("waTemplate")
    )?.value || _defaultTemplate(info);

  guests
    .filter((g) => {
      if (!g.phone) return false;
      if (filter === "pending") return g.status === "pending" && !g.sent;
      return g.status !== "declined";
    })
    .forEach((g) => {
      const phone = cleanPhone(g.phone);
      const msg = _interpolate(template, g, info);
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
        "_blank",
      );
      markGuestSent(g.id);
    });
}

/**
 * Send WhatsApp messages via Green API.
 * @param {string} [filter]  'pending' | 'all'
 */
export async function sendWhatsAppAllViaApi(filter = "all") {
  const instanceId = /** @type {HTMLInputElement|null} */ (
    document.getElementById("greenApiInstanceId")
  )?.value?.trim();
  const token = /** @type {HTMLInputElement|null} */ (
    document.getElementById("greenApiToken")
  )?.value?.trim();

  if (!instanceId || !token) {
    alert(
      t("error_green_api_config") || "Configure Green API credentials first",
    );
    return;
  }

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string,string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  const template =
    /** @type {HTMLTextAreaElement|null} */ (
      document.getElementById("waTemplate")
    )?.value || _defaultTemplate(info);

  const targets = guests.filter((g) => {
    if (!g.phone) return false;
    if (filter === "pending") return g.status === "pending" && !g.sent;
    return g.status !== "declined";
  });
  for (const g of targets) {
    const phone = `${cleanPhone(g.phone)}@c.us`;
    const message = _interpolate(template, g, info);
    try {
      await fetch(
        `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId: phone, message }),
        },
      );
      markGuestSent(g.id);
      // Brief pause between messages to avoid rate limits
      await new Promise((res) => setTimeout(res, 350));
    } catch {
      // continue on individual failure
    }
  }
}

/**
 * Test Green API connection (getStateInstance endpoint).
 */
export async function checkGreenApiConnection() {
  const instanceId = /** @type {HTMLInputElement|null} */ (
    document.getElementById("greenApiInstanceId")
  )?.value?.trim();
  const token = /** @type {HTMLInputElement|null} */ (
    document.getElementById("greenApiToken")
  )?.value?.trim();
  const result = document.getElementById("greenApiStatus");

  if (!result) return;
  if (!instanceId || !token) {
    result.textContent = t("error_green_api_config") || "Missing credentials";
    return;
  }

  try {
    const resp = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/getStateInstance/${token}`,
    );
    const data = await resp.json();
    result.textContent =
      data?.stateInstance === "authorized"
        ? t("green_api_connected") || "Connected ✓"
        : t("green_api_not_connected") || "Not connected";
  } catch {
    result.textContent = t("error_network") || "Network error";
  }
}

/**
 * Save Green API credentials from form.
 * @param {HTMLFormElement|null} form
 */
export function saveGreenApiConfig(form) {
  const instanceId =
    /** @type {HTMLInputElement|null} */ (
      form?.querySelector("[name='instanceId']") ??
        document.getElementById("greenApiInstanceId")
    )?.value?.trim() ?? "";
  const token =
    /** @type {HTMLInputElement|null} */ (
      form?.querySelector("[name='token']") ??
        document.getElementById("greenApiToken")
    )?.value?.trim() ?? "";

  try {
    localStorage.setItem("wedding_v1_greenApiInstanceId", instanceId);
    localStorage.setItem("wedding_v1_greenApiToken", token);
  } catch {
    // storage unavailable
  }
}

// ── S12.1 RSVP Reminders ─────────────────────────────────────────────────

/**
 * Send WhatsApp reminder to guests who were sent an invite but haven't RSVP'd.
 * Opens wa.me links for each matching guest.
 */
export function sendWhatsAppReminder() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  const template =
    /** @type {HTMLTextAreaElement|null} */ (
      document.getElementById("waReminderTemplate")
    )?.value?.trim() || t("wa_reminder_default") || "Hi {name}, reminder: RSVP at {rsvpLink}";

  const targets = guests.filter(
    (g) => g.phone && g.sent && (g.status === "pending" || g.status === "maybe"),
  );

  if (targets.length === 0) return;

  targets.forEach((g) => {
    const phone = (g.phone || "").replace(/\D/g, "");
    if (!phone) return;
    const message = _interpolate(template, g, info);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");

    // Mark reminder sent
    const allGuests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
    const idx = allGuests.findIndex((gg) => gg.id === g.id);
    if (idx !== -1) {
      allGuests[idx] = {
        ...allGuests[idx],
        reminderSent: true,
        reminderSentAt: new Date().toISOString(),
      };
      storeSet("guests", allGuests);
    }
  });
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

/**
 * Update the reminder count badge shown next to the reminder button.
 */
export function updateReminderCount() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const count = guests.filter(
    (g) => g.phone && g.sent && (g.status === "pending" || g.status === "maybe"),
  ).length;
  const el = document.getElementById("waReminderCount");
  if (el) el.textContent = t("wa_reminder_count").replace("{n}", String(count));
}

// ── S13.3 Thank-You Messages ──────────────────────────────────────────────

/**
 * Send thank-you WhatsApp messages to checked-in guests.
 * Opens wa.me links for each guest who checked in.
 */
export function sendThankYouMessages() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  const template =
    /** @type {HTMLTextAreaElement|null} */ (
      document.getElementById("waThankYouTemplate")
    )?.value?.trim() || t("wa_thankyou_default");

  const targets = guests.filter(
    (g) => g.phone && g.checkedIn && g.status === "confirmed",
  );

  if (targets.length === 0) return;

  targets.forEach((g) => {
    const phone = cleanPhone(g.phone);
    if (!phone) return;
    const message = _interpolate(template, g, info);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");

    // Mark thank-you sent
    const allGuests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
    const idx = allGuests.findIndex((gg) => gg.id === g.id);
    if (idx !== -1) {
      allGuests[idx] = {
        ...allGuests[idx],
        thankYouSent: true,
        thankYouSentAt: new Date().toISOString(),
      };
      storeSet("guests", allGuests);
    }
  });
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

/**
 * Get count of eligible thank-you recipients.
 * @returns {number}
 */
export function getThankYouCount() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return guests.filter(
    (g) => g.phone && g.checkedIn && g.status === "confirmed" && !g.thankYouSent,
  ).length;
}

// ── S18.5 WhatsApp Unsent Filter Shortcut ────────────────────────────────

/**
 * Get count of guests who have not yet received a WhatsApp message.
 * @returns {number}
 */
export function getUnsentCount() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return guests.filter(
    (g) => g.status !== "declined" && g.phone && !g.sent,
  ).length;
}

/**
 * Toggle the "show unsent only" filter in the WhatsApp list.
 */
export function toggleUnsentFilter() {
  _unsentOnly = !_unsentOnly;
  // Update filter button state
  const btn = document.getElementById("waUnsentFilterBtn");
  if (btn) btn.classList.toggle("btn-primary", _unsentOnly);
  // Update badge
  _renderUnsentBadge();
  renderWhatsApp();
}

/** Render/update the unsent count badge on the filter button. */
export function renderUnsentBadge() {
  _renderUnsentBadge();
}

function _renderUnsentBadge() {
  const badge = document.getElementById("waUnsentBadge");
  if (!badge) return;
  const count = getUnsentCount();
  badge.textContent = String(count);
  badge.classList.toggle("u-hidden", count === 0);
}
