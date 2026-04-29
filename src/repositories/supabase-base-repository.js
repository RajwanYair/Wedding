/**
 * src/repositories/supabase-base-repository.js — Supabase-backed base repository (Sprint 73)
 *
 * Adapter that wraps a Supabase JS client and provides the same interface as
 * `BaseRepository` (Sprint 53). Injects supabase client to keep tests mockable.
 *
 * Soft-delete: all queries automatically filter `deleted_at IS NULL`.
 * Event scoping: optional `eventId` filters to `event_id = eventId`.
 *
 * Usage:
 *   import { createClient } from "@supabase/supabase-js";
 *   import { SupabaseGuestRepository } from "./supabase-guest-repository.js";
 *   const repo = new SupabaseGuestRepository(createClient(URL, KEY), "my-event");
 */

/**
 * @template {Record<string, unknown> & { id: string }} T
 */
export class SupabaseBaseRepository {
  /**
   * @param {import("@supabase/supabase-js").SupabaseClient} supabase   Supabase client instance
   * @param {string}  tableName    Database table name
   * @param {string}  [eventId]    Optional event_id filter
   */
  constructor(supabase, tableName, eventId) {
    this._supabase = supabase;
    this._table = tableName;
    this._eventId = eventId ?? null;
  }

  /** @returns {import("@supabase/supabase-js").PostgrestFilterBuilder<any, any, any, any>} */
  _query() {
    /** @type {any} */
    let q = this._supabase.from(this._table).select("*").is("deleted_at", null);
    if (this._eventId) q = q.eq("event_id", this._eventId);
    return q;
  }

  /**
   * Get all active (non-deleted) records for this event.
   * @returns {Promise<T[]>}
   */
  async findAll() {
    const { data, error } = await this._query().order("created_at", { ascending: true });
    if (error) throw error;
    return /** @type {T[]} */ (data ?? []);
  }

  /**
   * Find a record by id (null if not found or soft-deleted).
   * @param {string} id
   * @returns {Promise<T | null>}
   */
  async findById(id) {
    const { data, error } = await this._query().eq("id", id).maybeSingle();
    if (error) throw error;
    return /** @type {T | null} */ (data ?? null);
  }

  /**
   * Insert a new record.
   * @param {T} item
   * @returns {Promise<T>}
   */
  async create(item) {
    const payload = this._eventId ? { ...item, event_id: this._eventId } : item;
    const { data, error } = await this._supabase
      .from(this._table)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return /** @type {T} */ (data);
  }

  /**
   * Upsert (insert or update) a record.
   * @param {T} item
   * @returns {Promise<T>}
   */
  async upsert(item) {
    const payload = this._eventId ? { ...item, event_id: this._eventId } : item;
    const { data, error } = await this._supabase
      .from(this._table)
      .upsert(payload)
      .select()
      .single();
    if (error) throw error;
    return /** @type {T} */ (data);
  }

  /**
   * Patch a record's fields by id.
   * @param {string} id
   * @param {Partial<T>} patch
   * @returns {Promise<T>}
   */
  async update(id, patch) {
    const { data, error } = await this._supabase
      .from(this._table)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();
    if (error) throw error;
    return /** @type {T} */ (data);
  }

  /**
   * Soft-delete a record (sets deleted_at = NOW()).
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const { error } = await this._supabase
      .from(this._table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  /**
   * Count active records.
   * @returns {Promise<number>}
   */
  async count() {
    const { count, error } = await this._supabase
      .from(this._table)
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .then((res) => {
        if (this._eventId) {
          return this._supabase
            .from(this._table)
            .select("id", { count: "exact", head: true })
            .is("deleted_at", null)
            .eq("event_id", this._eventId);
        }
        return res;
      });
    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Check if a record exists.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    const record = await this.findById(id);
    return record !== null;
  }
}
