/**
 * src/repositories/supabase-expense-repository.js — Supabase Expense repository (Sprint 76)
 */

import { SupabaseBaseRepository } from "./supabase-base-repository.js";

/**
 * @extends {SupabaseBaseRepository<Record<string, unknown> & { id: string }>}
 */
export class SupabaseExpenseRepository extends SupabaseBaseRepository {
  /**
   * @param {import("@supabase/supabase-js").SupabaseClient} supabase
   * @param {string} [eventId]
   */
  constructor(supabase, eventId) {
    super(supabase, "expenses", eventId);
  }

  /**
   * @param {string} category
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findByCategory(category) {
    const { data, error } = await this._query().eq("category", category);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Sum of all expense amounts.
   * @returns {Promise<number>}
   */
  async totalAmount() {
    const { data, error } = await this._query().select("amount");
    if (error) throw error;
    return (data ?? []).reduce((/** @type {number} */ s, /** @type {Record<string,unknown>} */ e) => s + Number(e.amount ?? 0), 0);
  }

  /**
   * Breakdown of totals by category.
   * @returns {Promise<Record<string, number>>}
   */
  async summaryByCategory() {
    const { data, error } = await this._query().select("category,amount");
    if (error) throw error;
    /** @type {Record<string, number>} */
    const summary = {};
    for (const row of data ?? []) {
      const cat = String(row.category ?? "other");
      summary[cat] = (summary[cat] ?? 0) + Number(row.amount ?? 0);
    }
    return summary;
  }
}
