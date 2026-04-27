/**
 * src/repositories/expense-repository.js — Store-backed ExpenseRepository (Sprint 54)
 */

import { BaseRepository } from "./base-repository.js";

/** @extends {BaseRepository<import("../types.d.ts").Expense>} */
export class ExpenseRepository extends BaseRepository {
  /**
   * @param {(key: string) => import("../types.d.ts").Expense[]} storeGet
   * @param {(key: string, items: import("../types.d.ts").Expense[]) => void} storeSet
   * @param {(key: string, item: import("../types.d.ts").Expense) => void} storeUpsert
   */
  constructor(storeGet, storeSet, storeUpsert) {
    super("expenses", storeGet, storeSet, storeUpsert);
  }

  /**
   * @param {string} category
   * @returns {import("../types.d.ts").Expense[]}
   */
  findByCategory(category) {
    return this.findAll().filter((e) => e.category === category);
  }

  /** @returns {number} */
  totalAmount() {
    return this.findAll().reduce((sum, e) => sum + (e.amount ?? 0), 0);
  }

  /**
   * Group expenses by category, returning totals per category.
   * @returns {Record<string, number>}
   */
  summaryByCategory() {
    /** @type {Record<string, number>} */
    const result = {};
    for (const e of this.findAll()) {
      const cat = e.category ?? "misc";
      result[cat] = (result[cat] ?? 0) + (e.amount ?? 0);
    }
    return result;
  }
}
