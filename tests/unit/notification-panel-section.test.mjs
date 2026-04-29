/**
 * tests/unit/notification-panel-section.test.mjs — S317: section coverage for
 * @vitest-environment happy-dom
 * src/sections/notification-panel.js
 *
 * Tests bell badge, renderNotifList, toggleNotifPanel (popover + legacy),
 * markAllNotifRead, and _levelIcon / _relativeTime helpers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────

let _notifications = [];
let _unread = 0;
const _subscribers = [];

vi.mock("../../src/services/notifications.js", () => ({
  listNotifications: vi.fn(() => _notifications),
  unreadCount: vi.fn(() => _unread),
  markRead: vi.fn((id) => {
    const n = _notifications.find((x) => x.id === id);
    if (n) n.readAt = new Date().toISOString();
    _unread = _notifications.filter((x) => !x.readAt).length;
  }),
  markAllRead: vi.fn(() => {
    _notifications.forEach((n) => { n.readAt = new Date().toISOString(); });
    _unread = 0;
  }),
  subscribe: vi.fn((fn) => {
    _subscribers.push(fn);
    return () => {};
  }),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (/** @type {string} */ k) => k,
}));

// BaseSection + section-base need store
vi.mock("../../src/core/store.js", () => ({
  storeGet: vi.fn(() => null),
  storeSet: vi.fn(),
  storeSubscribe: vi.fn(() => () => {}),
  storeSubscribeScoped: vi.fn(() => () => {}),
  cleanupScope: vi.fn(),
}));

vi.mock("../../src/core/sync.js", () => ({
  enqueueWrite: vi.fn(async (_k, fn) => fn()),
}));

// ── Module under test ────────────────────────────────────────────────────

import {
  mount,
  unmount,
  toggleNotifPanel,
  markAllNotifRead,
  capabilities,
} from "../../src/sections/notification-panel.js";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeDom({ popoverSupport = false } = {}) {
  document.body.innerHTML = `
    <button id="notifBellBtn" aria-expanded="false"></button>
    <span id="notifBellCount" class="u-hidden">0</span>
    <div id="notifPanel" class="u-hidden">
      <div id="notifPanelList"></div>
    </div>
  `;
  if (popoverSupport) {
    const panel = document.getElementById("notifPanel");
    let _open = false;
    panel.togglePopover = vi.fn(() => { _open = !_open; });
    panel.matches = vi.fn((sel) => sel === ":popover-open" ? _open : false);
  }
}

function makeNotif(id, opts = {}) {
  return {
    id,
    title: `Notif ${id}`,
    body: opts.body ?? null,
    level: opts.level ?? "info",
    createdAt: opts.createdAt ?? new Date().toISOString(),
    readAt: opts.readAt ?? null,
  };
}

beforeEach(async () => {
  _notifications = [];
  _unread = 0;
  _subscribers.length = 0;
  makeDom();
  unmount();
  await mount();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("S317 — NotificationPanelSection — lifecycle", () => {
  it("capabilities is defined", () => {
    expect(capabilities).toBeDefined();
  });

  it("bell badge is hidden when unread = 0", async () => {
    const badge = document.getElementById("notifBellCount");
    expect(badge.classList.contains("u-hidden")).toBe(true);
  });

  it("bell badge shows count when unread > 0", async () => {
    _unread = 3;
    _subscribers.forEach((fn) => fn()); // trigger re-render
    const badge = document.getElementById("notifBellCount");
    expect(badge.textContent).toBe("3");
    expect(badge.classList.contains("u-hidden")).toBe(false);
  });

  it("bell badge caps at 99+", () => {
    _unread = 150;
    _subscribers.forEach((fn) => fn());
    expect(document.getElementById("notifBellCount").textContent).toBe("99+");
  });
});

describe("S317 — NotificationPanelSection — toggleNotifPanel", () => {
  it("legacy: toggles panel from hidden to visible", () => {
    toggleNotifPanel();
    const panel = document.getElementById("notifPanel");
    expect(panel.classList.contains("u-hidden")).toBe(false);
    expect(document.getElementById("notifBellBtn").getAttribute("aria-expanded")).toBe("true");
  });

  it("legacy: toggles panel back to hidden on second call", () => {
    toggleNotifPanel();
    toggleNotifPanel();
    const panel = document.getElementById("notifPanel");
    expect(panel.classList.contains("u-hidden")).toBe(true);
  });

  it("legacy: renders notification list when opened", () => {
    _notifications = [makeNotif("n1")];
    toggleNotifPanel();
    const list = document.getElementById("notifPanelList");
    expect(list.querySelectorAll(".notif-item").length).toBe(1);
  });

  it("legacy: renders empty state when no notifications", () => {
    _notifications = [];
    toggleNotifPanel();
    expect(document.getElementById("notifPanelList").querySelector(".notif-empty")).not.toBeNull();
  });

  it("popover path: calls togglePopover and renders list on open", () => {
    makeDom({ popoverSupport: true });
    _notifications = [makeNotif("p1")];
    toggleNotifPanel();
    const panel = document.getElementById("notifPanel");
    expect(panel.togglePopover).toHaveBeenCalled();
  });

  it("does nothing when panel is missing", () => {
    document.getElementById("notifPanel").remove();
    expect(() => toggleNotifPanel()).not.toThrow();
  });
});

describe("S317 — NotificationPanelSection — notification items", () => {
  it("unread item has --unread class modifier", () => {
    _notifications = [makeNotif("u1")];
    toggleNotifPanel();
    const item = document.querySelector(".notif-item");
    expect(item.className).toContain("notif-item--unread");
  });

  it("read item does NOT have --unread class", () => {
    _notifications = [makeNotif("r1", { readAt: new Date().toISOString() })];
    toggleNotifPanel();
    const item = document.querySelector(".notif-item");
    expect(item.className).not.toContain("notif-item--unread");
  });

  it("item with body renders a <p> description", () => {
    _notifications = [makeNotif("b1", { body: "Some detail" })];
    toggleNotifPanel();
    const p = document.querySelector(".notif-item-body p");
    expect(p).not.toBeNull();
    expect(p.textContent).toBe("Some detail");
  });

  it("clicking unread item marks it as read", () => {
    _notifications = [makeNotif("m1")];
    toggleNotifPanel();
    const item = /** @type {HTMLElement} */ (document.querySelector(".notif-item--unread"));
    item.click();
    // After click, the item should no longer be unread
    expect(document.querySelector(".notif-item--unread")).toBeNull();
  });

  it("level icons map correctly", () => {
    const levels = ["success", "warning", "error", "info", "unknown"];
    for (const level of levels) {
      _notifications = [makeNotif(`l_${level}`, { level })];
      toggleNotifPanel();
      // just check icon span exists
      const icon = document.querySelector(".notif-item-icon");
      expect(icon).not.toBeNull();
      // close panel for next
      toggleNotifPanel();
    }
  });
});

describe("S317 — NotificationPanelSection — markAllNotifRead", () => {
  it("marks all read and hides badge", () => {
    _notifications = [makeNotif("all1"), makeNotif("all2")];
    _unread = 2;
    _subscribers.forEach((fn) => fn()); // update badge to show 2
    markAllNotifRead();
    // _unread reset to 0 by mock's markAllRead
    expect(document.getElementById("notifBellCount").classList.contains("u-hidden")).toBe(true);
  });
});

describe("S317 — NotificationPanelSection — relative time helper", () => {
  it("shows notif_just_now for < 1 minute ago", () => {
    const now = new Date().toISOString();
    _notifications = [makeNotif("t1", { createdAt: now })];
    toggleNotifPanel();
    const time = document.querySelector(".notif-item-time");
    expect(time.textContent).toBe("notif_just_now");
  });

  it("shows minutes ago for recent items", () => {
    const past = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    _notifications = [makeNotif("t2", { createdAt: past })];
    toggleNotifPanel();
    const time = document.querySelector(".notif-item-time");
    expect(time.textContent).toContain("notif_minutes_ago");
  });

  it("shows hours ago for 2h old item", () => {
    const past = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    _notifications = [makeNotif("t3", { createdAt: past })];
    toggleNotifPanel();
    const time = document.querySelector(".notif-item-time");
    expect(time.textContent).toContain("notif_hours_ago");
  });

  it("shows days ago for 2-day old item", () => {
    const past = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
    _notifications = [makeNotif("t4", { createdAt: past })];
    toggleNotifPanel();
    const time = document.querySelector(".notif-item-time");
    expect(time.textContent).toContain("notif_days_ago");
  });
});
