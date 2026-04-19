/**
 * src/core/supabase-client.js — Lazy Supabase SDK client singleton (S17)
 *
 * Provides a single `createClient()` instance shared across all services.
 * Returns `null` when `SUPABASE_URL` or `SUPABASE_ANON_KEY` are empty
 * (dev/offline mode — all callers must handle null gracefully).
 *
 * Auth persistence is handled by Supabase's own session storage.
 * Realtime is configured with 10 events/second rate-limit to stay on free tier.
 */

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { load } from "./state.js";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let _client = null;

// ── Runtime credential resolution ─────────────────────────────────────────

/** @returns {string} */
function _url() {
  const stored = /** @type {string} */ (load("supabaseUrl", "") ?? "");
  return stored.trim() || SUPABASE_URL || "";
}

/** @returns {string} */
function _key() {
  const stored = /** @type {string} */ (load("supabaseAnonKey", "") ?? "");
  return stored.trim() || SUPABASE_ANON_KEY || "";
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Whether the Supabase client can be created (credentials present).
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return Boolean(_url() && _key());
}

/**
 * Get (or lazily create) the Supabase SDK client.
 * Returns `null` if `SUPABASE_URL` / `SUPABASE_ANON_KEY` are not set.
 *
 * @returns {import("@supabase/supabase-js").SupabaseClient | null}
 */
export function getSupabaseClient() {
  const url = _url();
  const key = _key();
  if (!url || !key) return null;

  if (!_client) {
    _client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "wedding_v1_supabase_auth",
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      db: { schema: "public" },
      global: {
        headers: { "x-app-version": /** @type {string} */ (SUPABASE_URL ? "wedding-manager" : "") },
      },
    });
  }

  return _client;
}

/**
 * Tear down the current client singleton.
 * Call when credentials change at runtime (e.g. settings page save).
 * @returns {Promise<void>}
 */
export async function resetSupabaseClient() {
  if (_client) {
    try {
      await _client.realtime.disconnect();
    } catch {
      // ignore disconnect errors
    }
    _client = null;
  }
}
