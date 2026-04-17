/**
 * src/services/repositories.js — Domain repository implementations (Phase 1)
 *
 * Implements the typed repository interfaces from src/types.d.ts.
 * Sections should call these repositories instead of directly accessing
 * store.js or sheets.js, keeping implementation details out of UI code.
 *
 * All repositories are local-first: reads come from the reactive store,
 * writes are applied to the store immediately and queued for backend sync.
 *
 * Usage:
 *   import { guestRepo, tableRepo, vendorRepo, expenseRepo } from "../services/repositories.js";
 *   const guests = await guestRepo.getAll();
 *   const saved  = await guestRepo.create({ firstName: "Yair", ... });
 */

import { storeGet, storeSet } from "../core/store.js";
import { enqueueWrite } from "./sheets.js";
import { uid } from "../utils/misc.js";

// ── Internal helpers ──────────────────────────────────────────────────────

/**
 * Apply a paginated slice to an array using cursor-based offset.
 * @template T
 * @param {T[]} items
 * @param {import('../types.js').PageRequest} req
 * @returns {import('../types.js').PageResult<T>}
 */
function _paginate(items, { cursor, limit, orderBy, orderDir = "asc" }) {
  /** @type {T[]} */
  let sorted = items;
  if (orderBy) {
    sorted = [...items].sort((a, b) => {
      const av = /** @type {Record<string,unknown>} */ (a)[orderBy] ?? "";
      const bv = /** @type {Record<string,unknown>} */ (b)[orderBy] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
      return orderDir === "desc" ? -cmp : cmp;
    });
  }

  const startIdx = cursor ? sorted.findIndex((i) => /** @type {Record<string,unknown>}*/ (i)["id"] === cursor) + 1 : 0;
  const page = sorted.slice(startIdx, startIdx + limit);
  const last = page[page.length - 1];
  const nextCursor = page.length === limit && last
    ? String(/** @type {Record<string,unknown>} */ (last)["id"])
    : null;

  return { items: page, nextCursor, total: sorted.length };
}

/** @returns {string} ISO timestamp */
function _now() {
  return new Date().toISOString();
}

// ── Guest Repository ──────────────────────────────────────────────────────

/** @implements {import('../types').GuestRepository} */
export const guestRepo = {
  /** @returns {Promise<import('../types').Guest[]>} */
  async getAll() {
    return /** @type {import('../types').Guest[]} */ (storeGet("guests") ?? []);
  },

  /** @param {string} id @returns {Promise<import('../types').Guest | null>} */
  async getById(id) {
    const guests = /** @type {import('../types').Guest[]} */ (storeGet("guests") ?? []);
    return guests.find((g) => g.id === id) ?? null;
  },

  /** @param {import('../types').PageRequest} req */
  async getPage(req) {
    const all = await this.getAll();
    return _paginate(all, req);
  },

  /** @param {string} phone @returns {Promise<import('../types').Guest | null>} */
  async findByPhone(phone) {
    const guests = await this.getAll();
    const norm = phone.replace(/\D/g, "");
    return guests.find((g) => g.phone.replace(/\D/g, "") === norm) ?? null;
  },

  /** @param {import('../types').GuestStatus} status */
  async findByStatus(status) {
    const guests = await this.getAll();
    return guests.filter((g) => g.status === status);
  },

  /** @param {string} tableId */
  async findByTable(tableId) {
    const guests = await this.getAll();
    return guests.filter((g) => g.tableId === tableId);
  },

  /** @param {Omit<import('../types').Guest,'id'|'createdAt'|'updatedAt'>} item */
  async create(item) {
    const guests = await this.getAll();
    const now = _now();
    const newGuest = /** @type {import('../types').Guest} */ ({
      ...item,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    });
    storeSet("guests", [...guests, newGuest]);
    enqueueWrite("guests", async () => {});
    return newGuest;
  },

  /** @param {string} id @param {Partial<import('../types').Guest>} patch */
  async update(id, patch) {
    const guests = await this.getAll();
    const idx = guests.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Guest not found: ${id}`);
    const updated = /** @type {import('../types').Guest} */ ({
      ...guests[idx],
      ...patch,
      id,
      updatedAt: _now(),
    });
    const next = [...guests];
    next[idx] = updated;
    storeSet("guests", next);
    enqueueWrite("guests", async () => {});
    return updated;
  },

  /** @param {string} id */
  async delete(id) {
    const guests = await this.getAll();
    storeSet("guests", guests.filter((g) => g.id !== id));
    enqueueWrite("guests", async () => {});
  },

  /** @param {string[]} ids @param {import('../types').GuestStatus} status */
  async bulkUpdateStatus(ids, status) {
    const guests = await this.getAll();
    const idSet = new Set(ids);
    const now = _now();
    storeSet(
      "guests",
      guests.map((g) => idSet.has(g.id) ? { ...g, status, updatedAt: now } : g),
    );
    enqueueWrite("guests", async () => {});
  },

  /** @param {string[]} ids @param {string} tableId */
  async bulkAssignTable(ids, tableId) {
    const guests = await this.getAll();
    const idSet = new Set(ids);
    const now = _now();
    storeSet(
      "guests",
      guests.map((g) => idSet.has(g.id) ? { ...g, tableId, updatedAt: now } : g),
    );
    enqueueWrite("guests", async () => {});
  },
};

// ── Table Repository ──────────────────────────────────────────────────────

/** @implements {import('../types').TableRepository} */
export const tableRepo = {
  /** @returns {Promise<import('../types').Table[]>} */
  async getAll() {
    return /** @type {import('../types').Table[]} */ (storeGet("tables") ?? []);
  },

  /** @param {string} id @returns {Promise<import('../types').Table | null>} */
  async getById(id) {
    const tables = await this.getAll();
    return tables.find((t) => t.id === id) ?? null;
  },

  /** @param {import('../types').PageRequest} req */
  async getPage(req) {
    const all = await this.getAll();
    return _paginate(all, req);
  },

  /** @param {number} minCapacity */
  async findAvailable(minCapacity) {
    const tables = await this.getAll();
    const guests = /** @type {import('../types').Guest[]} */ (storeGet("guests") ?? []);
    return tables.filter((t) => {
      const seated = guests.filter((g) => g.tableId === t.id && g.status === "confirmed").length;
      return t.capacity - seated >= minCapacity;
    });
  },

  /** @param {Omit<import('../types').Table,'id'>} item */
  async create(item) {
    const tables = await this.getAll();
    const newTable = /** @type {import('../types').Table} */ ({ ...item, id: uid() });
    storeSet("tables", [...tables, newTable]);
    enqueueWrite("tables", async () => {});
    return newTable;
  },

  /** @param {string} id @param {Partial<import('../types').Table>} patch */
  async update(id, patch) {
    const tables = await this.getAll();
    const idx = tables.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Table not found: ${id}`);
    const updated = /** @type {import('../types').Table} */ ({ ...tables[idx], ...patch, id });
    const next = [...tables];
    next[idx] = updated;
    storeSet("tables", next);
    enqueueWrite("tables", async () => {});
    return updated;
  },

  /** @param {string} id */
  async delete(id) {
    const tables = await this.getAll();
    storeSet("tables", tables.filter((t) => t.id !== id));
    enqueueWrite("tables", async () => {});
  },
};

// ── Vendor Repository ─────────────────────────────────────────────────────

/** @implements {import('../types').VendorRepository} */
export const vendorRepo = {
  /** @returns {Promise<import('../types').Vendor[]>} */
  async getAll() {
    return /** @type {import('../types').Vendor[]} */ (storeGet("vendors") ?? []);
  },

  /** @param {string} id @returns {Promise<import('../types').Vendor | null>} */
  async getById(id) {
    const vendors = await this.getAll();
    return vendors.find((v) => v.id === id) ?? null;
  },

  /** @param {import('../types').PageRequest} req */
  async getPage(req) {
    const all = await this.getAll();
    return _paginate(all, req);
  },

  /** @param {string} category */
  async findByCategory(category) {
    const vendors = await this.getAll();
    return vendors.filter((v) => v.category === category);
  },

  /** @param {Omit<import('../types').Vendor,'id'|'createdAt'|'updatedAt'>} item */
  async create(item) {
    const vendors = await this.getAll();
    const now = _now();
    const newVendor = /** @type {import('../types').Vendor} */ ({
      ...item,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    });
    storeSet("vendors", [...vendors, newVendor]);
    enqueueWrite("vendors", async () => {});
    return newVendor;
  },

  /** @param {string} id @param {Partial<import('../types').Vendor>} patch */
  async update(id, patch) {
    const vendors = await this.getAll();
    const idx = vendors.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error(`Vendor not found: ${id}`);
    const updated = /** @type {import('../types').Vendor} */ ({
      ...vendors[idx],
      ...patch,
      id,
      updatedAt: _now(),
    });
    const next = [...vendors];
    next[idx] = updated;
    storeSet("vendors", next);
    enqueueWrite("vendors", async () => {});
    return updated;
  },

  /** @param {string} id */
  async delete(id) {
    const vendors = await this.getAll();
    storeSet("vendors", vendors.filter((v) => v.id !== id));
    enqueueWrite("vendors", async () => {});
  },
};

// ── Expense Repository ────────────────────────────────────────────────────

/** @implements {import('../types').ExpenseRepository} */
export const expenseRepo = {
  /** @returns {Promise<import('../types').Expense[]>} */
  async getAll() {
    return /** @type {import('../types').Expense[]} */ (storeGet("expenses") ?? []);
  },

  /** @param {string} id @returns {Promise<import('../types').Expense | null>} */
  async getById(id) {
    const expenses = await this.getAll();
    return expenses.find((e) => e.id === id) ?? null;
  },

  /** @param {import('../types').PageRequest} req */
  async getPage(req) {
    const all = await this.getAll();
    return _paginate(all, req);
  },

  /** @returns {Promise<Record<string, number>>} */
  async sumByCategory() {
    const expenses = await this.getAll();
    /** @type {Record<string, number>} */
    const sums = {};
    for (const e of expenses) {
      sums[e.category] = (sums[e.category] ?? 0) + (e.amount ?? 0);
    }
    return sums;
  },

  /** @param {Omit<import('../types').Expense,'id'|'createdAt'>} item */
  async create(item) {
    const expenses = await this.getAll();
    const now = _now();
    const newExpense = /** @type {import('../types').Expense} */ ({
      ...item,
      id: uid(),
      createdAt: now,
    });
    storeSet("expenses", [...expenses, newExpense]);
    enqueueWrite("expenses", async () => {});
    return newExpense;
  },

  /** @param {string} id @param {Partial<import('../types').Expense>} patch */
  async update(id, patch) {
    const expenses = await this.getAll();
    const idx = expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`Expense not found: ${id}`);
    const updated = /** @type {import('../types').Expense} */ ({ ...expenses[idx], ...patch, id });
    const next = [...expenses];
    next[idx] = updated;
    storeSet("expenses", next);
    enqueueWrite("expenses", async () => {});
    return updated;
  },

  /** @param {string} id */
  async delete(id) {
    const expenses = await this.getAll();
    storeSet("expenses", expenses.filter((e) => e.id !== id));
    enqueueWrite("expenses", async () => {});
  },
};

// ── Timeline Repository ───────────────────────────────────────────────────

/** @implements {import('../types').TimelineRepository} */
export const timelineRepo = {
  /** @returns {Promise<import('../types').TimelineItem[]>} */
  async getAll() {
    return /** @type {import('../types').TimelineItem[]} */ (storeGet("timeline") ?? []);
  },

  /** @param {string} id @returns {Promise<import('../types').TimelineItem | null>} */
  async getById(id) {
    const items = await this.getAll();
    return items.find((t) => t.id === id) ?? null;
  },

  /** @param {import('../types').PageRequest} req */
  async getPage(req) {
    const all = await this.getAll();
    return _paginate(all, req);
  },

  /** @returns {Promise<import('../types').TimelineItem[]>} sorted by time ascending */
  async getOrdered() {
    const items = await this.getAll();
    return [...items].sort((a, b) => a.time.localeCompare(b.time));
  },

  /** @param {Omit<import('../types').TimelineItem,'id'>} item */
  async create(item) {
    const items = await this.getAll();
    const newItem = /** @type {import('../types').TimelineItem} */ ({ ...item, id: uid() });
    storeSet("timeline", [...items, newItem]);
    enqueueWrite("timeline", async () => {});
    return newItem;
  },

  /** @param {string} id @param {Partial<import('../types').TimelineItem>} patch */
  async update(id, patch) {
    const items = await this.getAll();
    const idx = items.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error(`Timeline item not found: ${id}`);
    const updated = /** @type {import('../types').TimelineItem} */ ({ ...items[idx], ...patch, id });
    const next = [...items];
    next[idx] = updated;
    storeSet("timeline", next);
    enqueueWrite("timeline", async () => {});
    return updated;
  },

  /** @param {string} id */
  async delete(id) {
    const items = await this.getAll();
    storeSet("timeline", items.filter((t) => t.id !== id));
    enqueueWrite("timeline", async () => {});
  },

  /**
   * Mark a timeline item as done or undone.
   * @param {string} id
   * @param {boolean} done
   */
  async setDone(id, done) {
    const current = /** @type {Record<string, boolean>} */ (storeGet("timelineDone") ?? {});
    storeSet("timelineDone", { ...current, [id]: done });
  },
};

// ── RSVP Log Repository (append-only) ────────────────────────────────────

/** @implements {import('../types').RsvpLogRepository} */
export const rsvpLogRepo = {
  /** @returns {Promise<import('../types').RsvpLogEntry[]>} */
  async getAll() {
    return /** @type {import('../types').RsvpLogEntry[]} */ (storeGet("rsvp_log") ?? []);
  },

  /**
   * Append a new RSVP log entry.
   * @param {import('../types').RsvpLogEntry} entry
   */
  async append(entry) {
    const log = await this.getAll();
    storeSet("rsvp_log", [...log, entry]);
    enqueueWrite("rsvp_log", async () => {});
  },

  /**
   * Return entries for a specific guest id (most recent first).
   * @param {string} guestId
   * @returns {Promise<import('../types').RsvpLogEntry[]>}
   */
  async getByGuest(guestId) {
    const log = await this.getAll();
    return log
      .filter((e) => e.guestId === guestId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
};
