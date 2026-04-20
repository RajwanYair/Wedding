import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  parseCurrencyInput,
  addCurrency,
  subtractCurrency,
  percentOf,
  convertCurrency,
  SUPPORTED_CURRENCIES,
} from '../../src/utils/currency.js';

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('returns a non-empty string for valid ILS amount', () => {
    const result = formatCurrency(1234.56, 'ILS');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes the shekel sign or ILS for ILS amounts', () => {
    const result = formatCurrency(1000, 'ILS');
    expect(result).toMatch(/[\u20AA]|ILS/);
  });

  it('formats USD amounts', () => {
    const result = formatCurrency(500, 'USD', 'en-US');
    expect(result).toContain('500');
    expect(result).toMatch(/\$|USD/);
  });

  it('formats EUR amounts', () => {
    const result = formatCurrency(200, 'EUR', 'de-DE');
    expect(result).toContain('200');
  });

  it('formats negative amounts', () => {
    const result = formatCurrency(-100, 'ILS');
    expect(result).toContain('100');
    expect(result).toMatch(/-|−|\u200F-/);
  });

  it('returns empty string for NaN', () => {
    expect(formatCurrency(NaN)).toBe('');
  });

  it('returns empty string for Infinity', () => {
    expect(formatCurrency(Infinity)).toBe('');
  });

  it('returns empty string for non-number', () => {
    expect(formatCurrency('abc')).toBe('');
  });

  it('formats zero', () => {
    const result = formatCurrency(0, 'ILS');
    expect(result).toContain('0');
  });

  it('always has 2 decimal places', () => {
    const result = formatCurrency(1000, 'USD', 'en-US');
    expect(result).toMatch(/\d{1,3}\.00/);
  });
});

// ─── formatCurrencyCompact ────────────────────────────────────────────────────

describe('formatCurrencyCompact', () => {
  it('omits decimals for whole numbers', () => {
    const result = formatCurrencyCompact(5000, 'USD', 'en-US');
    expect(result).not.toContain('.00');
  });

  it('includes decimals for non-whole numbers', () => {
    const result = formatCurrencyCompact(5000.5, 'USD', 'en-US');
    expect(result).toContain('.50');
  });

  it('returns empty string for NaN', () => {
    expect(formatCurrencyCompact(NaN)).toBe('');
  });
});

// ─── formatNumber ─────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('formats a number with 2 decimals by default', () => {
    const result = formatNumber(1234.5, 2, 'en-US');
    expect(result).toBe('1,234.50');
  });

  it('formats with 0 decimals', () => {
    const result = formatNumber(9999, 0, 'en-US');
    expect(result).toBe('9,999');
  });

  it('returns empty string for NaN', () => {
    expect(formatNumber(NaN)).toBe('');
  });

  it('returns empty string for Infinity', () => {
    expect(formatNumber(Infinity)).toBe('');
  });
});

// ─── parseCurrencyInput ───────────────────────────────────────────────────────

describe('parseCurrencyInput', () => {
  it('parses plain integer string', () => {
    expect(parseCurrencyInput('1234')).toBe(1234);
  });

  it('parses decimal with dot', () => {
    expect(parseCurrencyInput('1234.56')).toBe(1234.56);
  });

  it('parses decimal with comma (European style)', () => {
    expect(parseCurrencyInput('1234,56')).toBe(1234.56);
  });

  it('strips shekel symbol', () => {
    expect(parseCurrencyInput('₪1,234.56')).toBe(1234.56);
  });

  it('strips dollar symbol', () => {
    expect(parseCurrencyInput('$500.00')).toBe(500);
  });

  it('strips euro symbol', () => {
    expect(parseCurrencyInput('€200,00')).toBe(200);
  });

  it('handles European format with dot thousands and comma decimal', () => {
    expect(parseCurrencyInput('1.234,56')).toBe(1234.56);
  });

  it('handles US format with comma thousands and dot decimal', () => {
    expect(parseCurrencyInput('1,234.56')).toBe(1234.56);
  });

  it('parses negative amounts', () => {
    expect(parseCurrencyInput('-500')).toBe(-500);
  });

  it('returns NaN for empty string', () => {
    expect(parseCurrencyInput('')).toBeNaN();
  });

  it('returns NaN for non-string', () => {
    expect(parseCurrencyInput(123)).toBeNaN();
    expect(parseCurrencyInput(null)).toBeNaN();
  });

  it('returns NaN for unparseable string', () => {
    expect(parseCurrencyInput('abc')).toBeNaN();
  });

  it('parses thousands-only comma as non-decimal', () => {
    // "1,234" — comma followed by exactly 3 digits = thousand separator
    expect(parseCurrencyInput('1,234')).toBe(1234);
  });
});

// ─── addCurrency ──────────────────────────────────────────────────────────────

describe('addCurrency', () => {
  it('adds two amounts correctly', () => {
    expect(addCurrency(1.1, 2.2)).toBe(3.3);
  });

  it('avoids floating-point drift (0.1 + 0.2)', () => {
    expect(addCurrency(0.1, 0.2)).toBe(0.3);
  });

  it('supports custom precision', () => {
    expect(addCurrency(1.005, 2.005, 2)).toBe(3.01);
  });
});

// ─── subtractCurrency ─────────────────────────────────────────────────────────

describe('subtractCurrency', () => {
  it('subtracts correctly', () => {
    expect(subtractCurrency(5, 2.5)).toBe(2.5);
  });

  it('avoids floating-point drift', () => {
    expect(subtractCurrency(0.3, 0.1)).toBe(0.2);
  });
});

// ─── percentOf ────────────────────────────────────────────────────────────────

describe('percentOf', () => {
  it('calculates 17% of 1000', () => {
    expect(percentOf(1000, 17)).toBe(170);
  });

  it('calculates 10% of 333', () => {
    expect(percentOf(333, 10)).toBe(33.3);
  });

  it('handles 0%', () => {
    expect(percentOf(5000, 0)).toBe(0);
  });

  it('handles 100%', () => {
    expect(percentOf(750, 100)).toBe(750);
  });
});

// ─── convertCurrency ─────────────────────────────────────────────────────────

describe('convertCurrency', () => {
  it('converts ILS to USD at a given rate', () => {
    // 1 USD = 3.7 ILS → 1000 ILS = 270.27 USD
    expect(convertCurrency(1000, 1 / 3.7)).toBe(270.27);
  });

  it('converts USD to ILS', () => {
    expect(convertCurrency(100, 3.7)).toBe(370);
  });

  it('returns NaN for zero rate', () => {
    expect(convertCurrency(100, 0)).toBeNaN();
  });

  it('returns NaN for Infinity amount', () => {
    expect(convertCurrency(Infinity, 3.7)).toBeNaN();
  });
});

// ─── SUPPORTED_CURRENCIES ────────────────────────────────────────────────────

describe('SUPPORTED_CURRENCIES', () => {
  it('includes ILS, USD, EUR, GBP', () => {
    expect(SUPPORTED_CURRENCIES).toContain('ILS');
    expect(SUPPORTED_CURRENCIES).toContain('USD');
    expect(SUPPORTED_CURRENCIES).toContain('EUR');
    expect(SUPPORTED_CURRENCIES).toContain('GBP');
  });
});
