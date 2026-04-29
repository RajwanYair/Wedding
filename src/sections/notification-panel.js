/**
 * src/sections/notification-panel.js — S143 notification centre dropdown.
 * S173: Migrated to BaseSection lifecycle.
 *
 * Wires the header bell icon to notification-centre.js. Renders unread
 * count badge and a dropdown panel with notification items.
 */

import { t } from "../core/i18n.js";
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  subscribe,
} from "../services/notification-centre.js";
import { BaseSection, fromSection } from "../core/section-base.js";

class NotificationPanelSection extends BaseSection {
  onMount() {
    updateBellBadge();
    this.addCleanup(subscribe(() => updateBellBadge()));
  }
}

export const { mount, unmount, capabilities } = fromSection(new NotificationPanelSection("notification-panel"));

/** Update the bell badge count. */
function updateBellBadge() {
  const badge = document.getElementById("notifBellCount");
  if (!badge) return;
  const count = unreadCount();
  badge.textContent = count > 99 ? "99+" : String(count);
  badge.classList.toggle("u-hidden", count === 0);
}

/** Render notification items into the panel list. */
function renderNotifList() {
  const container = document.getElementById("notifPanelList");
  if (!container) return;
  container.textContent = "";

  const items = listNotifications().slice(0, 50);
  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "notif-empty";
    empty.textContent = t("notif_empty");
    container.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = `notif-item${item.readAt ? "" : " notif-item--unread"}`;
    row.setAttribute("data-notif-id", item.id);

    const icon = document.createElement("span");
    icon.className = "notif-item-icon";
    icon.textContent = _levelIcon(item.level);
    row.appendChild(icon);

    const body = document.createElement("div");
    body.className = "notif-item-body";

    const title = document.createElement("strong");
    title.textContent = item.title;
    body.appendChild(title);

    if (item.body) {
      const desc = document.createElement("p");
      desc.textContent = item.body;
      body.appendChild(desc);
    }

    const time = document.createElement("time");
    time.className = "notif-item-time";
    time.textContent = _relativeTime(item.createdAt);
    body.appendChild(time);

    row.appendChild(body);

    if (!item.readAt) {
      row.addEventListener("click", () => {
        markRead(item.id);
        renderNotifList();
        updateBellBadge();
      });
    }

    container.appendChild(row);
  }
}

/** Toggle the notification panel visibility.
 * S215: prefers native Popover API (togglePopover) with fallback to classList.
 */
export function toggleNotifPanel() {
  const panel = document.getElementById("notifPanel");
  const btn = document.getElementById("notifBellBtn");
  if (!panel) return;
  // Native Popover API path (Chrome 114+, Firefox 125+, Safari 17+)
  if (typeof (/** @type {any} */ (panel)).togglePopover === "function") {
    /** @type {any} */ (panel).togglePopover();
    const isOpen = /** @type {any} */ (panel).matches(":popover-open");
    if (btn) btn.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) renderNotifList();
    return;
  }
  // Legacy fallback
  const isHidden = panel.classList.contains("u-hidden");
  panel.classList.toggle("u-hidden", !isHidden);
  if (btn) btn.setAttribute("aria-expanded", String(isHidden));
  if (isHidden) renderNotifList();
}

/** Mark all notifications as read and refresh. */
export function markAllNotifRead() {
  markAllRead();
  renderNotifList();
  updateBellBadge();
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _levelIcon(/** @type {string} */ level) {
  switch (level) {
    case "success": return "✅";
    case "warning": return "⚠️";
    case "error": return "❌";
    default: return "ℹ️";
  }
}

function _relativeTime(/** @type {string} */ iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t("notif_just_now");
  if (mins < 60) return `${mins}${t("notif_minutes_ago")}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t("notif_hours_ago")}`;
  const days = Math.floor(hours / 24);
  return `${days}${t("notif_days_ago")}`;
}
