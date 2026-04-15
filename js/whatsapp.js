// @ts-check
"use strict";

/* ── WhatsApp Integration ── */

/* ── Default message templates ── */
const WA_DEFAULT_HE = `שלום {name}! 🎊

אנו שמחים להזמינך לחתונה של {groom} ו{bride} 💍

📅 תאריך: {date}
🕐 שעה: {time}
📍 מקום: {venue}
📌 כתובת: {address}

נשמח לאשר הגעתך! ❤️`;

const WA_DEFAULT_EN = `Hello {name}! 🎊

We are delighted to invite you to the wedding of {groom} & {bride} 💍

📅 Date: {date}
🕐 Time: {time}
📍 Venue: {venue}
📌 Address: {address}

We look forward to your confirmation! ❤️`;

/* ── WhatsApp ── */
function updateWaPreview() {
  // Keep in-memory template state in sync with the textarea
  if (window.el.waTemplate) {
    window._waTemplates[window._currentLang] = window.el.waTemplate.value;
  }
  const msg = fillTemplate(window.el.waTemplate.value, {
    name: window._currentLang === "he" ? "ישראל כהן" : "John Cohen",
  });
  window.el.waPreviewBubble.textContent = msg;
  const now = new Date();
  window.el.waPreviewTime.textContent =
    `${now.getHours().toString().padStart(2, "0") 
    }:${ 
    now.getMinutes().toString().padStart(2, "0")}`;
}

function fillTemplate(template, overrides) {
  return template
    .replace(/{name}/g, overrides.name || "")
    .replace(/{groom}/g, window._weddingInfo.groom || "")
    .replace(/{bride}/g, window._weddingInfo.bride || "")
    .replace(
      /{date}/g,
      window._weddingInfo.date
        ? window.formatDateHebrew(window._weddingInfo.date)
        : "",
    )
    .replace(/{hebrew_date}/g, window._weddingInfo.hebrewDate || "")
    .replace(/{time}/g, window._weddingInfo.time || "")
    .replace(/{ceremony}/g, window._weddingInfo.ceremonyTime || "")
    .replace(/{venue}/g, window._weddingInfo.venue || "")
    .replace(/{address}/g, window._weddingInfo.address || "")
    .replace(/{waze}/g, window._weddingInfo.wazeLink || "");
}

function sendWhatsAppSingle(guestId) {
  const g = window._guests.find(function (x) {
    return x.id === guestId;
  });
  if (!g || !g.phone) return;
  const msg = fillTemplate(window.el.waTemplate.value, {
    name: g.firstName || window.guestFullName(g),
  });
  const phone = window.cleanPhone(g.phone);
  window.open(
    `https://wa.me/${ 
      encodeURIComponent(phone) 
      }?text=${ 
      encodeURIComponent(msg)}`,
    "_blank",
    "noopener,noreferrer",
  );
  g.sent = true;
  window.saveAll();
  window.syncGuestsToSheets();
  window.renderStats();
  renderWaGuestList();
  window.showToast(window.t("toast_wa_opening"), "success");
}

function sendWhatsAppAll(filter) {
  let list = window._guests.filter(function (g) {
    return g.phone;
  });
  if (filter === "pending")
    list = list.filter(function (g) {
      return g.status === "pending";
    });
  if (!list.length) return;
  list.forEach(function (g) {
    g.sent = true;
  });
  window.saveAll();
  window.syncGuestsToSheets();
  const first = list[0];
  const msg = fillTemplate(window.el.waTemplate.value, {
    name: first.firstName || window.guestFullName(first),
  });
  window.open(
    `https://wa.me/${ 
      encodeURIComponent(window.cleanPhone(first.phone)) 
      }?text=${ 
      encodeURIComponent(msg)}`,
    "_blank",
    "noopener,noreferrer",
  );
  window.renderStats();
  renderWaGuestList();
  window.showToast(
    `${window.t("toast_wa_opening")  } (${  list.length  })`,
    "success",
  );
}

/* ── Green API Integration ── */

/**
 * Convert a cleaned phone number to Green API chatId format.
 * cleanPhone returns "972XXXXXXXXX" (no +); Green API expects "972XXXXXXXXX@c.us".
 * @param {string} phone - raw phone from guest (e.g. "054-123-4567")
 * @returns {string} chatId e.g. "972541234567@c.us"
 */
function toGreenApiChatId(phone) {
  const clean = window.cleanPhone(phone);
  // cleanPhone returns digits only (no +), e.g. "972541234567"
  return `${clean  }@c.us`;
}

/**
 * Send a single WhatsApp message via Green API.
 * @param {string} chatId   - recipient in "972XXXXXXXXX@c.us" format
 * @param {string} message  - text to send
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
async function sendViaGreenApi(chatId, message) {
  const { instanceId, apiToken } = window._greenApiConfig;
  if (!instanceId || !apiToken) {
    return { ok: false, error: "no_config" };
  }
  const url =
    `https://api.green-api.com/waInstance${ 
    encodeURIComponent(instanceId) 
    }/sendMessage/${ 
    encodeURIComponent(apiToken)}`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(function () {
        return "";
      });
      return { ok: false, error: text || String(resp.status) };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Send invitations to all (or pending) guests via Green API, with a 1 s delay
 * between messages to respect rate limits.
 * @param {"all"|"pending"} filter
 */
async function sendWhatsAppAllViaApi(filter) {
  const { instanceId, apiToken } = window._greenApiConfig;
  if (!instanceId || !apiToken) {
    window.showToast(window.t("wa_api_no_config"), "error");
    return;
  }
  let list = window._guests.filter(function (g) {
    return g.phone;
  });
  if (filter === "pending") {
    list = list.filter(function (g) {
      return g.status === "pending";
    });
  }
  if (!list.length) {
    window.showToast(window.t("wa_api_no_guests"), "info");
    return;
  }

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < list.length; i++) {
    const g = list[i];
    const msg = fillTemplate(window.el.waTemplate.value, {
      name: g.firstName || window.guestFullName(g),
    });
    window.showToast(
      window
        .t("wa_api_progress")
        .replace("{sent}", String(i + 1))
        .replace("{total}", String(list.length)),
      "info",
    );
    const result = await sendViaGreenApi(toGreenApiChatId(g.phone), msg);
    if (result.ok) {
      g.sent = true;
      sent++;
    } else {
      failed++;
      window.showToast(
        window.t("wa_api_error").replace("{name}", window.guestFullName(g)),
        "error",
      );
    }
    // Rate-limit: 1 second between messages (Green API free plan)
    if (i < list.length - 1) {
      await new Promise(function (resolve) {
        setTimeout(resolve, 1000);
      });
    }
  }

  window.saveAll();
  window.syncGuestsToSheets();
  window.renderStats();
  renderWaGuestList();
  window.showToast(
    window
      .t("wa_api_done")
      .replace("{sent}", String(sent))
      .replace("{failed}", String(failed)),
    sent > 0 ? "success" : "error",
  );
}

/**
 * Send a single guest invitation via Green API.
 * @param {string} guestId
 */
async function sendWhatsAppSingleViaApi(guestId) {
  const g = window._guests.find(function (x) {
    return x.id === guestId;
  });
  if (!g || !g.phone) return;
  const { instanceId, apiToken } = window._greenApiConfig;
  if (!instanceId || !apiToken) {
    window.showToast(window.t("wa_api_no_config"), "error");
    return;
  }
  const msg = fillTemplate(window.el.waTemplate.value, {
    name: g.firstName || window.guestFullName(g),
  });
  const result = await sendViaGreenApi(toGreenApiChatId(g.phone), msg);
  if (result.ok) {
    g.sent = true;
    window.saveAll();
    window.syncGuestsToSheets();
    window.renderStats();
    renderWaGuestList();
    window.showToast(window.t("wa_api_sent_single"), "success");
  } else {
    window.showToast(
      window.t("wa_api_error").replace("{name}", window.guestFullName(g)),
      "error",
    );
  }
}

/**
 * Test the Green API connection and show a toast with the result.
 */
async function checkGreenApiConnection() {
  const { instanceId, apiToken } = window._greenApiConfig;
  if (!instanceId || !apiToken) {
    window.showToast(window.t("wa_api_no_config"), "error");
    return;
  }
  window.showToast(window.t("green_api_testing"), "info");
  const url =
    `https://api.green-api.com/waInstance${ 
    encodeURIComponent(instanceId) 
    }/getStateInstance/${ 
    encodeURIComponent(apiToken)}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json().catch(function () {
      return {};
    });
    const state = data && data.stateInstance;
    if (resp.ok && state === "authorized") {
      window.showToast(window.t("green_api_ok"), "success");
    } else if (resp.ok) {
      window.showToast(
        window.t("green_api_not_authorized") +
          (state ? ` (${  state  })` : ""),
        "error",
      );
    } else {
      window.showToast(window.t("green_api_error"), "error");
    }
  } catch (_e) {
    window.showToast(window.t("green_api_error"), "error");
  }
}

/**
 * Save Green API credentials from the Settings UI inputs.
 */
function saveGreenApiConfig() {
  const idEl = document.getElementById("greenApiInstanceId");
  const tokenEl = document.getElementById("greenApiToken");
  window._greenApiConfig = {
    instanceId: idEl ? idEl.value.trim() : "",
    apiToken: tokenEl ? tokenEl.value.trim() : "",
  };
  window.saveAll();
  window.showToast(window.t("green_api_saved"), "success");
}

/**
 * Populate the Settings UI Green API inputs from state.
 */
function loadGreenApiSettingsUi() {
  const idEl = document.getElementById("greenApiInstanceId");
  const tokenEl = document.getElementById("greenApiToken");
  if (idEl) idEl.value = window._greenApiConfig.instanceId || "";
  if (tokenEl) tokenEl.value = window._greenApiConfig.apiToken || "";
}

function renderWaGuestList() {
  const list = window._guests.filter(function (g) {
    return g.phone;
  });
  if (!list.length) {
    const emptyDiv = document.createElement("div");
    emptyDiv.style.cssText =
      "text-align:center; padding:2rem; color:var(--text-muted);";
    const iconDiv = document.createElement("div");
    iconDiv.style.cssText = "font-size:2.5em; margin-bottom:0.5rem;";
    iconDiv.textContent = "\ud83d\udced";
    emptyDiv.appendChild(iconDiv);
    emptyDiv.appendChild(
      document.createTextNode(
        window._currentLang === "he"
          ? "\u05d0\u05d9\u05df \u05d0\u05d5\u05e8\u05d7\u05d9\u05dd \u05e2\u05dd \u05de\u05e1\u05e4\u05e8 \u05d8\u05dc\u05e4\u05d5\u05df."
          : "No guests with phone numbers.",
      ),
    );
    window.el.waGuestList.replaceChildren(emptyDiv);
    return;
  }
  window.el.waGuestList.replaceChildren();
  list.forEach(function (g) {
    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;align-items:center;gap:0.8rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.03);";
    const sideKey = g.side || "mutual";

    const statusSpan = document.createElement("span");
    statusSpan.style.fontSize = "1.1em";
    statusSpan.textContent = g.sent ? "\u2705" : "\u23f3";

    const nameSpan = document.createElement("span");
    nameSpan.style.cssText = "flex:1;font-size:0.9em;";
    nameSpan.textContent = window.guestFullName(g);

    const sideBadge = document.createElement("span");
    sideBadge.className = `side-badge side-${  sideKey}`;
    sideBadge.style.fontSize = "0.72em";
    const sideIcon = document.createElement("span");
    sideIcon.className = "badge-icon";
    sideIcon.textContent = window.SIDE_ICON[sideKey] || "";
    sideBadge.appendChild(sideIcon);
    sideBadge.appendChild(
      document.createTextNode(` ${  window.t(`side_${  sideKey}`)}`),
    );

    const phoneSpan = document.createElement("span");
    phoneSpan.style.cssText = "font-size:0.8em;color:var(--text-muted);";
    phoneSpan.dir = "ltr";
    phoneSpan.textContent = `\ud83d\udcde ${  g.phone}`;

    const sendBtn = document.createElement("button");
    sendBtn.className = "btn btn-whatsapp btn-small";
    sendBtn.setAttribute("data-action", "sendWhatsAppSingle");
    sendBtn.setAttribute("data-action-arg", g.id);
    sendBtn.textContent = `\ud83d\udcac ${  window.t("btn_wa_send")}`;

    const apiBtn = document.createElement("button");
    apiBtn.className = "btn btn-green-api btn-small";
    apiBtn.setAttribute("data-action", "sendWhatsAppSingleViaApi");
    apiBtn.setAttribute("data-action-arg", g.id);
    apiBtn.textContent = `\u26a1 ${  window.t("btn_wa_api_send")}`;

    row.appendChild(statusSpan);
    row.appendChild(nameSpan);
    row.appendChild(sideBadge);
    row.appendChild(phoneSpan);
    row.appendChild(sendBtn);
    row.appendChild(apiBtn);
    window.el.waGuestList.appendChild(row);
  });
}
