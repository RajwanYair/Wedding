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

/** @type {boolean} — S23.1: show only declined guests for follow-up */
let _declinedOnly = false;

export function mount(_container) {
  _unsubs.push(storeSubscribe("guests", renderWhatsApp));
  _unsubs.push(storeSubscribe("weddingInfo", renderWhatsApp));
  renderWhatsApp();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
  _unsentOnly = false;
  _declinedOnly = false;
}

/**
 * S23.1 — Toggle the declined follow-up filter.
 * When active, shows only declined guests + loads follow-up template.
 */
export function toggleDeclinedFilter() {
  _declinedOnly = !_declinedOnly;
  if (_declinedOnly) _unsentOnly = false;
  const btn = document.getElementById("waDeclinedFilterBtn");
  if (btn) btn.classList.toggle("active", _declinedOnly);
  // Pre-load follow-up template when activating
  const textarea = /** @type {HTMLTextAreaElement|null} */ (
    document.getElementById("waTemplate")
  );
  if (textarea && _declinedOnly && !textarea.dataset.userEdited) {
    const info = /** @type {Record<string,string>} */ (
      storeGet("weddingInfo") ?? {}
    );
    textarea.value = t("wa_declined_template")
      .replace(/\{groom\}/g, info.groom || "")
      .replace(/\{bride\}/g, info.bride || "");
  }
  renderWhatsApp();
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
      if (!g.phone) return false;
      // S23.1 declined follow-up mode
      if (_declinedOnly) return g.status === "declined";
      if (g.status === "declined") return false;
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
    .replace(/\{gift\}/g, guest.gift || "")
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

// ── F4.2.1 Scheduled Reminders ───────────────────────────────────────────

/** @typedef {{ id: string, scheduledAt: string, sentAt?: string, type: 'reminder'|'thankyou', template?: string }} ScheduledMsg */

const _QUEUE_KEY = "wedding_v1_reminderQueue";

/**
 * Get the scheduled message queue from localStorage.
 * @returns {ScheduledMsg[]}
 */
export function getScheduledQueue() {
  try {
    return JSON.parse(localStorage.getItem(_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Save the scheduled queue to localStorage.
 * @param {ScheduledMsg[]} queue
 */
function _saveQueue(queue) {
  try {
    localStorage.setItem(_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // storage unavailable
  }
}

/**
 * Schedule reminders for all pending guests at a specific datetime.
 * @param {string} scheduledAt  ISO datetime string
 * @param {string} [template]   Custom message template
 * @returns {number} Number of reminders scheduled
 */
export function scheduleReminders(scheduledAt, template) {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const targets = guests.filter(
    (g) => g.phone && g.sent && (g.status === "pending" || g.status === "maybe"),
  );
  if (targets.length === 0) return 0;

  const queue = getScheduledQueue();
  for (const g of targets) {
    // Avoid duplicates
    if (queue.some((q) => q.id === g.id && q.type === "reminder" && !q.sentAt)) continue;
    queue.push({ id: g.id, scheduledAt, type: "reminder", template });
  }
  _saveQueue(queue);
  return targets.length;
}

/**
 * Check for due scheduled messages and process them.
 * Call on app boot and periodically.
 * @returns {string[]} Array of guest IDs that were sent
 */
export function processScheduledQueue() {
  const queue = getScheduledQueue();
  const now = new Date();
  const due = queue.filter((q) => !q.sentAt && new Date(q.scheduledAt) <= now);
  if (due.length === 0) return [];

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  const sentIds = [];

  for (const item of due) {
    const guest = guests.find((g) => g.id === item.id);
    if (!guest || !guest.phone) continue;

    const phone = cleanPhone(guest.phone);
    if (!phone) continue;

    const tpl = item.template || t("wa_reminder_default");
    const message = _interpolate(tpl, guest, info);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    item.sentAt = now.toISOString();
    sentIds.push(item.id);
  }

  _saveQueue(queue);
  return sentIds;
}

/**
 * Cancel all scheduled reminders for a given type.
 * @param {'reminder'|'thankyou'} [type]
 */
export function cancelScheduledReminders(type = "reminder") {
  const queue = getScheduledQueue().filter((q) => q.type !== type || q.sentAt);
  _saveQueue(queue);
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

// ── F4.2.3 Thank-You Queue (Green API paced) ─────────────────────────────

/**
 * Send thank-you messages via Green API with pacing (350ms between sends).
 * Falls back to wa.me links if Green API is not configured.
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export async function sendThankYouViaApi() {
  const instanceId = localStorage.getItem("wedding_v1_greenApiInstanceId") || "";
  const token = localStorage.getItem("wedding_v1_greenApiToken") || "";
  if (!instanceId || !token) {
    // Fallback to wa.me links
    sendThankYouMessages();
    return { sent: 0, failed: 0 };
  }

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  const template =
    /** @type {HTMLTextAreaElement|null} */ (
      document.getElementById("waThankYouTemplate")
    )?.value?.trim() || t("wa_thankyou_default");

  const targets = guests.filter(
    (g) => g.phone && g.checkedIn && g.status === "confirmed" && !g.thankYouSent,
  );
  if (targets.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const allGuests = [...guests];

  for (let i = 0; i < targets.length; i++) {
    const g = targets[i];
    const phone = cleanPhone(g.phone);
    if (!phone) { failed++; continue; }

    const message = _interpolate(template, g, info);
    const chatId = `${phone}@c.us`;
    const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message }),
      });
      if (res.ok) {
        sent++;
        const idx = allGuests.findIndex((gg) => gg.id === g.id);
        if (idx !== -1) {
          allGuests[idx] = {
            ...allGuests[idx],
            thankYouSent: true,
            thankYouSentAt: new Date().toISOString(),
          };
        }
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    // Update progress UI
    const progressEl = document.getElementById("waThankYouProgress");
    if (progressEl) {
      progressEl.textContent = (t("wa_thankyou_progress") || "{sent}/{total}")
        .replace("{sent}", String(sent + failed))
        .replace("{total}", String(targets.length));
    }

    // Pace: wait 350ms between sends (avoid rate limiting)
    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  storeSet("guests", allGuests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
  return { sent, failed };
}

// ── F4.2.4 Email Templates ───────────────────────────────────────────────

/**
 * Generate a mailto: link for a guest with the specified email template.
 * @param {object} guest  Guest object
 * @param {'invitation'|'reminder'|'thankyou'} templateType
 * @returns {string|null}  mailto: URI or null if no email
 */
export function generateMailtoLink(guest, templateType = "invitation") {
  if (!guest.email) return null;

  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  const name = `${guest.firstName} ${guest.lastName || ""}`.trim();

  /** @type {Record<string, { subject: string, body: string }>} */
  const templates = {
    invitation: {
      subject: t("email_subject_invitation") || `${info.groom || ""} & ${info.bride || ""} — Wedding Invitation`,
      body: t("email_body_invitation") || `Dear ${name},\n\nYou are invited to the wedding of ${info.groom || ""} & ${info.bride || ""}!\n\n📅 ${info.date || ""}\n📍 ${info.venue || ""}\n\nPlease RSVP at your earliest convenience.\n\nWith love,\n${info.groom || ""} & ${info.bride || ""}`,
    },
    reminder: {
      subject: t("email_subject_reminder") || `Reminder: RSVP for ${info.groom || ""} & ${info.bride || ""}'s Wedding`,
      body: t("email_body_reminder") || `Dear ${name},\n\nThis is a friendly reminder to RSVP for the wedding.\n\n📅 ${info.date || ""}\n📍 ${info.venue || ""}\n\nWe'd love to hear from you!\n\nBest,\n${info.groom || ""} & ${info.bride || ""}`,
    },
    thankyou: {
      subject: t("email_subject_thankyou") || `Thank You — ${info.groom || ""} & ${info.bride || ""}`,
      body: t("email_body_thankyou") || `Dear ${name},\n\nThank you so much for celebrating with us! 💕\n\nWe truly appreciated your presence and ${guest.gift ? `your generous gift (${guest.gift})` : "your love and support"}.\n\nWith love,\n${info.groom || ""} & ${info.bride || ""}`,
    },
  };

  const tpl = templates[templateType] || templates.invitation;
  const subject = encodeURIComponent(tpl.subject);
  const body = encodeURIComponent(tpl.body);
  return `mailto:${encodeURIComponent(guest.email)}?subject=${subject}&body=${body}`;
}

/**
 * Open email client for a batch of guests.
 * @param {'invitation'|'reminder'|'thankyou'} templateType
 * @returns {number} Number of emails opened
 */
export function sendBatchEmails(templateType = "invitation") {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  let targets;

  if (templateType === "thankyou") {
    targets = guests.filter((g) => g.email && g.checkedIn && g.status === "confirmed");
  } else if (templateType === "reminder") {
    targets = guests.filter((g) => g.email && g.sent && (g.status === "pending" || g.status === "maybe"));
  } else {
    targets = guests.filter((g) => g.email && !g.emailSent);
  }

  let opened = 0;
  for (const g of targets) {
    const link = generateMailtoLink(g, templateType);
    if (link) {
      window.open(link, "_blank");
      opened++;
    }
  }
  return opened;
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

// ── F4.2.5 Calendar Invite (.ics) Generation ─────────────────────────────

/**
 * Generate an iCalendar (.ics) string for the wedding event.
 * @returns {string|null} iCalendar file content or null if no date
 */
export function generateICS() {
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  if (!info.date) return null;

  const eventDate = new Date(info.date);
  if (Number.isNaN(eventDate.getTime())) return null;

  // Default 3-hour wedding event
  const endDate = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);

  const fmt = (/** @type {Date} */ d) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const summary = `${info.groom || ""} & ${info.bride || ""} — ${t("ics_wedding_title") || "Wedding"}`.trim();
  const location = [info.venue, info.venueAddress].filter(Boolean).join(", ");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WeddingManager//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(eventDate)}`,
    `DTEND:${fmt(endDate)}`,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location}` : "",
    `UID:wedding-${eventDate.getTime()}@weddingmanager`,
    `DTSTAMP:${fmt(new Date())}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

/**
 * Download the wedding .ics calendar invite file.
 */
export function downloadCalendarInvite() {
  const ics = generateICS();
  if (!ics) return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wedding-invite.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
