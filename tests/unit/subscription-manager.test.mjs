/**
 * tests/unit/subscription-manager.test.mjs — Tests for SubscriptionManager (Sprint 61)
 */

import { describe, it, expect, vi } from "vitest";
import { SubscriptionManager, createSubscriptionManager } from "../../src/utils/subscription-manager.js";

describe("SubscriptionManager", () => {
  it("cleanup calls all registered unsubscribe functions", () => {
    const unsub1 = vi.fn();
    const unsub2 = vi.fn();
    const mgr = new SubscriptionManager();
    mgr.add(unsub1).add(unsub2);
    mgr.cleanup();
    expect(unsub1).toHaveBeenCalledTimes(1);
    expect(unsub2).toHaveBeenCalledTimes(1);
  });

  it("cleanup clears the set", () => {
    const mgr = new SubscriptionManager();
    mgr.add(vi.fn());
    mgr.cleanup();
    expect(mgr.size).toBe(0);
    expect(mgr.isEmpty).toBe(true);
  });

  it("size reflects number of registered cleanup functions", () => {
    const mgr = new SubscriptionManager();
    expect(mgr.size).toBe(0);
    mgr.add(vi.fn());
    mgr.add(vi.fn());
    expect(mgr.size).toBe(2);
  });

  it("isEmpty is true initially", () => {
    expect(new SubscriptionManager().isEmpty).toBe(true);
  });

  it("subscribe calls subscribe function with args and registers unsub", () => {
    const unsub = vi.fn();
    const mockSubscribe = vi.fn().mockReturnValue(unsub);
    const mgr = new SubscriptionManager();
    mgr.subscribe(mockSubscribe, "guests", vi.fn());
    expect(mockSubscribe).toHaveBeenCalledWith("guests", expect.any(Function));
    expect(mgr.size).toBe(1);
    mgr.cleanup();
    expect(unsub).toHaveBeenCalled();
  });

  it("cleanup is idempotent — safe to call multiple times", () => {
    const unsub = vi.fn();
    const mgr = new SubscriptionManager();
    mgr.add(unsub);
    mgr.cleanup();
    mgr.cleanup();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("ignores non-function values passed to add()", () => {
    const mgr = new SubscriptionManager();
    mgr.add(/** @type {*} */ (null));
    mgr.add(/** @type {*} */ (undefined));
    mgr.add(/** @type {*} */ (42));
    mgr.cleanup(); // should not throw
    expect(mgr.size).toBe(0);
  });

  it("cleanup continues even if one unsub throws", () => {
    const errorFn = vi.fn().mockImplementation(() => { throw new Error("oops"); });
    const goodFn = vi.fn();
    const mgr = new SubscriptionManager();
    mgr.add(errorFn).add(goodFn);
    expect(() => mgr.cleanup()).not.toThrow();
    expect(goodFn).toHaveBeenCalled();
  });

  it("add is chainable and returns this", () => {
    const mgr = new SubscriptionManager();
    const result = mgr.add(vi.fn()).add(vi.fn());
    expect(result).toBe(mgr);
    expect(mgr.size).toBe(2);
  });

  it("subscribe is chainable and returns this", () => {
    const mgr = new SubscriptionManager();
    const result = mgr.subscribe(vi.fn().mockReturnValue(vi.fn()), "key", vi.fn());
    expect(result).toBe(mgr);
  });
});

describe("createSubscriptionManager", () => {
  it("returns a SubscriptionManager instance", () => {
    expect(createSubscriptionManager()).toBeInstanceOf(SubscriptionManager);
  });
});
