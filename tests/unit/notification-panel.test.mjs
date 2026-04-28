/**
 * tests/unit/notification-panel.test.mjs — Sprint 143 notification centre dropdown
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const _store = new Map();
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: (k) => _store.get(k) ?? null,
  writeBrowserStorageJson: (k, v) => {
    _store.set(k, JSON.parse(JSON.stringify(v)));
  },
}));

beforeEach(() => {
  _store.clear();
});

const {
  pushNotification,
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  clearRead,
  subscribe,
} = await import("../../src/services/notification-centre.js");

describe("NotificationPanel (Sprint 143)", () => {

  it("pushNotification adds item and returns it", () => {
    const n = pushNotification({ title: "Test", level: "info" });
    expect(n.id).toMatch(/^n_/);
    expect(n.title).toBe("Test");
    expect(n.readAt).toBeNull();
  });

  it("listNotifications returns newest first", () => {
    pushNotification({ title: "First", level: "info" });
    pushNotification({ title: "Second", level: "info" });
    const list = listNotifications();
    expect(list[0].title).toBe("Second");
    expect(list[1].title).toBe("First");
  });

  it("unreadCount reflects unread items", () => {
    pushNotification({ title: "A", level: "info" });
    pushNotification({ title: "B", level: "warning" });
    expect(unreadCount()).toBe(2);
  });

  it("markRead marks a single notification", () => {
    const n = pushNotification({ title: "X", level: "info" });
    markRead(n.id);
    expect(unreadCount()).toBe(0);
    const list = listNotifications();
    expect(list[0].readAt).toBeTruthy();
  });

  it("markAllRead marks all as read", () => {
    pushNotification({ title: "A", level: "info" });
    pushNotification({ title: "B", level: "info" });
    markAllRead();
    expect(unreadCount()).toBe(0);
  });

  it("clearRead removes read notifications", () => {
    const n = pushNotification({ title: "A", level: "info" });
    pushNotification({ title: "B", level: "info" });
    markRead(n.id);
    const removed = clearRead();
    expect(removed).toBe(1);
    expect(listNotifications()).toHaveLength(1);
  });

  it("subscribe fires on push", () => {
    let called = 0;
    const unsub = subscribe(() => called++);
    pushNotification({ title: "T", level: "info" });
    expect(called).toBe(1);
    unsub();
    pushNotification({ title: "T2", level: "info" });
    expect(called).toBe(1);
  });

  it("pushNotification throws on missing title", () => {
    expect(() => pushNotification({})).toThrow("title required");
  });

  it("pushNotification defaults level to info", () => {
    const n = pushNotification({ title: "Default" });
    expect(n.level).toBe("info");
  });

  it("markRead returns false for non-existent id", () => {
    const result = markRead("nonexistent");
    expect(result).toBe(false);
  });

  it("markAllRead returns false when no unread items", () => {
    const result = markAllRead();
    expect(result).toBe(false);
  });
});
