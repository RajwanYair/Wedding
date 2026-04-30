import { describe, it, expect } from "vitest";
import {
  createRateLimiter,
  createKeyedRateLimiter,
} from "../../src/utils/rate-limit.js";

/** Helper: clock that the test can advance. */
function fakeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (/** @type {number} */ ms) => {
      t += ms;
    },
  };
}

describe("rate-limit", () => {
  it("allows initial burst up to capacity", () => {
    const c = fakeClock();
    const rl = createRateLimiter({ capacity: 3, refillPerSec: 1, now: c.now });
    expect(rl.tryAcquire()).toBe(true);
    expect(rl.tryAcquire()).toBe(true);
    expect(rl.tryAcquire()).toBe(true);
    expect(rl.tryAcquire()).toBe(false);
  });

  it("refills over time", () => {
    const c = fakeClock();
    const rl = createRateLimiter({ capacity: 2, refillPerSec: 2, now: c.now });
    rl.tryAcquire();
    rl.tryAcquire();
    expect(rl.tryAcquire()).toBe(false);
    c.advance(500);
    expect(rl.tryAcquire()).toBe(true);
  });

  it("caps refill at capacity", () => {
    const c = fakeClock();
    const rl = createRateLimiter({ capacity: 2, refillPerSec: 10, now: c.now });
    c.advance(10_000);
    expect(rl.available()).toBe(2);
  });

  it("supports cost > 1", () => {
    const c = fakeClock();
    const rl = createRateLimiter({ capacity: 5, refillPerSec: 1, now: c.now });
    expect(rl.tryAcquire(3)).toBe(true);
    expect(rl.tryAcquire(3)).toBe(false);
  });

  it("reset restores capacity", () => {
    const c = fakeClock();
    const rl = createRateLimiter({ capacity: 1, refillPerSec: 0, now: c.now });
    rl.tryAcquire();
    rl.reset();
    expect(rl.tryAcquire()).toBe(true);
  });

  it("rejects invalid options", () => {
    expect(() => createRateLimiter(/** @type {any} */ (null))).toThrow();
    expect(() =>
      createRateLimiter({ capacity: 1, refillPerSec: -1 }),
    ).toThrow();
  });

  it("available reflects fractional refill", () => {
    const c = fakeClock();
    const rl = createRateLimiter({ capacity: 5, refillPerSec: 1, now: c.now });
    rl.tryAcquire(5);
    c.advance(500);
    expect(rl.available()).toBeCloseTo(0.5, 5);
  });

  it("keyed limiter isolates buckets per key", () => {
    const c = fakeClock();
    const krl = createKeyedRateLimiter({
      capacity: 1,
      refillPerSec: 0,
      now: c.now,
    });
    expect(krl.tryAcquire("a")).toBe(true);
    expect(krl.tryAcquire("a")).toBe(false);
    expect(krl.tryAcquire("b")).toBe(true);
  });

  it("keyed limiter forget clears a key", () => {
    const c = fakeClock();
    const krl = createKeyedRateLimiter({
      capacity: 1,
      refillPerSec: 0,
      now: c.now,
    });
    krl.tryAcquire("a");
    expect(krl.size()).toBe(1);
    krl.forget("a");
    expect(krl.size()).toBe(0);
  });

  it("zero refill never tops up", () => {
    const c = fakeClock();
    const rl = createRateLimiter({ capacity: 1, refillPerSec: 0, now: c.now });
    rl.tryAcquire();
    c.advance(1_000_000);
    expect(rl.tryAcquire()).toBe(false);
  });
});
