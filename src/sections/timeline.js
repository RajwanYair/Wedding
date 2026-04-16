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
  _unsubs.push(storeSubscribe("timelineDone", renderTimeline)); // S24.1
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

    // S24.1 Done checkbox toggle
    const doneMap = /** @type {Record<string,boolean>} */ (
      storeGet("timelineDone") ?? {}
    );
    const isDone = !!doneMap[item.id];
    li.classList.toggle("timeline-item--done", isDone);
    const doneBtn = document.createElement("button");
    doneBtn.className = `btn btn-small ${isDone ? "btn-success" : "btn-ghost"} u-mr-xs`;
    doneBtn.title = t("timeline_toggle_done");
    doneBtn.textContent = isDone ? "✅" : "⬜";
    doneBtn.dataset.action = "toggleTimelineDone";
    doneBtn.dataset.actionArg = item.id;
    actions.appendChild(doneBtn);

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

// ── S20.2 Timeline Print ─────────────────────────────────────────────────

/**
 * Open a print window containing the full timeline schedule.
 */
export function printTimeline() {
  const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
  if (items.length === 0) { alert(t("timeline_empty")); return; }

  const sorted = [...items].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const rows = sorted.map((item) =>
    `<tr><td class="tl-time">${_esc(item.time || "")}</td><td class="tl-title">${_esc(item.title || "")}</td><td class="tl-notes">${_esc(item.notes || "")}</td></tr>`,
  ).join("");

  const weddingInfo = /** @type {any} */ (storeGet("weddingInfo") ?? {});
  const heading = weddingInfo.brideName && weddingInfo.groomName
    ? `${_esc(weddingInfo.brideName)} &amp; ${_esc(weddingInfo.groomName)}`
    : t("timeline_title");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head>
    <meta charset="utf-8"><title>${heading}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2cm; direction: rtl; }
      h1 { text-align: center; font-size: 18pt; margin-bottom: 1cm; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ccc; padding: 0.3cm; text-align: right; vertical-align: top; }
      th { background: #f0f0f0; font-size: 12pt; }
      .tl-time { white-space: nowrap; width: 2cm; font-weight: bold; }
      .tl-notes { color: #666; font-size: 10pt; }
      @media print { body { margin: 1cm; } }
    </style>
  </head><body>
  <h1>${heading}</h1>
  <table><thead><tr><th>${t("col_time")}</th><th>${t("col_title")}</th><th>${t("col_notes")}</th></tr></thead>
  <tbody>${rows}</tbody></table>
  </body></html>`);
  win.document.close();
  win.print();
}

// ── S24.1 Timeline done toggle ───────────────────────────────────────────

/**
 * Toggle the done state of a timeline item.
 * Persists in the "timelineDone" store key and syncs to Sheets.
 * @param {string} id
 */
export function toggleTimelineDone(id) {
  const done = { .../** @type {Record<string,boolean>} */ (storeGet("timelineDone") ?? {}) };
  done[id] = !done[id];
  storeSet("timelineDone", done);
  enqueueWrite("timelineDone", () => syncStoreKeyToSheets("timelineDone"));
}

/** @param {string} s */
function _esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Sprint 2: Timeline CSV export ─────────────────────────────────────────

/**
 * Export timeline items as a CSV file download.
 */
export function exportTimelineCSV() {
  const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
  const done = /** @type {Record<string,boolean>} */ (storeGet("timelineDone") ?? {});
  const header = "Time,Title,Note,Icon,Done";
  const rows = items.map((i) =>
    [i.time, `"${(i.title || "").replace(/"/g, '""')}"`, `"${(i.note || "").replace(/"/g, '""')}"`, i.icon || "", done[i.id] ? "yes" : "no"].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "timeline.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Timeline completion stats — done vs pending items.
 * @returns {{ total: number, done: number, pending: number, completionRate: number }}
 */
export function getTimelineCompletionStats() {
  const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
  const done = /** @type {Record<string,boolean>} */ (storeGet("timelineDone") ?? {});
  const doneCount = items.filter((i) => done[i.id]).length;
  return {
    total: items.length,
    done: doneCount,
    pending: items.length - doneCount,
    completionRate: items.length ? Math.round((doneCount / items.length) * 100) : 0,
  };
}

/**
 * Duration between first and last timeline items (minutes).
 * @returns {{ startTime: string, endTime: string, durationMinutes: number } | null}
 */
export function getTimelineDuration() {
  const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
  const withTime = items.filter((i) => i.time).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  if (withTime.length < 2) return null;
  const first = withTime[0].time;
  const last = withTime[withTime.length - 1].time;
  const [h1, m1] = first.split(":").map(Number);
  const [h2, m2] = last.split(":").map(Number);
  return { startTime: first, endTime: last, durationMinutes: (h2 * 60 + m2) - (h1 * 60 + m1) };
}

/**
 * Next N upcoming timeline items (from wedding day).
 * @param {number} [limit=3]
 * @returns {{ id: string, time: string, title: string, done: boolean }[]}
 */
export function getUpcomingTimelineItems(limit = 3) {
  const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
  const done = /** @type {Record<string,boolean>} */ (storeGet("timelineDone") ?? {});
  return items
    .filter((i) => i.time && !done[i.id])
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))
    .slice(0, limit)
    .map((i) => ({ id: i.id, time: i.time, title: i.title || "", done: false }));
}
