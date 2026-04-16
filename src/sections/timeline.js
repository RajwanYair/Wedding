/**
 * src/sections/timeline.js — Timeline section ESM module (S0.8)
 *
 * Wedding day schedule: add/edit/remove timeline items.
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { sanitize } from "../utils/sanitize.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";

/** @type {(() => void)[]} */
const _unsubs = [];

export function mount(_container) {
  _unsubs.push(storeSubscribe("timeline", renderTimeline));
  _unsubs.push(storeSubscribe("weddingInfo", renderTimeline));
  renderTimeline();
  startTimelineAlarms();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
  stopTimelineAlarms();
}

/**
 * @param {Record<string, unknown>} data
 * @param {string|null} [existingId]
 */
export function saveTimelineItem(data, existingId = null) {
  const { value, errors } = sanitize(data, {
    time: { type: "string", required: true, maxLength: 20 },
    title: { type: "string", required: true, maxLength: 120 },
    note: { type: "string", required: false, maxLength: 300 },
    icon: { type: "string", required: false, maxLength: 10 },
  });
  if (errors.length) return { ok: false, errors };

  const items = [.../** @type {any[]} */ (storeGet("timeline") ?? [])];
  if (existingId) {
    const idx = items.findIndex((i) => i.id === existingId);
    if (idx !== -1) items[idx] = { ...items[idx], ...value };
  } else {
    items.push({ id: uid(), ...value });
  }
  items.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  storeSet("timeline", items);
  enqueueWrite("timeline", () => syncStoreKeyToSheets("timeline"));
  return { ok: true };
}

/** @param {string} id */
export function deleteTimelineItem(id) {
  storeSet(
    "timeline",
    /** @type {any[]} */ (storeGet("timeline") ?? []).filter(
      (i) => i.id !== id,
    ),
  );
  enqueueWrite("timeline", () => syncStoreKeyToSheets("timeline"));
}

export function renderTimeline() {
  const list = el.timelineList;
  if (!list) return;

  const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
  list.textContent = "";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "timeline-item";
    li.dataset.id = item.id;

    const time = document.createElement("span");
    time.className = "timeline-time";
    time.textContent = item.time;
    li.appendChild(time);

    const icon = document.createElement("span");
    icon.className = "timeline-icon";
    icon.textContent = item.icon || "📍";
    li.appendChild(icon);

    const title = document.createElement("span");
    title.className = "timeline-title";
    title.textContent = item.title;
    li.appendChild(title);

    if (item.note) {
      const note = document.createElement("p");
      note.className = "timeline-note";
      note.textContent = item.note;
      li.appendChild(note);
    }

    // Action buttons
    const actions = document.createElement("span");
    actions.className = "timeline-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-small btn-secondary";
    editBtn.textContent = t("btn_edit");
    editBtn.dataset.action = "openEditTimelineModal";
    editBtn.dataset.actionArg = item.id;
    actions.appendChild(editBtn);
    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-small btn-danger u-ml-xs";
    delBtn.textContent = t("btn_delete");
    delBtn.dataset.action = "deleteTimelineItem";
    delBtn.dataset.actionArg = item.id;
    actions.appendChild(delBtn);
    li.appendChild(actions);

    list.appendChild(li);
  });

  if (list.children.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = t("timeline_empty");
    list.appendChild(empty);
  }
}

/**
 * Pre-fill the timeline modal with an existing item and open it.
 * @param {string} id
 */
export function openTimelineForEdit(id) {
  const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const setVal = (elId, val) => {
    const input = /** @type {HTMLInputElement|null} */ (
      document.getElementById(elId)
    );
    if (input) input.value = String(val ?? "");
  };
  setVal("timelineModalId", item.id);
  setVal("timelineTime", item.time ?? "");
  setVal("timelineIcon", item.icon ?? "");
  setVal("timelineTitle", item.title ?? "");
  setVal("timelineDesc", item.note ?? "");
  const title = document.getElementById("timelineModalTitle");
  if (title) title.setAttribute("data-i18n", "timeline_edit");
}

// ── S18.4 Timeline Event Alarm ────────────────────────────────────────────

/** @type {number|null} */
let _alarmIntervalId = null;

/**
 * Check timeline items due within the next 24 h.
 * Shows a browser Notification (if granted) or in-app banner.
 */
export function checkTimelineAlarms() {
  const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
  if (!items.length) return;

  // Build wedding date from weddingInfo
  const info = /** @type {Record<string,unknown>} */ (storeGet("weddingInfo") ?? {});
  const weddingDateStr = /** @type {string} */ (info.date ?? "");
  const today = new Date();
  // Use wedding date's year/month/day combined with item time
  const baseDate = weddingDateStr
    ? new Date(new Date(weddingDateStr).toDateString())
    : new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const now = Date.now();
  const H24 = 24 * 60 * 60 * 1000;

  items.forEach((item) => {
    if (!item.time) return;
    const [hh, mm] = item.time.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm)) return;
    const eventTs = new Date(baseDate).setHours(hh, mm, 0, 0);
    const diffMs = eventTs - now;
    // Only alert for events in the next 24 h (not past)
    if (diffMs > 0 && diffMs <= H24) {
      _fireTimelineAlert(item, diffMs);
    }
  });
}

/**
 * Start the periodic alarm check (runs every 5 minutes after mount).
 */
export function startTimelineAlarms() {
  checkTimelineAlarms();
  if (_alarmIntervalId === null) {
    _alarmIntervalId = window.setInterval(checkTimelineAlarms, 5 * 60 * 1000);
  }
}

/**
 * Stop the periodic alarm interval.
 */
export function stopTimelineAlarms() {
  if (_alarmIntervalId !== null) {
    clearInterval(_alarmIntervalId);
    _alarmIntervalId = null;
  }
}

/**
 * @param {Record<string,unknown>} item
 * @param {number} diffMs
 */
function _fireTimelineAlert(item, diffMs) {
  const minutesLeft = Math.round(diffMs / 60000);
  const msg = `${item.icon ?? "📍"} ${item.title} — ${minutesLeft} ${t("timeline_alarm_minutes")}`;

  // Try browser notification
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(t("timeline_alarm_title"), { body: msg });
    return;
  }

  // Fallback: in-app banner
  const existing = document.getElementById("timelineAlarmBanner");
  if (existing) existing.remove();
  const banner = document.createElement("div");
  banner.id = "timelineAlarmBanner";
  banner.className = "alert alert--warning timeline-alarm-banner";
  banner.textContent = msg;
  const closeBtn = document.createElement("button");
  closeBtn.className = "btn-icon u-ml-sm";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => banner.remove());
  banner.appendChild(closeBtn);
  (document.getElementById("timelineList") ?? document.body).before(banner);
  setTimeout(() => banner.remove(), 10000);
}
