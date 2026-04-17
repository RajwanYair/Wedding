/**
 * tests/unit/toast.test.mjs
 * @vitest-environment happy-dom
 *
 * Unit tests for src/utils/toast.js
 * Tests: toast.success/error/info/warning, dismiss, clear, queue, MAX_VISIBLE
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

let toast, _resetToastState;

beforeEach(async () => {
  vi.resetModules();
  ({ toast, _resetToastState } = await import("../../src/utils/toast.js"));
  _resetToastState();
});

// ── Basic show ────────────────────────────────────────────────────────────

describe("toast — basic variants", () => {
  it("success() adds a toast", () => {
    toast.success("Saved");
    expect(toast.activeCount()).toBe(1);
  });

  it("error() adds a toast", () => {
    toast.error("Failed");
    expect(toast.activeCount()).toBe(1);
  });

  it("info() adds a toast", () => {
    toast.info("Syncing…");
    expect(toast.activeCount()).toBe(1);
  });

  it("warning() adds a toast", () => {
    toast.warning("Check connection");
    expect(toast.activeCount()).toBe(1);
  });

  it("renders into the DOM", () => {
    toast.success("Hello");
    expect(document.querySelector(".toast")).not.toBeNull();
  });

  it("applies --success class", () => {
    toast.success("OK");
    expect(document.querySelector(".toast--success")).not.toBeNull();
  });

  it("applies --error class", () => {
    toast.error("Err");
    expect(document.querySelector(".toast--error")).not.toBeNull();
  });
});

// ── Dismiss ───────────────────────────────────────────────────────────────

describe("toast — dismiss", () => {
  it("dismiss() reduces count by 1", () => {
    toast.info("A", { id: "t1" });
    toast.info("B", { id: "t2" });
    toast.dismiss("t1");
    expect(toast.activeCount()).toBe(1);
  });

  it("clear() removes all toasts", () => {
    toast.success("A");
    toast.success("B");
    toast.clear();
    expect(toast.activeCount()).toBe(0);
  });
});

// ── Queue ─────────────────────────────────────────────────────────────────

describe("toast — queue when MAX_VISIBLE reached", () => {
  it("queues the 5th+ toast", () => {
    toast.info("1"); toast.info("2"); toast.info("3"); toast.info("4");
    toast.info("5"); // 5th → queued
    expect(toast.activeCount()).toBe(4);
    expect(toast.queuedCount()).toBe(1);
  });

  it("promotes queued toast when one is dismissed", () => {
    toast.info("1", { id: "a" });
    toast.info("2"); toast.info("3"); toast.info("4");
    toast.info("5"); // queued
    expect(toast.queuedCount()).toBe(1);
    toast.dismiss("a");
    expect(toast.activeCount()).toBe(4);
    expect(toast.queuedCount()).toBe(0);
  });
});

// ── Persistent toasts ─────────────────────────────────────────────────────

describe("toast — persistent", () => {
  it("persistent toast does not auto-dismiss (no timer created)", () => {
    vi.useFakeTimers();
    toast.info("Loading…", { persistent: true, id: "sync" });
    vi.advanceTimersByTime(10000);
    expect(toast.activeCount()).toBe(1);
    vi.useRealTimers();
  });
});

// ── ID deduplication ──────────────────────────────────────────────────────

describe("toast — id deduplication", () => {
  it("replaces toast with same id", () => {
    toast.info("First", { id: "myid" });
    toast.info("Updated", { id: "myid" });
    expect(toast.activeCount()).toBe(1);
  });
});
