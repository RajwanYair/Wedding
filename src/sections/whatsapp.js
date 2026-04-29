/**
 * src/sections/whatsapp.js - WhatsApp bulk-send section ESM module (S0.8)
 *
 * Template previewer and per-guest WhatsApp link builder.
 * Phone numbers normalised via cleanPhone() → wa.me ready.
 */

import { STORAGE_KEYS } from "../core/constants.js";
import { storeGet, storeSet } from "../core/store.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { readBrowserStorageJson, writeBrowserStorage } from "../core/storage.js";
import { cleanPhone } from "../utils/phone.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../core/sync.js";
import { personalizeMessage, getVariableHints } from "../services/wa-messaging.js";

class WhatsAppSection extends BaseSection {
  async onMount() {
    this.subscribe("guests", renderWhatsApp);
    this.subscribe("weddingInfo", renderWhatsApp);
    renderVariableChips();
    renderWhatsApp();
  }
}

export const { mount, unmount, capabilities } = fromSection(new WhatsAppSection("whatsapp"));

/**
 * Render clickable variable chips below the WhatsApp textarea.
 * Clicking a chip inserts the placeholder token at the cursor position.
 */
function renderVariableChips() {
  const container = document.getElementById("waVariableChips");
  if (!container) return;
  container.textContent = "";

  const label = document.createElement("span");
  label.className = "wa-chips-label";
  label.setAttribute("data-i18n", "wa_variable_chips_label");
  label.textContent = t("wa_variable_chips_label");
  container.appendChild(label);

  for (const hint of getVariableHints()) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "wa-chip";
    chip.textContent = hint.label;
    chip.title = hint.exampleHe;
    chip.addEventListener("click", () => {
      const ta = /** @type {HTMLTextAreaElement|null} */ (
        document.getElementById("waTemplate")
      );
      if (!ta) return;
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? start;
      ta.value = ta.value.slice(0, start) + hint.label + ta.value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + hint.label.length;
      ta.focus();
      updateWaPreview(ta.value);
    });
    container.appendChild(chip);
  }
}

function renderWhatsApp() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const template = el.waTemplate ? /** @type {HTMLTextAreaElement} */ (el.waTemplate).value : "";

  // Populate template textarea with default if empty
  if (el.waTemplate && !(/** @type {HTMLTextAreaElement} */ (el.waTemplate).value)) {
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
    .filter((g) => g.status !== "declined" && g.phone)
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
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
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
 * @param {string} guestId  - id of the guest
 * @param {string} [template]  - optional custom template; defaults to wa_default_template
 * @returns {{ message: string, link: string } | null}
 */
export function buildWhatsAppMessage(guestId, template) {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const g = guests.find((gg) => gg.id === guestId);
  if (!g || !g.phone) return null;

  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const tpl = template ?? _defaultTemplate(info);
  const message = _interpolate(tpl, g, info);
  const link = `https://wa.me/${cleanPhone(g.phone)}?text=${encodeURIComponent(message)}`;
  return { message, link };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _interpolate(/** @type {string} */ template, /** @type {any} */ guest, /** @type {Record<string,string>} */ info) {
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const tableName = tables.find((t) => t.id === guest.tableId)?.name ?? "";
  return personalizeMessage(template, guest, info, tableName);
}

function _defaultTemplate(/** @type {Record<string,string>} */ info) {
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
  const demoGuest = guest ?? {
    firstName: t("groom_placeholder") || "חתן",
    lastName: "",
    phone: "050",
  };
  const message = _interpolate(tpl, demoGuest, info);
  bubble.textContent = message;
  if (timeEl) {
    const now = new Date();
    timeEl.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  }
  if (charCountEl) {
    const len = message.length;
    const left = Math.max(0, 4096 - len);
    charCountEl.textContent = `${len} / 4096 (${t("plural_chars", { count: left })})`;
    charCountEl.classList.toggle("wa-char-warn", left < 200);
  }
}

// ── Bulk send ─────────────────────────────────────────────────────────────

/**
 * Open all WhatsApp chat links (filter: 'pending' | 'all').
 * Uses window.open - browsers may block multiple popups; user must allow them.
 * @param {string} [filter]  'pending' to send only to pending guests, 'all' for everyone
 */
export function sendWhatsAppAll(filter = "all") {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const template =
    /** @type {HTMLTextAreaElement|null} */ (document.getElementById("waTemplate"))?.value ||
    _defaultTemplate(info);

  guests
    .filter((g) => {
      if (!g.phone) return false;
      if (filter === "pending") return g.status === "pending" && !g.sent;
      return g.status !== "declined";
    })
    .forEach((g) => {
      const phone = cleanPhone(g.phone);
      const msg = _interpolate(template, g, info);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
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
    alert(t("error_green_api_config") || "Configure Green API credentials first");
    return;
  }

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const template =
    /** @type {HTMLTextAreaElement|null} */ (document.getElementById("waTemplate"))?.value ||
    _defaultTemplate(info);

  const targets = guests.filter((g) => {
    if (!g.phone) return false;
    if (filter === "pending") return g.status === "pending" && !g.sent;
    return g.status !== "declined";
  });
  for (const g of targets) {
    const phone = `${cleanPhone(g.phone)}@c.us`;
    const message = _interpolate(template, g, info);
    try {
      await fetch(`https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: phone, message }),
      });
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
      form?.querySelector("[name='instanceId']") ?? document.getElementById("greenApiInstanceId")
    )?.value?.trim() ?? "";
  const token =
    /** @type {HTMLInputElement|null} */ (
      form?.querySelector("[name='token']") ?? document.getElementById("greenApiToken")
    )?.value?.trim() ?? "";

  try {
    writeBrowserStorage(STORAGE_KEYS.GREEN_API_INSTANCE_ID, instanceId);
    writeBrowserStorage(STORAGE_KEYS.GREEN_API_TOKEN, token);
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
    )?.value?.trim() ||
    t("wa_reminder_default") ||
    "Hi {name}, reminder: RSVP at {rsvpLink}";

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

/** @typedef {{ id: string, scheduledAt: string, sentAt?: string, type: 'reminder'|'thankyou', template?: string }} ScheduledMsg */

const _QUEUE_KEY = STORAGE_KEYS.REMINDER_QUEUE;

/**
 * Get the scheduled reminder queue.
 * @returns {ScheduledMsg[]}
 */
export function getScheduledQueue() {
  return /** @type {ScheduledMsg[]} */ (readBrowserStorageJson(_QUEUE_KEY, []) ?? []);
}

/**
 * Get count of guests that still need a WhatsApp send.
 * @returns {number}
 */
export function getUnsentCount() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return guests.filter((guest) => guest.status !== "declined" && guest.phone && !guest.sent).length;
}

/**
 * Generate an iCalendar invite.
 * @returns {string | null}
 */
export function generateICS() {
  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  if (!info.date) return null;
  const eventDate = new Date(info.date);
  if (Number.isNaN(eventDate.getTime())) return null;
  const endDate = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);
  const format = (/** @type {Date} */ date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const summary =
    `${info.groom || ""} & ${info.bride || ""} - ${t("ics_wedding_title") || "Wedding"}`.trim();
  const location = [info.venue, info.venueAddress].filter(Boolean).join(", ");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WeddingManager//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${format(eventDate)}`,
    `DTEND:${format(endDate)}`,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location}` : "",
    `UID:wedding-${eventDate.getTime()}@weddingmanager`,
    `DTSTAMP:${format(new Date())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/**
 * Count eligible thank-you recipients.
 * @returns {number}
 */
export function getThankYouCount() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  return guests.filter(
    (guest) =>
      guest.phone && guest.checkedIn && guest.status === "confirmed" && !guest.thankYouSent,
  ).length;
}

/**
 * Compute message send rate.
 * @returns {{ eligible: number, sent: number, rate: number }}
 */
export function getWhatsAppSendRate() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const eligible = guests.filter((guest) => guest.phone && guest.status !== "declined");
  const sent = eligible.filter((guest) => guest.sent);
  return {
    eligible: eligible.length,
    sent: sent.length,
    rate: eligible.length ? Math.round((sent.length / eligible.length) * 100) : 0,
  };
}

/**
 * Group message stats by guest group.
 * @returns {{ group: string, total: number, sent: number, pending: number }[]}
 */
export function getMessageStatsByGroup() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  /** @type {Map<string, { total: number, sent: number }>} */
  const map = new Map();
  for (const guest of guests) {
    if (!guest.phone || guest.status === "declined") continue;
    const group = guest.group || "other";
    const entry = map.get(group) ?? { total: 0, sent: 0 };
    entry.total += 1;
    if (guest.sent) entry.sent += 1;
    map.set(group, entry);
  }
  return [...map.entries()]
    .map(([group, values]) => ({
      group,
      total: values.total,
      sent: values.sent,
      pending: values.total - values.sent,
    }))
    .sort((a, b) => b.pending - a.pending);
}
