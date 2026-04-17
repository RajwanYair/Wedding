/**
 * tests/unit/observer.test.mjs — Sprint 174
 */

import { describe, it, expect, vi } from "vitest";
import { observable, computed } from "../../src/utils/observer.js";

describe("observable — get/set", () => {
  it("returns initial value", () => {
    const o = observable(42);
    expect(o.get()).toBe(42);
  });

  it("set updates value", () => {
    const o = observable(1);
    o.set(2);
    expect(o.get()).toBe(2);
  });

  it("set with same value does not change", () => {
    const o = observable(5);
    o.set(5);
    expect(o.get()).toBe(5);
  });
});

describe("observable — subscribe", () => {
  it("calls subscriber on change", () => {
    const fn = vi.fn();
    const o = observable(0);
    o.subscribe(fn);
    o.set(1);
    expect(fn).toHaveBeenCalledWith(1, 0);
  });

  it("does not call subscriber when value unchanged", () => {
    const fn = vi.fn();
    const o = observable("hello");
    o.subscribe(fn);
    o.set("hello");
    expect(fn).not.toHaveBeenCalled();
  });

  it("unsubscribe stops notifications", () => {
    const fn = vi.fn();
    const o = observable(0);
    const unsub = o.subscribe(fn);
    unsub();
    o.set(1);
    expect(fn).not.toHaveBeenCalled();
  });

  it("multiple subscribers all receive updates", () => {
    const a = vi.fn();
    const b = vi.fn();
    const o = observable(0);
    o.subscribe(a);
    o.subscribe(b);
    o.set(5);
    expect(a).toHaveBeenCalledWith(5, 0);
    expect(b).toHaveBeenCalledWith(5, 0);
  });
});

describe("observable — update", () => {
  it("applies transform and notifies", () => {
    const fn = vi.fn();
    const o = observable(10);
    o.subscribe(fn);
    o.update((v) => v + 5);
    expect(o.get()).toBe(15);
    expect(fn).toHaveBeenCalledWith(15, 10);
  });

  it("no notification when transform returns same value", () => {
    const fn = vi.fn();
    const o = observable(10);
    o.subscribe(fn);
    o.update((v) => v);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("computed", () => {
  it("derives value from source", () => {
    const count = observable(2);
    const doubled = computed([count], () => count.get() * 2);
    expect(doubled.get()).toBe(4);
  });

  it("updates when source changes", () => {
    const count = observable(2);
    const doubled = computed([count], () => count.get() * 2);
    count.set(5);
    expect(doubled.get()).toBe(10);
  });

  it("notifies computed subscribers on recompute", () => {
    const fn = vi.fn();
    const x = observable(1);
    const y = computed([x], () => x.get() + 100);
    y.subscribe(fn);
    x.set(9);
    expect(fn).toHaveBeenCalledWith(109, 101);
  });

  it("does not notify when computed value unchanged", () => {
    const fn = vi.fn();
    const x = observable("a");
    const c = computed([x], () => "constant");
    c.subscribe(fn);
    x.set("b");
    expect(fn).not.toHaveBeenCalled();
  });

  it("combines multiple sources", () => {
    const a = observable(1);
    const b = observable(2);
    const sum = computed([a, b], () => a.get() + b.get());
    expect(sum.get()).toBe(3);
    a.set(10);
    expect(sum.get()).toBe(12);
  });
});
