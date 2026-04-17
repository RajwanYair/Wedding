/**
 * tests/unit/rate-limiter.test.mjs — Sprint 85
 */

import { describe, it, expect } from "vitest";
import { createRateLimiter } from "../../src/services/rate-limiter.js";

describe("createRateLimiter", () => {
  it("throws for limit < 1", () => {
    expect(() => createRateLimiter({ limit: 0, windowMs: 1000 })).toThrow(RangeError);
  });

  it("throws for windowMs < 1", () => {
    expect(() => createRateLimiter({ limit: 5, windowMs: 0 })).toThrow(RangeError);
  });
});

describe("consume", () => {
  it("allows up to limit requests", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(rl.consume().allowed).toBe(true);
    expect(rl.consume().allowed).toBe(true);
    expect(rl.consume().allowed).toBe(true);
    expect(rl.consume().allowed).toBe(false);
  });

  it("tracks remaining count", () => {
    const rl = createRateLimiter({ limit: 5, windowMs: 60_000 });
    const r1 = rl.consume();
    expect(r1.remaining).toBe(4);
    const r2 = rl.consume();
    expect(r2.remaining).toBe(3);
  });

  it("returns resetAt as a future timestamp", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 10_000 });
    const { resetAt } = rl.consume();
    expect(resetAt).toBeGreaterThan(Date.now() - 1);
  });

  it("uses separate buckets per key", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(rl.consume("alice").allowed).toBe(true);
    expect(rl.consume("alice").allowed).toBe(false);
    expect(rl.consume("bob").allowed).toBe(true);
  });

  it("uses default key when no arg passed", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.consume();
    expect(rl.consume("__default__").allowed).toBe(false);
  });
});

describe("status", () => {
  it("does not consume a token", () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 60_000 });
    rl.status();
    rl.status();
    expect(rl.consume().remaining).toBe(1); // only 1 consumed by consume()
  });

  it("returns allowed:false after limit exceeded", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.consume();
    expect(rl.status().allowed).toBe(false);
  });
});

describe("reset", () => {
  it("refills the bucket after exhaustion", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.consume();
    expect(rl.consume().allowed).toBe(false);
    rl.reset();
    expect(rl.consume().allowed).toBe(true);
  });
});

describe("clear", () => {
  it("removes all buckets so they refill", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
    rl.consume("a");
    rl.clear();
    expect(rl.consume("a").allowed).toBe(true);
  });
});
