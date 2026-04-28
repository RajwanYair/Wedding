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
import { load, save } from "../utils/misc.js";

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

// ── S168 — Admin CRUD ──────────────────────────────────────────────────────

/**
 * List all admin emails (Supabase table + localStorage merged, deduplicated).
 * @returns {Promise<string[]>}
 */
export async function fetchAdminUsers() {
  const local = /** @type {string[]} */ (load("approvedEmails", []));
  const localNorm = local.map((e) => e.trim().toLowerCase()).filter(Boolean);

  if (BACKEND_TYPE !== "supabase") return localNorm;

  try {
    const { getSupabase } = await import("./supabase.js");
    const supabase = getSupabase?.();
    if (!supabase) return localNorm;
    const { data, error } = await supabase
      .from("admin_users")
      .select("email")
      .order("created_at", { ascending: true });
    if (error || !Array.isArray(data)) return localNorm;
    const remote = data.map((r) => String(r.email).trim().toLowerCase()).filter(Boolean);
    return [...new Set([...remote, ...localNorm])];
  } catch {
    return localNorm;
  }
}

/**
 * Add an email to the admin allowlist.
 * Persists to Supabase admin_users when available; always writes to localStorage.
 * @param {string} email
 * @param {string} [addedBy]
 * @returns {Promise<boolean>}  true on success
 */
export async function addAdminUser(email, addedBy = "") {
  const norm = email.trim().toLowerCase();
  if (!norm || !norm.includes("@")) return false;

  // Always write to localStorage
  const list = /** @type {string[]} */ (load("approvedEmails", []));
  if (!list.map((e) => e.trim().toLowerCase()).includes(norm)) {
    list.push(norm);
    save("approvedEmails", list);
  }

  if (BACKEND_TYPE !== "supabase") return true;

  try {
    const { getSupabase } = await import("./supabase.js");
    const supabase = getSupabase?.();
    if (!supabase) return true;
    const { error } = await supabase
      .from("admin_users")
      .upsert({ email: norm, added_by: addedBy }, { onConflict: "email" });
    return !error;
  } catch {
    return true; // localStorage write already succeeded
  }
}

/**
 * Remove an email from the admin allowlist.
 * Deletes from Supabase admin_users when available; always removes from localStorage.
 * @param {string} email
 * @returns {Promise<boolean>}  true on success
 */
export async function removeAdminUser(email) {
  const norm = email.trim().toLowerCase();
  if (!norm) return false;

  // Always remove from localStorage
  const list = /** @type {string[]} */ (load("approvedEmails", []));
  const updated = list.filter((e) => e.trim().toLowerCase() !== norm);
  save("approvedEmails", updated);

  if (BACKEND_TYPE !== "supabase") return true;

  try {
    const { getSupabase } = await import("./supabase.js");
    const supabase = getSupabase?.();
    if (!supabase) return true;
    const { error } = await supabase
      .from("admin_users")
      .delete()
      .ilike("email", norm);
    return !error;
  } catch {
    return true; // localStorage removal already succeeded
  }
}
