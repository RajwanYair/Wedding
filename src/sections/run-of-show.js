/**
 * src/sections/run-of-show.js — S144 run-of-show editor section.
 *
 * Visual timeline editor that consumes run-of-show.js (S125).
 * Renders items as draggable rows with time inputs, detects overlaps,
 * and supports add/remove/reorder operations.
 */

import { t } from "../core/i18n.js";
import { showToast } from "../core/ui.js";
import {
  loadRunOfShow,
  saveRunOfShow,
  buildDefaultTimeline,
  sortTimeline,
  detectOverlaps,
} from "../services/run-of-show.js";

/** @type {import('../services/run-of-show.js').TimelineItem[]} */
let _items = [];

/** Mount the section. */
export function mount() {
  _items = loadRunOfShow();
  if (_items.length === 0) {
    _items = buildDefaultTimeline("18:00");
    saveRunOfShow(_items);
  }
  renderTimeline();
}

/** Unmount the section. */
export function unmount() {
  _items = [];
}

/** Render the timeline list. */
export function renderTimeline() {
  const container = document.getElementById("rosTimeline");
  if (!container) return;
  container.textContent = "";

  const sorted = sortTimeline(_items);
  for (const item of sorted) {
    const row = document.createElement("div");
    row.className = "ros-item";
    row.setAttribute("role", "listitem");
    row.setAttribute("draggable", "true");
    row.setAttribute("data-ros-id", item.id);

    // Time badge
    const time = document.createElement("span");
    time.className = "ros-time";
    time.textContent = item.startTime;
    row.appendChild(time);

    // Title input
    const title = document.createElement("input");
    title.type = "text";
    title.className = "ros-title-input";
    title.value = item.title;
    title.addEventListener("change", () => {
      item.title = title.value.trim() || item.title;
      _persist();
    });
    row.appendChild(title);

    // Duration
    const dur = document.createElement("input");
    dur.type = "number";
    dur.className = "ros-duration-input";
    dur.min = "0";
    dur.max = "480";
    dur.value = String(item.durationMinutes);
    dur.title = t("ros_duration_label");
    dur.addEventListener("change", () => {
      item.durationMinutes = Math.max(0, parseInt(dur.value, 10) || 0);
      _persist();
      renderTimeline();
    });
    row.appendChild(dur);

    const durLabel = document.createElement("span");
    durLabel.className = "ros-dur-label";
    durLabel.textContent = t("ros_minutes");
    row.appendChild(durLabel);

    // Delete button
    const del = document.createElement("button");
    del.className = "btn-icon btn-xs btn-danger";
    del.textContent = "✕";
    del.title = t("ros_remove_item");
    del.addEventListener("click", () => {
      _items = _items.filter((i) => i.id !== item.id);
      _persist();
      renderTimeline();
    });
    row.appendChild(del);

    container.appendChild(row);
  }

  _renderOverlapWarnings();
}

/** Add a new timeline item. */
export function addItem() {
  const last = _items[_items.length - 1];
  const startMin = last
    ? _parseHmm(last.startTime) + last.durationMinutes
    : 18 * 60;
  const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  _items.push({
    id,
    title: t("ros_new_item"),
    startTime: _fromMinutes(startMin),
    durationMinutes: 30,
  });
  _persist();
  renderTimeline();
}

/** Reset to default timeline. */
export function resetDefault() {
  _items = buildDefaultTimeline("18:00");
  _persist();
  renderTimeline();
  showToast(t("ros_reset_done"), "success");
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _persist() {
  saveRunOfShow(_items);
}

function _renderOverlapWarnings() {
  const container = document.getElementById("rosOverlapWarnings");
  if (!container) return;
  const overlaps = detectOverlaps(_items);
  if (overlaps.length === 0) {
    container.classList.add("u-hidden");
    container.textContent = "";
    return;
  }
  container.classList.remove("u-hidden");
  container.textContent = `⚠️ ${t("ros_overlap_warning")}: ${overlaps.length}`;
}

function _parseHmm(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function _fromMinutes(n) {
  const wrapped = ((n % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
