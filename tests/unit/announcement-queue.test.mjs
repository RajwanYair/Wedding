/**
 * tests/unit/announcement-queue.test.mjs — Sprint 205
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  announce,
  clearAnnouncements,
  pendingCount,
  setLiveRegion,
  setAnnouncementDelay,
} from "../../src/utils/announcement-queue.js";

beforeEach(() => {
  clearAnnouncements();
  setLiveRegion(null);
  setAnnouncementDelay(0); // instant for tests
});

describe("announce", () => {
  it("does nothing for empty message", () => {
    announce("");
    expect(pendingCount()).toBe(0);
  });

  it("does not throw without live region", () => {
    expect(() => announce("hello")).not.toThrow();
  });

  it("sets live region text content", async () => {
    const el = document.createElement("div");
    setLiveRegion(el);
    announce("Test message");
    // Wait for the 20ms + 0ms delay
    await new Promise((r) => setTimeout(r, 50));
    expect(el.textContent).toBe("Test message");
  });

  it("uses polite by default", async () => {
    const el = document.createElement("div");
    setLiveRegion(el);
    announce("Hello");
    await new Promise((r) => setTimeout(r, 50));
    expect(el.getAttribute("aria-live")).toBe("polite");
  });

  it("supports assertive priority", async () => {
    const el = document.createElement("div");
    setLiveRegion(el);
    announce("Urgent", { priority: "assertive" });
    await new Promise((r) => setTimeout(r, 50));
    expect(el.getAttribute("aria-live")).toBe("assertive");
  });
});

describe("clearAnnouncements", () => {
  it("empties the queue", () => {
    // Queue something without a live region so it stays pending
    setLiveRegion(null);
    announce("one"); announce("two");
    clearAnnouncements();
    expect(pendingCount()).toBe(0);
  });
});

describe("pendingCount", () => {
  it("returns 0 initially", () => {
    expect(pendingCount()).toBe(0);
  });
});
