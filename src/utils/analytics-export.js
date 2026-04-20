/**
 * @module analytics-export
 * @description Analytics export utilities — CSV and JSON serialisers for guests, vendors,
 * expenses and summary data. All functions are pure (no DOM, no network).
 */

// ─── CSV helpers ─────────────────────────────────────────────────────────────

/**
 * Escape a single CSV cell value.
 * Wraps in double-quotes and escapes embedded double-quotes per RFC 4180.
 * @param {unknown} value
 * @returns {string}
 */
function csvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serialize an array of row-objects to a CSV string with a header row.
 * @param {string[]} headers - Column headers in display order.
 * @param {Array<Record<string, unknown>>} rows - Data rows; keys match headers.
 * @returns {string}
 */
function toCsv(headers, rows) {
  const headerLine = headers.map(csvCell).join(',');
  const dataLines = rows.map(row =>
    headers.map(h => csvCell(row[h])).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

// ─── Guest export ─────────────────────────────────────────────────────────────

/** @typedef {{ name?: string, phone?: string, status?: string, tableId?: string|number, meal?: string, plusOne?: boolean, notes?: string, [key: string]: unknown }} GuestRecord */

const GUEST_HEADERS = ['name', 'phone', 'status', 'tableId', 'meal', 'plusOne', 'notes'];

/**
 * Export an array of guest objects to CSV.
 * @param {GuestRecord[]} guests
 * @returns {string} CSV string with BOM for Excel compatibility.
 */
export function exportGuestsCsv(guests) {
  if (!Array.isArray(guests)) return '';
  const rows = guests.map(g => ({
    name: g.name ?? '',
    phone: g.phone ?? '',
    status: g.status ?? '',
    tableId: g.tableId ?? '',
    meal: g.meal ?? '',
    plusOne: g.plusOne ? 'yes' : 'no',
    notes: g.notes ?? '',
  }));
  return `\uFEFF${toCsv(GUEST_HEADERS, rows)}`;
}

/**
 * Export guest objects to a JSON string (pretty-printed, 2-space indent).
 * @param {GuestRecord[]} guests
 * @returns {string}
 */
export function exportGuestsJson(guests) {
  if (!Array.isArray(guests)) return '[]';
  return JSON.stringify(guests, null, 2);
}

// ─── Vendor export ────────────────────────────────────────────────────────────

/** @typedef {{ name?: string, category?: string, contact?: string, cost?: number, paid?: number, status?: string, notes?: string, [key: string]: unknown }} VendorRecord */

const VENDOR_HEADERS = ['name', 'category', 'contact', 'cost', 'paid', 'status', 'notes'];

/**
 * Export an array of vendor objects to CSV.
 * @param {VendorRecord[]} vendors
 * @returns {string} CSV string with BOM.
 */
export function exportVendorsCsv(vendors) {
  if (!Array.isArray(vendors)) return '';
  const rows = vendors.map(v => ({
    name: v.name ?? '',
    category: v.category ?? '',
    contact: v.contact ?? '',
    cost: v.cost ?? 0,
    paid: v.paid ?? 0,
    status: v.status ?? '',
    notes: v.notes ?? '',
  }));
  return `\uFEFF${toCsv(VENDOR_HEADERS, rows)}`;
}

/**
 * Export vendor objects to a JSON string.
 * @param {VendorRecord[]} vendors
 * @returns {string}
 */
export function exportVendorsJson(vendors) {
  if (!Array.isArray(vendors)) return '[]';
  return JSON.stringify(vendors, null, 2);
}

// ─── Expense export ───────────────────────────────────────────────────────────

/** @typedef {{ description?: string, category?: string, amount?: number, date?: string, vendor?: string, notes?: string, [key: string]: unknown }} ExpenseRecord */

const EXPENSE_HEADERS = ['description', 'category', 'amount', 'date', 'vendor', 'notes'];

/**
 * Export an array of expense objects to CSV.
 * @param {ExpenseRecord[]} expenses
 * @returns {string} CSV string with BOM.
 */
export function exportExpensesCsv(expenses) {
  if (!Array.isArray(expenses)) return '';
  const rows = expenses.map(e => ({
    description: e.description ?? '',
    category: e.category ?? '',
    amount: e.amount ?? 0,
    date: e.date ?? '',
    vendor: e.vendor ?? '',
    notes: e.notes ?? '',
  }));
  return `\uFEFF${toCsv(EXPENSE_HEADERS, rows)}`;
}

/**
 * Export expense objects to a JSON string.
 * @param {ExpenseRecord[]} expenses
 * @returns {string}
 */
export function exportExpensesJson(expenses) {
  if (!Array.isArray(expenses)) return '[]';
  return JSON.stringify(expenses, null, 2);
}

// ─── Summary export ───────────────────────────────────────────────────────────

/**
 * @typedef {object} SummaryStore
 * @property {GuestRecord[]} [guests]
 * @property {VendorRecord[]} [vendors]
 * @property {ExpenseRecord[]} [expenses]
 * @property {unknown[]} [tables]
 * @property {string} [eventName]
 * @property {string} [eventDate]
 */

/**
 * Build a summary statistics object from a store snapshot.
 * @param {SummaryStore} store
 * @returns {object}
 */
function buildSummary(store) {
  const guests = Array.isArray(store.guests) ? store.guests : [];
  const vendors = Array.isArray(store.vendors) ? store.vendors : [];
  const expenses = Array.isArray(store.expenses) ? store.expenses : [];
  const tables = Array.isArray(store.tables) ? store.tables : [];

  const confirmed = guests.filter(g => g.status === 'confirmed').length;
  const declined = guests.filter(g => g.status === 'declined').length;
  const pending = guests.filter(g => g.status === 'pending' || !g.status).length;
  const totalCost = vendors.reduce((sum, v) => sum + (Number(v.cost) || 0), 0);
  const totalPaid = vendors.reduce((sum, v) => sum + (Number(v.paid) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const expensesByCategory = expenses.reduce((acc, e) => {
    const cat = e.category || 'other';
    acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0);
    return acc;
  }, {});

  return {
    eventName: store.eventName ?? '',
    eventDate: store.eventDate ?? '',
    exportedAt: new Date().toISOString(),
    guests: {
      total: guests.length,
      confirmed,
      declined,
      pending,
    },
    tables: {
      total: tables.length,
    },
    vendors: {
      total: vendors.length,
      totalCost,
      totalPaid,
      outstanding: totalCost - totalPaid,
    },
    expenses: {
      total: expenses.length,
      totalAmount: totalExpenses,
      byCategory: expensesByCategory,
    },
  };
}

/**
 * Export a full summary JSON from the store snapshot.
 * @param {SummaryStore} store
 * @returns {string} Pretty-printed JSON.
 */
export function exportSummaryJson(store) {
  if (!store || typeof store !== 'object') {
    return JSON.stringify({ error: 'invalid store' }, null, 2);
  }
  const summary = buildSummary(store);
  return JSON.stringify(summary, null, 2);
}

/**
 * Export a combined full-data JSON bundle: summary + all entity arrays.
 * @param {SummaryStore} store
 * @returns {string} Pretty-printed JSON.
 */
export function exportFullJson(store) {
  if (!store || typeof store !== 'object') {
    return JSON.stringify({ error: 'invalid store' }, null, 2);
  }
  const bundle = {
    summary: buildSummary(store),
    guests: Array.isArray(store.guests) ? store.guests : [],
    vendors: Array.isArray(store.vendors) ? store.vendors : [],
    expenses: Array.isArray(store.expenses) ? store.expenses : [],
    tables: Array.isArray(store.tables) ? store.tables : [],
  };
  return JSON.stringify(bundle, null, 2);
}
