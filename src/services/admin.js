/**
 * admin.js — Async admin allowlist helper (S83).
 *
 * Forward-compatible API for the v13 backend flip from Google Sheets to
 * Supabase. Today the active backend is "sheets", so the synchronous
 * `isApprovedAdmin()` in src/services/auth.js (static + localStorage list)
 * is still the source of truth.
 *
 * When `BACKEND_TYPE === "supabase"` and the `admin_users` table (created
 * by migration 023) is reachable, callers can `await isApprovedAdminAsync()`
 * to consult the server-side list. Falls back transparently to the
 * synchronous check on any failure.
 */

import { isApprovedAdmin } from "./auth.js";
import { BACKEND_TYPE } from "../core/config.js";

/**
 * Async admin check. Server-truth when on Supabase; sync fallback otherwise.
 *
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function isApprovedAdminAsync(email) {
  if (!email) return false;
  // Sync path covers all current deployments (BACKEND_TYPE === "sheets").
  const sync = isApprovedAdmin(email);
  if (BACKEND_TYPE !== "supabase") return sync;

  try {
    const { getSupabase } = await import("./supabase.js");
    const supabase = getSupabase?.();
    if (!supabase) return sync;
    const { data, error } = await supabase
      .from("admin_users")
      .select("email")
      .ilike("email", email.trim())
      .limit(1)
      .maybeSingle();
    if (error) return sync;
    return Boolean(data) || sync;
  } catch {
    return sync;
  }
}
