import { describe, it, expect } from "vitest";
import { createLru } from "../../src/utils/lru-cache.js";

describe("lru-cache", () => {
  it("stores and retrieves values", () => {
    const c = createLru({ max: 3 });
    c.set("a", 1);
    expect(c.get("a")).toBe(1);
  });

  it("returns undefined for missing key", () => {
    const c = createLru({ max: 3 });
    expect(c.get("missing")).toBeUndefined();
  });

  it("evicts least-recently-used when full", () => {
    const c = createLru({ max: 2 });
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    expect(c.has("a")).toBe(false);
    expect(c.has("b")).toBe(true);
    expect(c.has("c")).toBe(true);
  });

  it("get refreshes recency", () => {
    const c = createLru({ max: 2 });
    c.set("a", 1);
    c.set("b", 2);
    c.get("a");
    c.set("c", 3);
    expect(c.has("a")).toBe(true);
    expect(c.has("b")).toBe(false);
  });

  it("set updates value without growing size", () => {
    const c = createLru({ max: 2 });
    c.set("a", 1);
    c.set("a", 2);
    expect(c.size()).toBe(1);
    expect(c.get("a")).toBe(2);
  });

  it("ttl expires entries on get", () => {
    let t = 0;
    const c = createLru({ max: 5, ttlMs: 100, now: () => t });
    c.set("a", 1);
    t = 50;
    expect(c.get("a")).toBe(1);
    t = 200;
    expect(c.get("a")).toBeUndefined();
  });

  it("ttl expires on has()", () => {
    let t = 0;
    const c = createLru({ max: 5, ttlMs: 100, now: () => t });
    c.set("a", 1);
    t = 200;
    expect(c.has("a")).toBe(false);
  });

  it("delete removes a key", () => {
    const c = createLru({ max: 3 });
    c.set("a", 1);
    expect(c.delete("a")).toBe(true);
    expect(c.has("a")).toBe(false);
    expect(c.delete("a")).toBe(false);
  });

  it("clear empties the cache", () => {
    const c = createLru({ max: 3 });
    c.set("a", 1);
    c.set("b", 2);
    c.clear();
    expect(c.size()).toBe(0);
  });

  it("keys returns insertion order from oldest to newest", () => {
    const c = createLru({ max: 3 });
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    expect(c.keys()).toEqual(["a", "b", "c"]);
  });

  it("rejects invalid options", () => {
    expect(() => createLru(/** @type {any} */ (null))).toThrow();
    expect(() => createLru({ max: 0 })).toThrow();
  });

  it("size reflects current entry count", () => {
    const c = createLru({ max: 3 });
    expect(c.size()).toBe(0);
    c.set("a", 1);
    c.set("b", 2);
    expect(c.size()).toBe(2);
  });
});
