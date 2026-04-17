/**
 * tests/unit/cache-manager.test.mjs — Sprint 164
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CacheManager } from "../../src/utils/cache-manager.js";

/** @type {CacheManager<string>} */
let c;

beforeEach(() => {
  vi.useFakeTimers();
  c = new CacheManager();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("set / get", () => {
  it("returns stored value immediately", () => {
    c.set("key", "hello");
    expect(c.get("key")).toBe("hello");
  });

  it("returns undefined for missing key", () => {
    expect(c.get("missing")).toBeUndefined();
  });

  it("returns undefined after TTL expires", () => {
    c.set("key", "value", 1000);
    vi.advanceTimersByTime(1001);
    expect(c.get("key")).toBeUndefined();
  });

  it("returns value before TTL expires", () => {
    c.set("key", "value", 5000);
    vi.advanceTimersByTime(4999);
    expect(c.get("key")).toBe("value");
  });
});

describe("has", () => {
  it("returns true when key exists", () => {
    c.set("k", "v");
    expect(c.has("k")).toBe(true);
  });

  it("returns false for missing key", () => {
    expect(c.has("nope")).toBe(false);
  });

  it("returns false for expired key", () => {
    c.set("k", "v", 500);
    vi.advanceTimersByTime(501);
    expect(c.has("k")).toBe(false);
  });
});

describe("delete", () => {
  it("removes a key", () => {
    c.set("k", "v");
    c.delete("k");
    expect(c.has("k")).toBe(false);
  });

  it("delete is no-op for missing key", () => {
    expect(() => c.delete("ghost")).not.toThrow();
  });
});

describe("invalidatePrefix", () => {
  it("removes all keys with matching prefix", () => {
    c.set("guest:1", "a");
    c.set("guest:2", "b");
    c.set("table:1", "c");
    c.invalidatePrefix("guest:");
    expect(c.has("guest:1")).toBe(false);
    expect(c.has("guest:2")).toBe(false);
    expect(c.has("table:1")).toBe(true);
  });
});

describe("invalidatePattern", () => {
  it("removes keys matching regex", () => {
    c.set("user_123", "a");
    c.set("user_456", "b");
    c.set("table_1", "c");
    c.invalidatePattern(/^user_/);
    expect(c.has("user_123")).toBe(false);
    expect(c.has("user_456")).toBe(false);
    expect(c.has("table_1")).toBe(true);
  });
});

describe("clear", () => {
  it("removes all entries", () => {
    c.set("a", "1");
    c.set("b", "2");
    c.clear();
    expect(c.size).toBe(0);
  });
});

describe("keys / size", () => {
  it("returns live key names", () => {
    c.set("x", "1");
    c.set("y", "2");
    expect(c.keys()).toContain("x");
    expect(c.keys()).toContain("y");
  });

  it("does not include expired keys in size", () => {
    c.set("a", "v", 100);
    c.set("b", "v", 5000);
    vi.advanceTimersByTime(200);
    expect(c.size).toBe(1);
  });
});

describe("getOrCompute", () => {
  it("calls compute when key is missing", async () => {
    const fn = vi.fn().mockResolvedValue("computed");
    const result = await c.getOrCompute("k", fn);
    expect(result).toBe("computed");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("returns cached value without calling compute again", async () => {
    const fn = vi.fn().mockResolvedValue("computed");
    await c.getOrCompute("k", fn);
    const result2 = await c.getOrCompute("k", fn);
    expect(result2).toBe("computed");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("recomputes after TTL expires", async () => {
    const fn = vi.fn().mockResolvedValue("fresh");
    await c.getOrCompute("k", fn, 1000);
    vi.advanceTimersByTime(1001);
    await c.getOrCompute("k", fn, 1000);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("onEvict", () => {
  it("calls listener on delete", () => {
    const listener = vi.fn();
    c.onEvict(listener);
    c.set("k", "v");
    c.delete("k");
    expect(listener).toHaveBeenCalledWith("k", "v");
  });

  it("calls listener on TTL expiry (read)", () => {
    const listener = vi.fn();
    c.onEvict(listener);
    c.set("k", "v", 100);
    vi.advanceTimersByTime(200);
    c.get("k"); // triggers eviction
    expect(listener).toHaveBeenCalledWith("k", "v");
  });

  it("unsubscribe stops notifications", () => {
    const listener = vi.fn();
    const unsub = c.onEvict(listener);
    unsub();
    c.set("k", "v");
    c.delete("k");
    expect(listener).not.toHaveBeenCalled();
  });
});
