/**
 * tests/unit/events.test.mjs — Unit tests for events core module
 * Covers: on · off · initEvents dispatch
 *
 * @vitest-environment happy-dom
 * Run: npm test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { on, off, initEvents } from "../../src/core/events.js";

// ── on / off (pure Map operations) ───────────────────────────────────────

describe("on", () => {
  it("registers a handler without throwing", () => {
    expect(() => on("test-action", () => {})).not.toThrow();
  });

  it("replaces existing handler for same action", () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    on("dup", spy1);
    on("dup", spy2);
    // Clean up
    off("dup");
  });
});

describe("off", () => {
  it("removes a handler without throwing", () => {
    on("rm-action", () => {});
    expect(() => off("rm-action")).not.toThrow();
  });

  it("is safe to call for non-existent action", () => {
    expect(() => off("never-registered")).not.toThrow();
  });
});

// ── initEvents + dispatch ────────────────────────────────────────────────

describe("initEvents dispatch", () => {
  beforeEach(() => {
    initEvents();
  });

  it("dispatches click on data-action element", () => {
    const spy = vi.fn();
    on("click-test", spy);
    const btn = document.createElement("button");
    btn.dataset.action = "click-test";
    document.body.appendChild(btn);
    btn.click();
    expect(spy).toHaveBeenCalledTimes(1);
    document.body.removeChild(btn);
    off("click-test");
  });

  it("passes the element and event to handler", () => {
    const spy = vi.fn();
    on("pass-args", spy);
    const el = document.createElement("span");
    el.dataset.action = "pass-args";
    document.body.appendChild(el);
    el.click();
    expect(spy.mock.calls[0][0]).toBe(el);
    expect(spy.mock.calls[0][1]).toBeInstanceOf(Event);
    document.body.removeChild(el);
    off("pass-args");
  });

  it("dispatches to closest data-action ancestor", () => {
    const spy = vi.fn();
    on("parent-action", spy);
    const parent = document.createElement("div");
    parent.dataset.action = "parent-action";
    const child = document.createElement("span");
    parent.appendChild(child);
    document.body.appendChild(parent);
    child.click();
    expect(spy).toHaveBeenCalledTimes(1);
    document.body.removeChild(parent);
    off("parent-action");
  });

  it("does nothing for unregistered action", () => {
    const el = document.createElement("button");
    el.dataset.action = "no-handler";
    document.body.appendChild(el);
    expect(() => el.click()).not.toThrow();
    document.body.removeChild(el);
  });

  it("catches and logs handler errors", () => {
    on("error-action", () => {
      throw new Error("boom");
    });
    const el = document.createElement("button");
    el.dataset.action = "error-action";
    document.body.appendChild(el);
    expect(() => el.click()).not.toThrow();
    document.body.removeChild(el);
    off("error-action");
  });
});
