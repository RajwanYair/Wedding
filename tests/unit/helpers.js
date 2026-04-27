/**
 * tests/unit/helpers.js — Shared test factory functions
 *
 * Single source of truth for test fixtures used across unit/integration tests.
 * All factory functions accept an `overrides` object so callers can specialise
 * only the fields that matter for a given test.
 *
 * Usage:
 *   import { makeGuest, makeTable, makeVendor, makeExpense } from "./helpers.js";
 */

// ── Guest ─────────────────────────────────────────────────────────────────────

/**
 * Build a canonical Guest fixture.  Includes every field defined in the
 * Guest data model so tests that inspect individual properties always have a
 * safe default to fall back on.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {import("../../src/types.d.ts").Guest}
 */
export function makeGuest(overrides = {}) {
  return {
    id: `g_${Math.random().toString(36).slice(2)}`,
    firstName: "Test",
    lastName: "Guest",
    phone: "",
    email: "",
    count: 1,
    children: 0,
    status: "pending",
    side: "groom",
    group: "friends",
    meal: "regular",
    mealNotes: "",
    accessibility: false,
    tableId: null,
    gift: "",
    notes: "",
    sent: false,
    checkedIn: false,
    rsvpDate: null,
    vip: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Table ─────────────────────────────────────────────────────────────────────

/**
 * Build a canonical Table fixture.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {{ id: string, name: string, capacity: number, shape: string }}
 */
export function makeTable(overrides = {}) {
  return {
    id: `t_${Math.random().toString(36).slice(2)}`,
    name: "Table 1",
    capacity: 8,
    shape: "round",
    ...overrides,
  };
}

// ── Vendor ────────────────────────────────────────────────────────────────────

/**
 * Build a canonical Vendor fixture.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {{ category: string, name: string, contact: string, phone: string, price: number, paid: number, notes: string }}
 */
export function makeVendor(overrides = {}) {
  return {
    category: "Photography",
    name: "Dan Photography",
    contact: "",
    phone: "",
    price: 5000,
    paid: 0,
    notes: "",
    ...overrides,
  };
}

// ── Expense ───────────────────────────────────────────────────────────────────

/**
 * Build a canonical Expense fixture.
 *
 * @param {Record<string, unknown>} [overrides]
 * @returns {{ category: string, description: string, amount: number, date: string }}
 */
export function makeExpense(overrides = {}) {
  return {
    category: "Catering",
    description: "Wedding dinner",
    amount: 10000,
    date: "2024-06-01",
    ...overrides,
  };
}

// ── TimelineItem ──────────────────────────────────────────────────────────────

/**
 * Build a canonical TimelineItem fixture.
 * @param {Record<string, unknown>} [overrides]
 */
export function makeTimelineItem(overrides = {}) {
  return {
    id: `tl-${Math.random().toString(36).slice(2)}`,
    time: "18:00",
    icon: "🎉",
    title: "Ceremony begins",
    note: "",
    ...overrides,
  };
}

// ── RsvpLogEntry ──────────────────────────────────────────────────────────────

/**
 * Build a canonical RsvpLogEntry fixture.
 * @param {Record<string, unknown>} [overrides]
 */
export function makeRsvpLogEntry(overrides = {}) {
  return {
    id: `log-${Math.random().toString(36).slice(2)}`,
    guestId: "g1",
    guestName: "Test Guest",
    phone: "+972541234567",
    status: "confirmed",
    count: 2,
    children: 0,
    timestamp: new Date().toISOString(),
    source: "web",
    ...overrides,
  };
}

// ── Handler test helpers ──────────────────────────────────────────────────────

/**
 * Given a mocked `on` event-registrar, return the registered callback for `action`.
 *
 * Centralises the boilerplate used in every *-handlers.test.mjs so the pattern
 * never diverges across files.
 *
 * Usage:
 *   import { getHandler } from "./helpers.js";
 *   const handler = getHandler(on, "saveGuest");
 *
 * @param {{ mock: { calls: Array<[string, Function]> } }} mockedOn
 * @param {string} action
 * @returns {Function}
 */
export function getHandler(mockedOn, action) {
  const call = mockedOn.mock.calls.find(([a]) => a === action);
  if (!call) throw new Error(`No handler for "${action}"`);
  return call[1];
}

/**
 * Standard registration tests shared by all *-handlers.test.mjs files.
 *
 * Replaces 5 repetitive tests per handler module with a single parameterized
 * block: "is a function", "registers via on()", "does not throw", plus
 * `it.each` for required action names.
 *
 * @param {object}   opts
 * @param {string}   opts.name        — e.g. "registerAuthHandlers"
 * @param {Function} opts.register    — the register function under test
 * @param {{ mock: { calls: Array<[string, Function]> } }} opts.on — mocked `on`
 * @param {string[]} opts.actions     — action names that must be registered
 * @param {Array}    [opts.args=[]]   — args to pass to register()
 * @param {object}   opts.vi          — vitest vi object
 */
export function assertHandlerRegistration({ name, register, on, actions, args = [], vi }) {
  vi.mocked(on).mockClear();

  // is a function
  if (typeof register !== "function") {
    throw new Error(`${name} is not a function`);
  }

  // does not throw
  register(...args);

  // registers handlers via on()
  const calls = vi.mocked(on).mock.calls;
  if (calls.length === 0) {
    throw new Error(`${name} did not register any handlers`);
  }

  // check required actions
  const registered = calls.map((c) => c[0]);
  for (const action of actions) {
    if (!registered.includes(action)) {
      throw new Error(`${name} did not register "${action}" handler`);
    }
  }

  return true;
}

// ── localStorage mock factory ─────────────────────────────────────────────────

/**
 * Create a minimal localStorage mock backed by a plain object.
 *
 * Returns `{ mock, store }` where:
 *   - `mock`  is the object suitable for `vi.stubGlobal("localStorage", mock)`
 *   - `store` is the underlying `{}` — reset it between tests with `Object.keys(store).forEach(k => delete store[k])` or `clearStore(store)`.
 *
 * Usage:
 *   const { mock: lsMock, store: lsStore } = createLocalStorageMock();
 *   vi.stubGlobal("localStorage", lsMock);
 *   beforeEach(() => clearStore(lsStore));
 *
 * @returns {{ mock: Storage, store: Record<string, string> }}
 */
export function createLocalStorageMock() {
  /** @type {Record<string, string>} */
  const store = {};
  const mock = /** @type {Storage} */ ({
    getItem: (k) => (store[k] ?? null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null,
  });
  return { mock, store };
}

/**
 * Clear all entries from a store object returned by `createLocalStorageMock()`.
 * Useful in `beforeEach` to reset between tests.
 *
 * @param {Record<string, string>} store
 */
export function clearStore(store) {
  Object.keys(store).forEach((k) => delete store[k]);
}
