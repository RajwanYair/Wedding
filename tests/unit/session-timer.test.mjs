/**
 * tests/unit/session-timer.test.mjs — Sprint 43: Session timer enforcement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSessionTimer, createActivityTimer, formatCountdown } from '../../src/utils/session-timer.js';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

// ---------------------------------------------------------------------------
// createSessionTimer
// ---------------------------------------------------------------------------

describe('createSessionTimer — lifecycle', () => {
  it('is not running before start()', () => {
    const t = createSessionTimer({ timeoutMs: 5000 });
    expect(t.isRunning()).toBe(false);
    expect(t.isExpired()).toBe(false);
  });

  it('is running after start()', () => {
    const t = createSessionTimer({ timeoutMs: 5000 });
    t.start();
    expect(t.isRunning()).toBe(true);
  });

  it('calls onExpire after timeoutMs', () => {
    const onExpire = vi.fn();
    const t = createSessionTimer({ timeoutMs: 3000, onExpire });
    t.start();
    vi.advanceTimersByTime(3001);
    expect(onExpire).toHaveBeenCalledOnce();
    expect(t.isExpired()).toBe(true);
    expect(t.isRunning()).toBe(false);
  });

  it('does not call onExpire if stopped before timeout', () => {
    const onExpire = vi.fn();
    const t = createSessionTimer({ timeoutMs: 3000, onExpire });
    t.start();
    vi.advanceTimersByTime(1000);
    t.stop();
    vi.advanceTimersByTime(3000);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('stop() resets isRunning and isExpired', () => {
    const t = createSessionTimer({ timeoutMs: 3000 });
    t.start();
    t.stop();
    expect(t.isRunning()).toBe(false);
    expect(t.isExpired()).toBe(false);
  });
});

describe('createSessionTimer — warning callback', () => {
  it('calls onWarn before onExpire', () => {
    const calls = [];
    const t = createSessionTimer({
      timeoutMs: 10_000,
      warningMs: 3_000,
      onWarn:   () => calls.push('warn'),
      onExpire: () => calls.push('expire'),
    });
    t.start();
    vi.advanceTimersByTime(7_001); // 7s in → triggers warning (at 7s = 10-3)
    expect(calls).toContain('warn');
    vi.advanceTimersByTime(3_000);
    expect(calls).toEqual(['warn', 'expire']);
  });

  it('does not call onWarn after stop()', () => {
    const onWarn = vi.fn();
    const t = createSessionTimer({ timeoutMs: 10_000, warningMs: 3_000, onWarn });
    t.start();
    vi.advanceTimersByTime(5_000);
    t.stop();
    vi.advanceTimersByTime(10_000);
    expect(onWarn).not.toHaveBeenCalled();
  });
});

describe('createSessionTimer — reset()', () => {
  it('extends the session when reset is called', () => {
    const onExpire = vi.fn();
    const t = createSessionTimer({ timeoutMs: 5_000, onExpire });
    t.start();
    vi.advanceTimersByTime(4_000); // 4s in
    t.reset();                     // reset back to 5s
    vi.advanceTimersByTime(4_000); // 4s more (total 8s but only 4s since reset)
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_001);
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it('reset() before start() is a no-op', () => {
    const onExpire = vi.fn();
    const t = createSessionTimer({ timeoutMs: 1000, onExpire });
    t.reset(); // no-op
    vi.advanceTimersByTime(2000);
    expect(onExpire).not.toHaveBeenCalled();
  });
});

describe('createSessionTimer — getRemainingMs()', () => {
  it('returns timeoutMs immediately after start', () => {
    const t = createSessionTimer({ timeoutMs: 5000 });
    t.start();
    expect(t.getRemainingMs()).toBeGreaterThan(4900);
  });

  it('decreases over time', () => {
    const t = createSessionTimer({ timeoutMs: 10_000 });
    t.start();
    vi.advanceTimersByTime(3_000);
    expect(t.getRemainingMs()).toBeLessThanOrEqual(7_000);
  });

  it('returns 0 when expired', () => {
    const t = createSessionTimer({ timeoutMs: 1000 });
    t.start();
    vi.advanceTimersByTime(2000);
    expect(t.getRemainingMs()).toBe(0);
  });

  it('returns 0 when not started', () => {
    const t = createSessionTimer({ timeoutMs: 5000 });
    expect(t.getRemainingMs()).toBe(0);
  });
});

describe('createSessionTimer — validation', () => {
  it('throws RangeError for non-positive timeoutMs', () => {
    expect(() => createSessionTimer({ timeoutMs: 0 })).toThrow(RangeError);
    expect(() => createSessionTimer({ timeoutMs: -1 })).toThrow(RangeError);
  });

  it('throws RangeError when warningMs >= timeoutMs', () => {
    expect(() => createSessionTimer({ timeoutMs: 1000, warningMs: 1000 })).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// formatCountdown
// ---------------------------------------------------------------------------

describe('formatCountdown', () => {
  it('formats seconds only', () => {
    expect(formatCountdown(45_000)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatCountdown(125_000)).toBe('2m 5s');
  });

  it('formats hours, minutes and seconds', () => {
    expect(formatCountdown(3_661_000)).toBe('1h 1m 1s');
  });

  it('returns 0s for zero or negative', () => {
    expect(formatCountdown(0)).toBe('0s');
    expect(formatCountdown(-100)).toBe('0s');
  });
});

// ---------------------------------------------------------------------------
// createActivityTimer
// ---------------------------------------------------------------------------

describe('createActivityTimer', () => {
  it('auto-starts the session', () => {
    const { timer, destroy } = createActivityTimer({ timeoutMs: 10_000 }, [], null);
    expect(timer.isRunning()).toBe(true);
    destroy();
  });

  it('destroy() stops the timer', () => {
    const { timer, destroy } = createActivityTimer({ timeoutMs: 10_000 }, [], null);
    destroy();
    expect(timer.isRunning()).toBe(false);
  });

  it('resets timer on activity event', () => {
    const target = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const { timer, destroy } = createActivityTimer({ timeoutMs: 10_000 }, ['click'], target);
    vi.advanceTimersByTime(8_000);
    // simulate click handler
    const handler = target.addEventListener.mock.calls[0][1];
    handler();
    expect(timer.getRemainingMs()).toBeGreaterThan(8_000);
    destroy();
  });
});
