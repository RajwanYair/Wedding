/**
 * @vitest-environment happy-dom
 * tests/unit/storage-quota.test.mjs — Sprint 42: Storage quota detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatStorageSize,
  getLocalStorageSize,
  getLocalStorageCount,
  getAppStorageSize,
  getLocalStorageBreakdown,
  getStorageEstimate,
  isStorageApiAvailable,
  isStorageCritical,
  buildStorageReport,
} from '../../src/utils/storage-quota.js';

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------

function buildMockStorage(entries = {}) {
  const data = new Map(Object.entries(entries));
  return {
    get length() { return data.size; },
    key(i) { return [...data.keys()][i] ?? null; },
    getItem(k) { return data.get(k) ?? null; },
    setItem(k, v) { data.set(k, v); },
    removeItem(k) { data.delete(k); },
    clear() { data.clear(); },
  };
}

// ---------------------------------------------------------------------------
// formatStorageSize
// ---------------------------------------------------------------------------

describe('formatStorageSize', () => {
  it('formats bytes', () => {
    expect(formatStorageSize(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatStorageSize(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatStorageSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });

  it('formats gigabytes', () => {
    expect(formatStorageSize(2 * 1024 * 1024 * 1024)).toBe('2.0 GB');
  });

  it('handles 0 bytes', () => {
    expect(formatStorageSize(0)).toBe('0 B');
  });

  it('handles negative bytes as 0 B', () => {
    expect(formatStorageSize(-5)).toBe('0 B');
  });

  it('respects decimals param', () => {
    expect(formatStorageSize(1536, 2)).toBe('1.50 KB');
  });
});

// ---------------------------------------------------------------------------
// getLocalStorageSize
// ---------------------------------------------------------------------------

describe('getLocalStorageSize', () => {
  it('returns 0 for empty storage', () => {
    expect(getLocalStorageSize(buildMockStorage())).toBe(0);
  });

  it('counts key + value bytes (UTF-16, 2 bytes/char)', () => {
    const s = buildMockStorage({ ab: 'cd' }); // 2+2 = 4 chars → 8 bytes
    expect(getLocalStorageSize(s)).toBe(8);
  });

  it('sums multiple entries', () => {
    const s = buildMockStorage({ a: '1', b: '22' }); // (1+1)*2 + (1+2)*2 = 4+6=10
    expect(getLocalStorageSize(s)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// getLocalStorageCount
// ---------------------------------------------------------------------------

describe('getLocalStorageCount', () => {
  it('counts all keys when no prefix', () => {
    const s = buildMockStorage({ a: '1', b: '2', c: '3' });
    expect(getLocalStorageCount(undefined, s)).toBe(3);
  });

  it('filters by prefix', () => {
    const s = buildMockStorage({ wedding_v1_guests: '[]', wedding_v1_tables: '[]', theme: 'gold' });
    expect(getLocalStorageCount('wedding_v1_', s)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getAppStorageSize
// ---------------------------------------------------------------------------

describe('getAppStorageSize', () => {
  it('only counts app-prefixed keys', () => {
    const s = buildMockStorage({ wedding_v1_x: 'ab', other: 'abcd' });
    const appSize = getAppStorageSize(s);
    const otherSize = getLocalStorageSize(buildMockStorage({ other: 'abcd' }));
    expect(appSize).toBeLessThan(getLocalStorageSize(s));
    expect(appSize).not.toBe(otherSize); // 'other' key not included
  });
});

// ---------------------------------------------------------------------------
// getLocalStorageBreakdown
// ---------------------------------------------------------------------------

describe('getLocalStorageBreakdown', () => {
  it('returns sorted entries largest-first', () => {
    const s = buildMockStorage({ a: 'x', b: 'xxxxxxxxxxxx' }); // b is bigger
    const breakdown = getLocalStorageBreakdown(undefined, s);
    expect(breakdown[0].key).toBe('b');
    expect(breakdown[0].bytes).toBeGreaterThan(breakdown[1].bytes);
  });

  it('filters by prefix', () => {
    const s = buildMockStorage({ wedding_v1_a: 'x', other: 'y' });
    const bd = getLocalStorageBreakdown('wedding_v1_', s);
    expect(bd.every(e => e.key.startsWith('wedding_v1_'))).toBe(true);
    expect(bd.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getStorageEstimate
// ---------------------------------------------------------------------------

describe('getStorageEstimate', () => {
  it('returns nulls when navigator.storage is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const result = await getStorageEstimate();
    expect(result.usage).toBeNull();
    expect(result.quota).toBeNull();
    expect(result.usageFraction).toBeNull();
    vi.unstubAllGlobals();
  });

  it('returns estimates from navigator.storage.estimate()', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 500_000, quota: 1_000_000 }),
      },
    });
    const result = await getStorageEstimate();
    expect(result.usage).toBe(500_000);
    expect(result.quota).toBe(1_000_000);
    expect(result.usageFraction).toBeCloseTo(0.5);
    vi.unstubAllGlobals();
  });

  it('returns nulls if estimate() throws', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockRejectedValue(new Error('fail')),
      },
    });
    const result = await getStorageEstimate();
    expect(result.usage).toBeNull();
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// isStorageCritical
// ---------------------------------------------------------------------------

describe('isStorageCritical', () => {
  it('returns true when usageFraction >= threshold', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 900_000, quota: 1_000_000 }),
      },
    });
    expect(await isStorageCritical(0.85)).toBe(true);
    vi.unstubAllGlobals();
  });

  it('returns false when usageFraction < threshold', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 100_000, quota: 1_000_000 }),
      },
    });
    expect(await isStorageCritical(0.85)).toBe(false);
    vi.unstubAllGlobals();
  });
});

// ---------------------------------------------------------------------------
// buildStorageReport
// ---------------------------------------------------------------------------

describe('buildStorageReport', () => {
  it('returns a report with expected shape', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 100, quota: 5_000_000 }),
      },
    });
    const s = buildMockStorage({ wedding_v1_a: 'hello' });
    const report = await buildStorageReport(s);
    expect(report).toHaveProperty('localStorageBytes');
    expect(report).toHaveProperty('localStorageCount');
    expect(report).toHaveProperty('appBytes');
    expect(report).toHaveProperty('storageEstimate');
    expect(report).toHaveProperty('isCritical');
    expect(typeof report.isCritical).toBe('boolean');
    vi.unstubAllGlobals();
  });
});
