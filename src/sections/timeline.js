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

/** @type {(() => void)[]} */
const _unsubs = [];

export function mount(_container) {
  _unsubs.push(storeSubscribe("timeline", renderTimeline));
  renderTimeline();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
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
