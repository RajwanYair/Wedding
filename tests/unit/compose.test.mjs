/**
 * tests/unit/compose.test.mjs — Sprint 213
 *
 * Unit tests for src/utils/compose.js
 * Coverage: pipe, compose, curry2, curry3, memoize, memoizeKey,
 *           partial, onceOnly, noop, identity, tap
 */

import { describe, it, expect, vi } from "vitest";
import {
  pipe,
  compose,
  curry2,
  curry3,
  memoize,
  memoizeKey,
  partial,
  onceOnly,
  noop,
  identity,
  tap,
} from "../../src/utils/compose.js";

// ── pipe ──────────────────────────────────────────────────────────────────

describe("pipe", () => {
  it("passes value through a single function", () => {
    const double = (x) => x * 2;
    expect(pipe(double)(3)).toBe(6);
  });

  it("applies functions left-to-right", () => {
    const add1 = (x) => x + 1;
    const double = (x) => x * 2;
    // (3 + 1) * 2 = 8
    expect(pipe(add1, double)(3)).toBe(8);
  });

  it("returns identity for empty pipeline", () => {
    expect(pipe()(42)).toBe(42);
  });

  it("threads string values correctly", () => {
    const trim = (s) => s.trim();
    const upper = (s) => s.toUpperCase();
    expect(pipe(trim, upper)("  hello  ")).toBe("HELLO");
  });

  it("chains three functions", () => {
    const add1 = (x) => x + 1;
    const double = (x) => x * 2;
    const square = (x) => x * x;
    // (2+1)*2=6, 6*6=36
    expect(pipe(add1, double, square)(2)).toBe(36);
  });
});

// ── compose ───────────────────────────────────────────────────────────────

describe("compose", () => {
  it("applies functions right-to-left", () => {
    const add1 = (x) => x + 1;
    const double = (x) => x * 2;
    // double(3)=6, add1(6)=7
    expect(compose(add1, double)(3)).toBe(7);
  });

  it("returns identity for empty pipeline", () => {
    expect(compose()(42)).toBe(42);
  });

  it("single function acts as identity", () => {
    const negate = (x) => -x;
    expect(compose(negate)(5)).toBe(-5);
  });

  it("is the reverse of pipe", () => {
    const add1 = (x) => x + 1;
    const double = (x) => x * 2;
    const pipeResult = pipe(add1, double)(5);
    const composeResult = compose(double, add1)(5);
    expect(pipeResult).toBe(composeResult);
  });
});

// ── curry2 ────────────────────────────────────────────────────────────────

describe("curry2", () => {
  it("curries a binary function", () => {
    const add = (a, b) => a + b;
    const curriedAdd = curry2(add);
    expect(curriedAdd(3)(4)).toBe(7);
  });

  it("returns a function from the first application", () => {
    const mul = (a, b) => a * b;
    const curried = curry2(mul);
    expect(typeof curried(2)).toBe("function");
  });

  it("works for string concatenation", () => {
    const concat = (a, b) => `${a}${b}`;
    expect(curry2(concat)("foo")("bar")).toBe("foobar");
  });
});

// ── curry3 ────────────────────────────────────────────────────────────────

describe("curry3", () => {
  it("curries a ternary function", () => {
    const add3 = (a, b, c) => a + b + c;
    expect(curry3(add3)(1)(2)(3)).toBe(6);
  });

  it("each application returns a function until final call", () => {
    const fn = (a, b, c) => `${a}-${b}-${c}`;
    const step1 = curry3(fn)("x");
    const step2 = step1("y");
    expect(typeof step1).toBe("function");
    expect(typeof step2).toBe("function");
    expect(step2("z")).toBe("x-y-z");
  });
});

// ── memoize ───────────────────────────────────────────────────────────────

describe("memoize", () => {
  it("returns the same value for the same input", () => {
    const fn = (x) => x * 2;
    const memo = memoize(fn);
    expect(memo(5)).toBe(10);
    expect(memo(5)).toBe(10);
  });

  it("calls the original function only once per unique input", () => {
    const spy = vi.fn((x) => x + 1);
    const memo = memoize(spy);
    memo(3);
    memo(3);
    memo(4);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("caches distinct inputs independently", () => {
    const memo = memoize((x) => x ** 2);
    expect(memo(3)).toBe(9);
    expect(memo(4)).toBe(16);
    expect(memo(3)).toBe(9);
  });
});

// ── memoizeKey ────────────────────────────────────────────────────────────

describe("memoizeKey", () => {
  it("caches multi-arg calls by default JSON key", () => {
    const spy = vi.fn((a, b) => a + b);
    const memo = memoizeKey(spy);
    memo(1, 2);
    memo(1, 2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("uses a custom key extractor when provided", () => {
    const spy = vi.fn((obj) => obj.id);
    // Key only on .id — ignore other fields
    const memo = memoizeKey(spy, (o) => o.id);
    memo({ id: "a", extra: 1 });
    memo({ id: "a", extra: 2 });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("cached value is returned for repeated key", () => {
    const memo = memoizeKey((a, b) => `${a}-${b}`);
    expect(memo("x", "y")).toBe("x-y");
    expect(memo("x", "y")).toBe("x-y");
  });
});

// ── partial ───────────────────────────────────────────────────────────────

describe("partial", () => {
  it("binds leading arguments", () => {
    const add = (a, b) => a + b;
    const add5 = partial(add, 5);
    expect(add5(3)).toBe(8);
  });

  it("works with multiple bound args", () => {
    const concat = (a, b, c) => `${a}${b}${c}`;
    const prefix = partial(concat, "foo", "bar");
    expect(prefix("baz")).toBe("foobarbaz");
  });

  it("returns identity-like when no args bound and fn is identity", () => {
    const id = (x) => x;
    expect(partial(id)(42)).toBe(42);
  });
});

// ── onceOnly ──────────────────────────────────────────────────────────────

describe("onceOnly", () => {
  it("calls wrapped function at most once", () => {
    const spy = vi.fn(() => 42);
    const once = onceOnly(spy);
    once();
    once();
    once();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("returns the result of the first invocation on subsequent calls", () => {
    const once = onceOnly(() => "hello");
    expect(once()).toBe("hello");
    expect(once()).toBe("hello");
  });

  it("returns undefined on second call if first returned undefined", () => {
    const once = onceOnly(() => undefined);
    once();
    expect(once()).toBeUndefined();
  });
});

// ── noop ──────────────────────────────────────────────────────────────────

describe("noop", () => {
  it("returns undefined", () => {
    expect(noop()).toBeUndefined();
  });

  it("can be called with any arguments without throwing", () => {
    expect(() => noop(1, "two", { three: 3 })).not.toThrow();
  });
});

// ── identity ──────────────────────────────────────────────────────────────

describe("identity", () => {
  it("returns its argument unchanged for primitives", () => {
    expect(identity(0)).toBe(0);
    expect(identity("")).toBe("");
    expect(identity(false)).toBe(false);
  });

  it("returns the same object reference for objects", () => {
    const obj = { a: 1 };
    expect(identity(obj)).toBe(obj);
  });

  it("returns undefined when called with no arguments", () => {
    expect(identity()).toBeUndefined();
  });
});

// ── tap ───────────────────────────────────────────────────────────────────

describe("tap", () => {
  it("calls the side-effect function with the passed value", () => {
    const spy = vi.fn();
    tap(spy)(42);
    expect(spy).toHaveBeenCalledWith(42);
  });

  it("returns the original value unchanged", () => {
    const result = tap(() => "ignored")(99);
    expect(result).toBe(99);
  });

  it("works with objects, returning same reference", () => {
    const obj = { x: 1 };
    const result = tap((o) => { o.side = true; })(obj);
    expect(result).toBe(obj);
    expect(result.side).toBe(true);
  });
});
