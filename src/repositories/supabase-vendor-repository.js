/**
 * src/repositories/supabase-vendor-repository.js — Supabase Vendor repository (Sprint 75)
 */

import { SupabaseBaseRepository } from "./supabase-base-repository.js";

/**
 * @extends {SupabaseBaseRepository<Record<string, unknown> & { id: string }>}
 */
export class SupabaseVendorRepository extends SupabaseBaseRepository {
  /**
   * @param {import("@supabase/supabase-js").SupabaseClient} supabase
   * @param {string} [eventId]
   */
  constructor(supabase, eventId) {
    super(supabase, "vendors", eventId);
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
   * Vendors with paid < price.
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findUnpaid() {
    const { data, error } = await this._query().lt("paid", "price");
    if (error) throw error;
    // If the DB doesn't support column comparison in lt, filter in-memory
    const all = data ?? [];
    return all.filter((/** @type {Record<string,unknown>} */ v) => Number(v.paid ?? 0) < Number(v.price ?? 0));
  }

  /**
   * Sum of all vendor prices.
   * @returns {Promise<number>}
   */
  async totalCost() {
    const { data, error } = await this._query().select("price");
    if (error) throw error;
    return (data ?? []).reduce(/** @param {number} s @param {Record<string,unknown>} v */ (s, v) => s + Number(v.price ?? 0), 0);
  }

  /**
   * Sum of all paid amounts.
   * @returns {Promise<number>}
   */
  async totalPaid() {
    const { data, error } = await this._query().select("paid");
    if (error) throw error;
    return (data ?? []).reduce(/** @param {number} s @param {Record<string,unknown>} v */ (s, v) => s + Number(v.paid ?? 0), 0);
  }

  /**
   * Outstanding balance (totalCost - totalPaid).
   * @returns {Promise<number>}
   */
  async outstanding() {
    const [cost, paid] = await Promise.all([this.totalCost(), this.totalPaid()]);
    return cost - paid;
  }
}
