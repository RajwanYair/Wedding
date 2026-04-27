/**
 * tests/unit/notification-centre.test.mjs — S121 notification feed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const _store = new Map();
vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorageJson: (k) => _store.get(k) ?? null,
  writeBrowserStorageJson: (k, v) => {
    _store.set(k, JSON.parse(JSON.stringify(v)));
  },
}));

beforeEach(() => {
  _store.clear();
  vi.resetModules();
});

describe("S121 — notification-centre", () => {
  it("pushNotification stores newest-first and unreadCount increments", async () => {
    const m = await import("../../src/services/notification-centre.js");
    m.pushNotification({ title: "A" });
    m.pushNotification({ title: "B", level: "warning" });
    const list = m.listNotifications();
    expect(list).toHaveLength(2);
    expect(list[0].title).toBe("B");
    expect(m.unreadCount()).toBe(2);
  });

  it("markRead flips readAt for one item only", async () => {
    const m = await import("../../src/services/notification-centre.js");
    const a = m.pushNotification({ title: "A" });
    m.pushNotification({ title: "B" });
    expect(m.markRead(a.id)).toBe(true);
    expect(m.unreadCount()).toBe(1);
  });

  it("markAllRead marks every item", async () => {
    const m = await import("../../src/services/notification-centre.js");
    m.pushNotification({ title: "A" });
    m.pushNotification({ title: "B" });
    expect(m.markAllRead()).toBe(true);
    expect(m.unreadCount()).toBe(0);
    expect(m.markAllRead()).toBe(false); // no-op second time
  });

  it("clearRead removes read items only", async () => {
    const m = await import("../../src/services/notification-centre.js");
    const a = m.pushNotification({ title: "A" });
    m.pushNotification({ title: "B" });
    m.markRead(a.id);
    expect(m.clearRead()).toBe(1);
    expect(m.listNotifications()).toHaveLength(1);
  });

  it("subscribe fires on push and unsubscribe stops it", async () => {
    const m = await import("../../src/services/notification-centre.js");
    const spy = vi.fn();
    const off = m.subscribe(spy);
    m.pushNotification({ title: "A" });
    expect(spy).toHaveBeenCalledTimes(1);
    off();
    m.pushNotification({ title: "B" });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("pushNotification throws without title", async () => {
    const m = await import("../../src/services/notification-centre.js");
    expect(() => m.pushNotification(/** @type {any} */ ({}))).toThrow();
  });

  it("tolerates corrupt storage payload", async () => {
    _store.set("wedding_v1_notifications", "not-an-array");
    const m = await import("../../src/services/notification-centre.js");
    expect(m.listNotifications()).toEqual([]);
  });
});
