import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { throttle } from "../../src/utils/throttle.js";

describe("throttle", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("invokes leading call immediately", () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t("a");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("coalesces calls within window", () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t("a");
    t("b");
    t("c");
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("c");
  });

  it("leading:false suppresses first immediate call", () => {
    const fn = vi.fn();
    const t = throttle(fn, 100, { leading: false });
    t("a");
    expect(fn).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("trailing:false suppresses tail call", () => {
    const fn = vi.fn();
    const t = throttle(fn, 100, { trailing: false });
    t("a");
    t("b");
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");
  });

  it("cancel prevents trailing call", () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t("a");
    t("b");
    t.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("flush fires trailing call now", () => {
    const fn = vi.fn();
    const t = throttle(fn, 100);
    t("a");
    t("b");
    t.flush();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("b");
  });

  it("rejects bad input", () => {
    expect(() => throttle(/** @type {any} */ (null), 100)).toThrow(TypeError);
    expect(() => throttle(() => {}, -1)).toThrow(RangeError);
  });

  it("preserves this", () => {
    const seen = [];
    const t = throttle(function () {
      seen.push(this);
    }, 50);
    const ctx = { x: 1 };
    t.call(ctx);
    expect(seen[0]).toBe(ctx);
  });
});
