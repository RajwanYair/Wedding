/**
 * src/repositories/supabase-guest-repository.js — Supabase Guest repository (Sprint 73)
 *
 * Extends SupabaseBaseRepository with guest-specific queries.
 */

import { SupabaseBaseRepository } from "./supabase-base-repository.js";

/**
 * @typedef {import("@supabase/supabase-js").SupabaseClient} SupabaseClient
 */

export class SupabaseGuestRepository extends SupabaseBaseRepository {
  /**
   * @param {SupabaseClient} supabase
   * @param {string} [eventId]
   */
  constructor(supabase, eventId) {
    super(supabase, "guests", eventId);
  }

  /**
   * @param {"pending"|"confirmed"|"declined"|"maybe"} status
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findByStatus(status) {
    const { data, error } = await this._query().eq("status", status);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * @param {string} tableId
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findByTable(tableId) {
    const { data, error } = await this._query().eq("table_id", tableId);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Lookup by phone prefix-normalised to E.164.
   * @param {string} phone  Raw or E.164 phone string
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async findByPhone(phone) {
    const normalized = phone.replace(/\D/g, "");
    const { data, error } = await this._query()
      .or(`phone.eq.${phone},phone.eq.+${normalized}`)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  /**
   * @param {"groom"|"bride"|"mutual"} side
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findBySide(side) {
    const { data, error } = await this._query().eq("side", side);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * @param {"family"|"friends"|"work"|"other"} group
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findByGroup(group) {
    const { data, error } = await this._query().eq("group", group);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Guests with checked_in = false and status = 'confirmed'.
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findUncheckedIn() {
    const { data, error } = await this._query()
      .eq("status", "confirmed")
      .eq("checked_in", false);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Guests with no table assigned.
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findUnassigned() {
    const { data, error } = await this._query().is("table_id", null);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Count of confirmed guests (sum of `count` column).
   * @returns {Promise<number>}
   */
  async confirmedCount() {
    const { data, error } = await this._supabase
      .from(this._table)
      .select("count")
      .is("deleted_at", null)
      .eq("status", "confirmed")
      .then((res) => res);
    if (error) throw error;
    return (data ?? []).reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  }
}
