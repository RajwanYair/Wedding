/**
 * tests/unit/event-emitter.test.mjs — Sprint 211
 */

import { describe, it, expect, vi } from "vitest";
import { EventEmitter, createEmitter } from "../../src/utils/event-emitter.js";

describe("EventEmitter — on/emit", () => {
  it("calls listener with args", () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.on("test", fn);
    ee.emit("test", 1, 2);
    expect(fn).toHaveBeenCalledWith(1, 2);
  });

  it("calls multiple listeners", () => {
    const ee = new EventEmitter();
    const a = vi.fn(), b = vi.fn();
    ee.on("x", a).on("x", b);
    ee.emit("x");
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it("returns count of listeners called", () => {
    const ee = new EventEmitter();
    ee.on("a", vi.fn());
    ee.on("a", vi.fn());
    expect(ee.emit("a")).toBe(2);
  });

  it("does nothing for unregistered event", () => {
    const ee = new EventEmitter();
    expect(ee.emit("missing")).toBe(0);
  });
});

describe("EventEmitter — once", () => {
  it("calls listener exactly once", () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.once("ev", fn);
    ee.emit("ev");
    ee.emit("ev");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("EventEmitter — off", () => {
  it("removes specific listener", () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.on("ev", fn);
    ee.off("ev", fn);
    ee.emit("ev");
    expect(fn).not.toHaveBeenCalled();
  });

  it("no-op when listener not found", () => {
    const ee = new EventEmitter();
    expect(() => ee.off("ev", vi.fn())).not.toThrow();
  });
});

describe("EventEmitter — removeAll", () => {
  it("removes all listeners for an event", () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.on("a", fn);
    ee.removeAll("a");
    ee.emit("a");
    expect(fn).not.toHaveBeenCalled();
  });

  it("removes all events", () => {
    const ee = new EventEmitter();
    ee.on("a", vi.fn()).on("b", vi.fn());
    ee.removeAll();
    expect(ee.eventNames()).toHaveLength(0);
  });
});

describe("EventEmitter — wildcard *", () => {
  it("wildcard handler receives all events", () => {
    const ee = new EventEmitter();
    const fn = vi.fn();
    ee.on("*", fn);
    ee.emit("anything", "payload");
    expect(fn).toHaveBeenCalledWith("payload", "anything");
  });
});

describe("EventEmitter — error isolation", () => {
  it("continues calling other listeners after one throws", () => {
    const ee = new EventEmitter();
    const bad = () => { throw new Error("oops"); };
    const good = vi.fn();
    ee.on("error", () => {}); // silence re-emitted error
    ee.on("ev", bad);
    ee.on("ev", good);
    expect(() => ee.emit("ev")).not.toThrow();
    expect(good).toHaveBeenCalled();
  });
});

describe("EventEmitter — listenerCount / eventNames", () => {
  it("listenerCount returns correct count", () => {
    const ee = new EventEmitter();
    ee.on("a", vi.fn()).on("a", vi.fn());
    expect(ee.listenerCount("a")).toBe(2);
  });
  it("eventNames returns all registered events", () => {
    const ee = new EventEmitter();
    ee.on("a", vi.fn()).on("b", vi.fn());
    expect(ee.eventNames()).toContain("a");
    expect(ee.eventNames()).toContain("b");
  });
});

describe("createEmitter", () => {
  it("returns an EventEmitter instance", () => {
    expect(createEmitter()).toBeInstanceOf(EventEmitter);
  });
});
