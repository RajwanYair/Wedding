import { describe, it, expect } from 'vitest';
import {
  exportGuestsCsv,
  exportGuestsJson,
  exportVendorsCsv,
  exportVendorsJson,
  exportExpensesCsv,
  exportExpensesJson,
  exportSummaryJson,
  exportFullJson,
} from '../../src/utils/analytics-export.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GUESTS = [
  { name: 'Alice', phone: '+972501234567', status: 'confirmed', tableId: 1, meal: 'meat', plusOne: true, notes: '' },
  { name: 'Bob', phone: '+972507654321', status: 'declined', tableId: null, meal: 'fish', plusOne: false, notes: 'vegetarian' },
  { name: 'Carol', phone: '', status: 'pending', tableId: 2, meal: '', plusOne: false, notes: 'has, comma' },
];

const VENDORS = [
  { name: 'Flowers Inc', category: 'flowers', contact: 'flora@example.com', cost: 5000, paid: 2500, status: 'partial', notes: '' },
  { name: 'Band "Jazz"', category: 'music', contact: '', cost: 8000, paid: 8000, status: 'paid', notes: 'great band' },
];

const EXPENSES = [
  { description: 'Deposit', category: 'venue', amount: 10000, date: '2025-01-01', vendor: 'Hall Co', notes: '' },
  { description: 'Flowers', category: 'decor', amount: 5000, date: '2025-02-01', vendor: 'Flowers Inc', notes: '' },
  { description: 'Band deposit', category: 'music', amount: 4000, date: '2025-02-15', vendor: 'Band "Jazz"', notes: 'receipt attached' },
];

const STORE = { eventName: 'Our Wedding', eventDate: '2025-07-01', guests: GUESTS, vendors: VENDORS, expenses: EXPENSES, tables: [{ id: 1 }, { id: 2 }] };

// ─── Guest CSV ────────────────────────────────────────────────────────────────

describe('exportGuestsCsv', () => {
  it('starts with UTF-8 BOM', () => {
    const csv = exportGuestsCsv(GUESTS);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it('has correct header row', () => {
    const lines = exportGuestsCsv(GUESTS).split('\r\n');
    // lines[0] starts with BOM then header
    expect(lines[0].slice(1)).toBe('name,phone,status,tableId,meal,plusOne,notes');
  });

  it('maps plusOne to yes/no', () => {
    const lines = exportGuestsCsv(GUESTS).split('\r\n');
    expect(lines[1]).toContain('yes');
    expect(lines[2]).toContain('no');
  });

  it('wraps values with commas in double-quotes', () => {
    const csv = exportGuestsCsv(GUESTS);
    expect(csv).toContain('"has, comma"');
  });

  it('handles null tableId as empty string', () => {
    const lines = exportGuestsCsv(GUESTS).split('\r\n');
    // Bob row: tableId is null → empty
    expect(lines[2]).toMatch(/declined,,/);
  });

  it('returns empty string for non-array input', () => {
    expect(exportGuestsCsv(null)).toBe('');
    expect(exportGuestsCsv(undefined)).toBe('');
  });

  it('returns BOM+header only for empty array', () => {
    const csv = exportGuestsCsv([]);
    const lines = csv.split('\r\n');
    // BOM is prepended to the header line — only 1 line total for empty array
    expect(lines.length).toBe(1);
  });
});

// ─── Guest JSON ───────────────────────────────────────────────────────────────

describe('exportGuestsJson', () => {
  it('returns valid JSON array', () => {
    const parsed = JSON.parse(exportGuestsJson(GUESTS));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
  });

  it('preserves all guest fields', () => {
    const parsed = JSON.parse(exportGuestsJson(GUESTS));
    expect(parsed[0].name).toBe('Alice');
    expect(parsed[1].status).toBe('declined');
  });

  it('returns "[]" for non-array input', () => {
    expect(exportGuestsJson(null)).toBe('[]');
  });

  it('is pretty-printed with 2-space indent', () => {
    const json = exportGuestsJson(GUESTS);
    expect(json).toContain('  "name"');
  });
});

// ─── Vendor CSV ───────────────────────────────────────────────────────────────

describe('exportVendorsCsv', () => {
  it('starts with BOM', () => {
    expect(exportVendorsCsv(VENDORS).charCodeAt(0)).toBe(0xFEFF);
  });

  it('has correct header', () => {
    const lines = exportVendorsCsv(VENDORS).split('\r\n');
    expect(lines[0].slice(1)).toBe('name,category,contact,cost,paid,status,notes');
  });

  it('escapes double-quotes in vendor name', () => {
    const csv = exportVendorsCsv(VENDORS);
    expect(csv).toContain('"Band ""Jazz"""');
  });

  it('returns empty string for non-array input', () => {
    expect(exportVendorsCsv(null)).toBe('');
  });
});

// ─── Vendor JSON ──────────────────────────────────────────────────────────────

describe('exportVendorsJson', () => {
  it('returns valid JSON', () => {
    const parsed = JSON.parse(exportVendorsJson(VENDORS));
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Flowers Inc');
  });

  it('returns "[]" for non-array', () => {
    expect(exportVendorsJson(42)).toBe('[]');
  });
});

// ─── Expense CSV ──────────────────────────────────────────────────────────────

describe('exportExpensesCsv', () => {
  it('starts with BOM', () => {
    expect(exportExpensesCsv(EXPENSES).charCodeAt(0)).toBe(0xFEFF);
  });

  it('has correct header', () => {
    const lines = exportExpensesCsv(EXPENSES).split('\r\n');
    expect(lines[0].slice(1)).toBe('description,category,amount,date,vendor,notes');
  });

  it('escapes double-quotes in vendor field', () => {
    const csv = exportExpensesCsv(EXPENSES);
    expect(csv).toContain('"Band ""Jazz"""');
  });

  it('returns empty string for non-array input', () => {
    expect(exportExpensesCsv(undefined)).toBe('');
  });
});

// ─── Expense JSON ─────────────────────────────────────────────────────────────

describe('exportExpensesJson', () => {
  it('returns valid JSON', () => {
    const parsed = JSON.parse(exportExpensesJson(EXPENSES));
    expect(parsed).toHaveLength(3);
    expect(parsed[0].amount).toBe(10000);
  });

  it('returns "[]" for non-array', () => {
    expect(exportExpensesJson(null)).toBe('[]');
  });
});

// ─── Summary JSON ─────────────────────────────────────────────────────────────

describe('exportSummaryJson', () => {
  it('returns valid JSON', () => {
    const parsed = JSON.parse(exportSummaryJson(STORE));
    expect(typeof parsed).toBe('object');
  });

  it('includes event metadata', () => {
    const parsed = JSON.parse(exportSummaryJson(STORE));
    expect(parsed.eventName).toBe('Our Wedding');
    expect(parsed.eventDate).toBe('2025-07-01');
  });

  it('counts guests correctly', () => {
    const parsed = JSON.parse(exportSummaryJson(STORE));
    expect(parsed.guests.total).toBe(3);
    expect(parsed.guests.confirmed).toBe(1);
    expect(parsed.guests.declined).toBe(1);
    expect(parsed.guests.pending).toBe(1);
  });

  it('sums vendor costs', () => {
    const parsed = JSON.parse(exportSummaryJson(STORE));
    expect(parsed.vendors.totalCost).toBe(13000);
    expect(parsed.vendors.totalPaid).toBe(10500);
    expect(parsed.vendors.outstanding).toBe(2500);
  });

  it('sums expenses and groups by category', () => {
    const parsed = JSON.parse(exportSummaryJson(STORE));
    expect(parsed.expenses.totalAmount).toBe(19000);
    expect(parsed.expenses.byCategory.venue).toBe(10000);
    expect(parsed.expenses.byCategory.decor).toBe(5000);
    expect(parsed.expenses.byCategory.music).toBe(4000);
  });

  it('includes table count', () => {
    const parsed = JSON.parse(exportSummaryJson(STORE));
    expect(parsed.tables.total).toBe(2);
  });

  it('includes exportedAt timestamp', () => {
    const parsed = JSON.parse(exportSummaryJson(STORE));
    expect(typeof parsed.exportedAt).toBe('string');
    expect(parsed.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns error JSON for invalid input', () => {
    const parsed = JSON.parse(exportSummaryJson(null));
    expect(parsed.error).toBeDefined();
  });

  it('handles empty arrays gracefully', () => {
    const parsed = JSON.parse(exportSummaryJson({ guests: [], vendors: [], expenses: [], tables: [] }));
    expect(parsed.guests.total).toBe(0);
    expect(parsed.vendors.totalCost).toBe(0);
    expect(parsed.expenses.totalAmount).toBe(0);
  });
});

// ─── Full JSON ────────────────────────────────────────────────────────────────

describe('exportFullJson', () => {
  it('includes summary + entity arrays', () => {
    const parsed = JSON.parse(exportFullJson(STORE));
    expect(parsed.summary).toBeDefined();
    expect(Array.isArray(parsed.guests)).toBe(true);
    expect(Array.isArray(parsed.vendors)).toBe(true);
    expect(Array.isArray(parsed.expenses)).toBe(true);
    expect(Array.isArray(parsed.tables)).toBe(true);
  });

  it('guest array has expected count', () => {
    const parsed = JSON.parse(exportFullJson(STORE));
    expect(parsed.guests).toHaveLength(3);
  });

  it('returns error JSON for invalid input', () => {
    const parsed = JSON.parse(exportFullJson(null));
    expect(parsed.error).toBeDefined();
  });
});
