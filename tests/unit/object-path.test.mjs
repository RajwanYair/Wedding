/**
 * tests/unit/object-path.test.mjs — Sprint 208
 */

import { describe, it, expect } from "vitest";
import { getIn, hasIn, setIn, deleteIn, flattenPaths, pickPaths } from "../../src/utils/object-path.js";

const obj = { user: { name: "Alice", address: { city: "TLV", zip: "12345" } }, age: 30 };

describe("getIn", () => {
  it("gets top-level value", () => expect(getIn(obj, "age")).toBe(30));
  it("gets nested value", () => expect(getIn(obj, "user.name")).toBe("Alice"));
  it("gets deeply nested", () => expect(getIn(obj, "user.address.city")).toBe("TLV"));
  it("returns undefined for missing path", () => expect(getIn(obj, "user.phone")).toBeUndefined());
  it("returns defaultVal for missing path", () => expect(getIn(obj, "x.y", "fallback")).toBe("fallback"));
  it("null obj → defaultVal", () => expect(getIn(null, "a", 0)).toBe(0));
  it("empty path → defaultVal", () => expect(getIn(obj, "", 42)).toBe(42));
});

describe("hasIn", () => {
  it("true for existing path", () => expect(hasIn(obj, "user.name")).toBe(true));
  it("false for missing path", () => expect(hasIn(obj, "user.email")).toBe(false));
});

describe("setIn", () => {
  it("sets top-level key immutably", () => {
    const r = setIn(obj, "age", 31);
    expect(r.age).toBe(31);
    expect(obj.age).toBe(30); // original unchanged
  });
  it("sets nested key", () => {
    const r = setIn(obj, "user.name", "Bob");
    expect(r.user.name).toBe("Bob");
    expect(obj.user.name).toBe("Alice");
  });
  it("creates intermediate objects", () => {
    const r = setIn({}, "a.b.c", 99);
    expect(r.a.b.c).toBe(99);
  });
  it("works on null obj", () => {
    const r = setIn(null, "x", 1);
    expect(r.x).toBe(1);
  });
});

describe("deleteIn", () => {
  it("deletes a nested key", () => {
    const r = deleteIn(obj, "user.address.zip");
    expect(r.user.address.zip).toBeUndefined();
    expect(obj.user.address.zip).toBe("12345"); // original unchanged
  });
  it("no-op for non-existent path", () => {
    const r = deleteIn(obj, "user.nonexistent.x");
    expect(r.user).toBeDefined();
  });
  it("deletes top-level key", () => {
    const r = deleteIn({ a: 1, b: 2 }, "a");
    expect(r.a).toBeUndefined();
    expect(r.b).toBe(2);
  });
});

describe("flattenPaths", () => {
  it("flattens nested object", () => {
    const flat = flattenPaths({ a: { b: 1, c: 2 }, d: 3 });
    const paths = flat.map(([k]) => k);
    expect(paths).toContain("a.b");
    expect(paths).toContain("a.c");
    expect(paths).toContain("d");
  });
  it("includes array values as leaf", () => {
    const flat = flattenPaths({ tags: ["a", "b"] });
    expect(flat[0][0]).toBe("tags");
  });
  it("empty object → empty array", () => {
    expect(flattenPaths({})).toEqual([]);
  });
});

describe("pickPaths", () => {
  it("picks selected paths", () => {
    const r = pickPaths(obj, ["age", "user.name"]);
    expect(r.age).toBe(30);
    expect(r["user.name"]).toBe("Alice");
  });
  it("omits missing paths", () => {
    const r = pickPaths(obj, ["missing"]);
    expect(Object.keys(r)).toHaveLength(0);
  });
  it("empty paths → empty object", () => {
    expect(pickPaths(obj, [])).toEqual({});
  });
});
