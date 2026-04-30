import { describe, it, expect } from "vitest";
import { createTokenBucket } from "../../src/utils/token-bucket.js";

function makeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
}

describe("token-bucket", () => {
  it("starts at capacity", () => {
    const c = makeClock();
    const b = createTokenBucket({ capacity: 5, refillPerSec: 1, now: c.now });
    expect(b.available()).toBe(5);
  });

  it("take consumes tokens", () => {
    const c = makeClock();
    const b = createTokenBucket({ capacity: 3, refillPerSec: 1, now: c.now });
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(false);
  });

  it("refills over time", () => {
    const c = makeClock();
    const b = createTokenBucket({ capacity: 2, refillPerSec: 2, now: c.now });
    b.take(2);
    expect(b.take()).toBe(false);
    c.advance(500);
    expect(b.take()).toBe(true);
  });

  it("caps at capacity when idle", () => {
    const c = makeClock();
    const b = createTokenBucket({ capacity: 4, refillPerSec: 10, now: c.now });
    b.take(4);
    c.advance(60_000);
    expect(b.available()).toBe(4);
  });

  it("take(n) atomic", () => {
    const c = makeClock();
    const b = createTokenBucket({ capacity: 5, refillPerSec: 1, now: c.now });
    expect(b.take(3)).toBe(true);
    expect(b.take(3)).toBe(false);
    expect(b.available()).toBeCloseTo(2, 5);
  });

  it("reset restores capacity", () => {
    const c = makeClock();
    const b = createTokenBucket({ capacity: 5, refillPerSec: 1, now: c.now });
    b.take(5);
    b.reset();
    expect(b.available()).toBe(5);
  });

  it("rejects invalid params", () => {
    expect(() =>
      createTokenBucket({ capacity: 0, refillPerSec: 1 }),
    ).toThrow();
    expect(() =>
      createTokenBucket({ capacity: 1, refillPerSec: 0 }),
    ).toThrow();
  });

  it("default now uses Date.now", () => {
    const b = createTokenBucket({ capacity: 1, refillPerSec: 1 });
    expect(b.take()).toBe(true);
  });

  it("partial refill is fractional", () => {
    const c = makeClock();
    const b = createTokenBucket({ capacity: 10, refillPerSec: 4, now: c.now });
    b.take(10);
    c.advance(250);
    expect(b.available()).toBeCloseTo(1, 5);
  });

  it("take exactly available succeeds", () => {
    const c = makeClock();
    const b = createTokenBucket({ capacity: 2, refillPerSec: 1, now: c.now });
    expect(b.take(2)).toBe(true);
    expect(b.available()).toBeCloseTo(0, 5);
  });
});
