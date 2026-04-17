/**
 * tests/unit/ttl-cache.test.mjs — Tests for ttl-cache.js (Sprint 65)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createCache, createTaggedCache, withCache } from "../../src/utils/ttl-cache.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("createCache", () => {
  it("stores and retrieves a value", () => {
    const c = createCache({ ttlMs: 5_000 });
    c.set("x", 42);
    expect(c.get("x")).toBe(42);
  });

  it("returns null for missing keys", () => {
    const c = createCache();
    expect(c.get("missing")).toBeNull();
  });

  it("returns null after TTL expires", () => {
    vi.useFakeTimers();
    const c = createCache({ ttlMs: 1_000 });
    c.set("key", "value");
    vi.advanceTimersByTime(1_001);
    expect(c.get("key")).toBeNull();
  });

  it("has() returns true before expiry", () => {
    const c = createCache({ ttlMs: 5_000 });
    c.set("y", 99);
    expect(c.has("y")).toBe(true);
  });

  it("has() returns false after expiry", () => {
    vi.useFakeTimers();
    const c = createCache({ ttlMs: 100 });
    c.set("y", 99);
    vi.advanceTimersByTime(200);
    expect(c.has("y")).toBe(false);
  });

  it("invalidate() removes the key immediately", () => {
    const c = createCache({ ttlMs: 5_000 });
    c.set("z", "hello");
    c.invalidate("z");
    expect(c.get("z")).toBeNull();
  });

  it("clear() empties everything", () => {
    const c = createCache({ ttlMs: 5_000 });
    c.set("a", 1);
    c.set("b", 2);
    c.clear();
    expect(c.size()).toBe(0);
  });

  it("size() counts valid entries", () => {
    const c = createCache({ ttlMs: 5_000 });
    c.set("a", 1);
    c.set("b", 2);
    expect(c.size()).toBe(2);
  });

  it("keys() lists non-expired keys", () => {
    const c = createCache({ ttlMs: 5_000 });
    c.set("a", 1);
    c.set("b", 2);
    expect(c.keys().sort()).toStrictEqual(["a", "b"]);
  });

  it("stats() tracks hits and misses", () => {
    const c = createCache({ ttlMs: 5_000 });
    c.set("k", "v");
    c.get("k");   // hit
    c.get("nope"); // miss
    const s = c.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
  });

  it("per-key TTL overrides default", () => {
    vi.useFakeTimers();
    const c = createCache({ ttlMs: 10_000 });
    c.set("short", "v", 100);
    vi.advanceTimersByTime(200);
    expect(c.get("short")).toBeNull();
  });
});

describe("createTaggedCache", () => {
  it("stores and retrieves with tags", () => {
    const tc = createTaggedCache({ ttlMs: 5_000 });
    tc.set("g1", { name: "Alice" }, ["guests"]);
    expect(tc.get("g1")).toStrictEqual({ name: "Alice" });
  });

  it("invalidateTag evicts all matching entries", () => {
    const tc = createTaggedCache({ ttlMs: 5_000 });
    tc.set("g1", "a", ["guests"]);
    tc.set("g2", "b", ["guests"]);
    tc.set("t1", "c", ["tables"]);
    const count = tc.invalidateTag("guests");
    expect(count).toBe(2);
    expect(tc.get("g1")).toBeNull();
    expect(tc.get("g2")).toBeNull();
    expect(tc.get("t1")).toBe("c");
  });

  it("invalidate() removes a single key", () => {
    const tc = createTaggedCache();
    tc.set("k", "v");
    tc.invalidate("k");
    expect(tc.has("k")).toBe(false);
  });

  it("returns 0 when no entries match the tag", () => {
    const tc = createTaggedCache();
    expect(tc.invalidateTag("nonexistent")).toBe(0);
  });
});

describe("withCache", () => {
  it("calls fn only once when cache is warm", async () => {
    const fn = vi.fn().mockResolvedValue("data");
    const cached = withCache(fn, { ttlMs: 5_000 });
    await cached();
    await cached();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("re-calls fn after TTL expires", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockResolvedValue("fresh");
    const cached = withCache(fn, { ttlMs: 100 });
    await cached();
    vi.advanceTimersByTime(200);
    await cached();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
