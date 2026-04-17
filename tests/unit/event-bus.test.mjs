/**
 * tests/unit/event-bus.test.mjs — Sprint 145
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { on, once, off, emit, listenerCount, clearAll, activeEvents } from "../../src/utils/event-bus.js";

beforeEach(() => clearAll());

describe("on / emit", () => {
  it("calls handler with payload", () => {
    const handler = vi.fn();
    on("test", handler);
    emit("test", { x: 1 });
    expect(handler).toHaveBeenCalledWith({ x: 1 });
  });

  it("multiple handlers are all called", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    on("multi", h1);
    on("multi", h2);
    emit("multi");
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("emitting unknown event does not throw", () => {
    expect(() => emit("noop")).not.toThrow();
  });
});

describe("off", () => {
  it("unsubscribes handler", () => {
    const handler = vi.fn();
    on("evt", handler);
    off("evt", handler);
    emit("evt");
    expect(handler).not.toHaveBeenCalled();
  });

  it("returned unsubscribe function works", () => {
    const handler = vi.fn();
    const unsub = on("evt", handler);
    unsub();
    emit("evt");
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("once", () => {
  it("fires exactly once", () => {
    const handler = vi.fn();
    once("oneshot", handler);
    emit("oneshot", "a");
    emit("oneshot", "b");
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith("a");
  });
});

describe("listenerCount", () => {
  it("reports count correctly", () => {
    expect(listenerCount("count")).toBe(0);
    const unsub = on("count", vi.fn());
    expect(listenerCount("count")).toBe(1);
    unsub();
    expect(listenerCount("count")).toBe(0);
  });
});

describe("activeEvents", () => {
  it("lists events with handlers", () => {
    on("alpha", vi.fn());
    on("beta", vi.fn());
    const events = activeEvents();
    expect(events).toContain("alpha");
    expect(events).toContain("beta");
  });

  it("does not list events with no handlers", () => {
    const unsub = on("empty", vi.fn());
    unsub();
    expect(activeEvents()).not.toContain("empty");
  });
});

describe("clearAll", () => {
  it("removes all subscriptions", () => {
    on("x", vi.fn());
    on("y", vi.fn());
    clearAll();
    expect(activeEvents()).toHaveLength(0);
  });
});

describe("error isolation", () => {
  it("error in one handler does not prevent others", () => {
    const bad  = vi.fn(() => { throw new Error("oops"); });
    const good = vi.fn();
    on("err", bad);
    on("err", good);
    expect(() => emit("err")).not.toThrow();
    expect(good).toHaveBeenCalledOnce();
  });
});
