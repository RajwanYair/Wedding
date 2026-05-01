// @ts-check
/** tests/unit/vendor-inbox.test.mjs — S594 */
import { describe, it, expect } from "vitest";
import {
  groupThreads,
  lastActivity,
  unreadCount,
  searchThreads,
} from "../../src/utils/vendor-inbox.js";

const messages = [
  { id: "m1", vendorId: "v1", channel: "email", body: "Initial quote", ts: "2026-04-01T10:00:00Z", read: true },
  { id: "m2", vendorId: "v1", channel: "email", body: "Updated price", ts: "2026-04-05T10:00:00Z" },
  { id: "m3", vendorId: "v2", channel: "whatsapp", body: "Photo samples?", ts: "2026-04-04T10:00:00Z" },
  { id: "m4", vendorId: "v2", channel: "note", body: "Follow up Tuesday", ts: "2026-04-02T10:00:00Z", read: true },
];

describe("S594 vendor-inbox", () => {
  it("groups messages into threads", () => {
    const threads = groupThreads(messages, { v1: "Catering Co", v2: "Photo Studio" });
    expect(threads).toHaveLength(2);
    expect(threads[0].vendorName).toBe("Catering Co"); // last activity 2026-04-05
    expect(threads[1].vendorName).toBe("Photo Studio");
  });

  it("orders messages within thread chronologically ascending", () => {
    const [t1] = groupThreads(messages.slice(0, 2));
    expect(t1.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("falls back vendorName to vendorId when not provided", () => {
    const [t] = groupThreads([messages[0]]);
    expect(t.vendorName).toBe("v1");
  });

  it("ignores messages without vendorId", () => {
    const t = groupThreads([{ id: "x", vendorId: "", channel: "email", body: "", ts: "" }]);
    expect(t).toEqual([]);
  });

  it("returns [] for non-array input", () => {
    expect(groupThreads(/** @type {any} */ (null))).toEqual([]);
  });

  it("lastActivity returns ms of last message", () => {
    const [t] = groupThreads(messages.slice(0, 2));
    expect(lastActivity(t)).toBe(Date.parse("2026-04-05T10:00:00Z"));
  });

  it("unreadCount counts unread messages", () => {
    const threads = groupThreads(messages);
    const v1 = threads.find((t) => t.vendorId === "v1");
    const v2 = threads.find((t) => t.vendorId === "v2");
    expect(unreadCount(/** @type {any} */ (v1))).toBe(1);
    expect(unreadCount(/** @type {any} */ (v2))).toBe(1);
  });

  it("searchThreads matches vendor name", () => {
    const threads = groupThreads(messages, { v1: "Catering Co", v2: "Photo Studio" });
    const r = searchThreads(threads, "photo");
    expect(r).toHaveLength(1);
    expect(r[0].vendorId).toBe("v2");
  });

  it("searchThreads matches message body", () => {
    const threads = groupThreads(messages, { v1: "Catering Co", v2: "Photo Studio" });
    const r = searchThreads(threads, "tuesday");
    expect(r).toHaveLength(1);
    expect(r[0].vendorId).toBe("v2");
  });

  it("searchThreads returns all on empty query", () => {
    const threads = groupThreads(messages);
    expect(searchThreads(threads, "")).toHaveLength(2);
  });
});
