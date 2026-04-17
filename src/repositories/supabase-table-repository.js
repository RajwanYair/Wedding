/**
 * src/repositories/supabase-table-repository.js — Supabase Table repository (Sprint 74)
 */

import { SupabaseBaseRepository } from "./supabase-base-repository.js";

export class SupabaseTableRepository extends SupabaseBaseRepository {
  /**
   * @param {import("@supabase/supabase-js").SupabaseClient} supabase
   * @param {string} [eventId]
   */
  constructor(supabase, eventId) {
    super(supabase, "tables", eventId);
  }

  /**
   * @param {"round"|"rect"} shape
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findByShape(shape) {
    const { data, error } = await this._query().eq("shape", shape);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Sum of all table capacities.
   * @returns {Promise<number>}
   */
  async totalCapacity() {
    const { data, error } = await this._query().select("capacity");
    if (error) throw error;
    return (data ?? []).reduce((sum, row) => sum + (Number(row.capacity) || 0), 0);
  }

  /**
   * Case-insensitive name search.
   * @param {string} name
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async findByName(name) {
    const { data, error } = await this._query()
      .ilike("name", name)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }
}
