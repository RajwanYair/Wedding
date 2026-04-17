/**
 * src/repositories/supabase-rsvp-log-repository.js — RSVP audit log repository (Sprint 77)
 *
 * Writes immutable RSVP change events to the `rsvp_log` table.
 * Unlike other repositories, log rows are never soft-deleted.
 */

/** @typedef {import("@supabase/supabase-js").SupabaseClient} SupabaseClient */

export class SupabaseRsvpLogRepository {
  /**
   * @param {SupabaseClient} supabase
   */
  constructor(supabase) {
    this._supabase = supabase;
  }

  /**
   * Insert one RSVP change event.
   * @param {string} guestId
   * @param {string|null} fromStatus  Previous status (null for new guest)
   * @param {string} toStatus
   * @param {string} [source]  "web"|"admin"|"import"
   * @param {string} [eventId]
   * @returns {Promise<Record<string, unknown>>}
   */
  async logRsvp(guestId, fromStatus, toStatus, source = "web", eventId = "default") {
    const { data, error } = await this._supabase
      .from("rsvp_log")
      .insert({
        guest_id:   guestId,
        from_status: fromStatus ?? null,
        to_status:  toStatus,
        source,
        event_id:   eventId,
        logged_at:  new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * All log entries for a guest, newest first.
   * @param {string} guestId
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findByGuest(guestId) {
    const { data, error } = await this._supabase
      .from("rsvp_log")
      .select("*")
      .eq("guest_id", guestId)
      .order("logged_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  /**
   * Most recent N entries across all guests.
   * @param {number} [limit=50]
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findRecent(limit = 50) {
    const { data, error } = await this._supabase
      .from("rsvp_log")
      .select("*")
      .order("logged_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  }

  /**
   * All log entries scoped to an event.
   * @param {string} eventId
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async findByEvent(eventId) {
    const { data, error } = await this._supabase
      .from("rsvp_log")
      .select("*")
      .eq("event_id", eventId)
      .order("logged_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
}
