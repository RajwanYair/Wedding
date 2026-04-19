/**
 * src/services/supabase-auth.js — Supabase Auth integration (Phase 7.3)
 *
 * Implements sign-in via Supabase Auth for Google, Facebook, and Apple OAuth,
 * plus email-link (magic link) and anonymous sessions. When USE_SUPABASE_AUTH
 * is truthy in config, src/services/auth.js delegates here instead of loading
 * the individual provider SDKs at runtime.
 *
 * Zero runtime deps: uses Supabase PostgREST REST API directly (same pattern as
 * supabase.js). No @supabase/supabase-js SDK required.
 *
 * Auth flow:
 *   1. Admin calls signInWithProvider("google"|"facebook"|"apple")
 *   2. Supabase redirects to provider OAuth page, returns JWT on success
 *   3. JWT contains `email` claim; we check against ADMIN_EMAILS allowlist
 *   4. Session stored in localStorage via STORAGE_KEYS.SUPABASE_SESSION
 */

import {
  getApprovedAdminEmails,
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "../core/app-config.js";
import { STORAGE_KEYS } from "../core/constants.js";

// ── Runtime credential resolution ────────────────────────────────────────

function _url() {
  return getSupabaseUrl();
}

function _key() {
  return getSupabaseAnonKey();
}

/** @returns {boolean} */
export function isSupabaseAuthConfigured() {
  return Boolean(_url() && _key());
}

// ── Session management ────────────────────────────────────────────────────

/**
 * @typedef {{
 *   access_token: string,
 *   refresh_token: string,
 *   expires_at: number,
 *   user: { id: string, email: string, [key: string]: unknown }
 * }} SupabaseSession
 */

/** @returns {SupabaseSession | null} */
export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPABASE_SESSION);
    if (!raw) return null;
    const sess = /** @type {SupabaseSession} */ (JSON.parse(raw));
    if (sess.expires_at && Date.now() / 1000 > sess.expires_at - 60) {
      // Token expired (or expiring in 60s) — attempt silent refresh
      _refreshSession(sess.refresh_token).catch(() => clearSession());
    }
    return sess;
  } catch {
    return null;
  }
}

/** @param {SupabaseSession} sess */
function _saveSession(sess) {
  try {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_SESSION, JSON.stringify(sess));
  } catch {}
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_SESSION);
  } catch {}
}

// ── REST helpers ─────────────────────────────────────────────────────────

/**
 * @param {string} path
 * @param {RequestInit} opts
 * @returns {Promise<unknown>}
 */
async function _authRest(path, opts) {
  const base = _url();
  const key = _key();
  if (!base || !key) throw new Error("Supabase not configured");
  const resp = await fetch(`${base}/auth/v1${path}`, {
    ...opts,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "Network error");
    throw new Error(`Supabase Auth ${resp.status}: ${text}`);
  }
  return resp.json().catch(() => null);
}

// ── OAuth sign-in ─────────────────────────────────────────────────────────

/**
 * Initiate OAuth sign-in by redirecting to the Supabase provider URL.
 * The browser will return to `redirectUrl` with the session in the hash.
 *
 * @param {'google'|'facebook'|'apple'} provider
 * @param {string} [redirectUrl]  defaults to current origin
 */
export function signInWithProvider(provider, redirectUrl = `${window.location.origin  }/Wedding/`) {
  const url = _url();
  const key = _key();
  if (!url || !key) {
    console.warn("[supabase-auth] Not configured — cannot sign in via Supabase Auth");
    return;
  }
  const authUrl = `${url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUrl)}`;
  window.location.href = authUrl;
}

// ── Magic link (email) ────────────────────────────────────────────────────

/**
 * Send a magic-link email (passwordless sign-in).
 * @param {string} email
 * @returns {Promise<boolean>} true on success
 */
export async function signInWithMagicLink(email) {
  try {
    await _authRest("/magiclink", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return true;
  } catch (err) {
    console.error("[supabase-auth] Magic link error:", err);
    return false;
  }
}

// ── Anonymous session ─────────────────────────────────────────────────────

/**
 * Sign in anonymously (for guests who haven't authenticated).
 * @returns {Promise<SupabaseSession | null>}
 */
export async function signInAnonymous() {
  try {
    const result = /** @type {SupabaseSession} */ (
      await _authRest("/signup", {
        method: "POST",
        body: JSON.stringify({ email: "", is_anonymous: true }),
      })
    );
    if (result?.access_token) _saveSession(result);
    return result ?? null;
  } catch {
    return null;
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────

/**
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
async function _refreshSession(refreshToken) {
  const result = /** @type {SupabaseSession} */ (
    await _authRest("/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  );
  if (result?.access_token) _saveSession(result);
}

// ── Session callback (OAuth redirect) ────────────────────────────────────

/**
 * Call on app load to detect if we just returned from an OAuth redirect.
 * Extracts `access_token` from the URL hash and persists the session.
 * @returns {SupabaseSession | null}  Parsed session if present, else null
 */
export function handleOAuthRedirect() {
  const hash = window.location.hash;
  if (!hash.includes("access_token")) return null;
  try {
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token") ?? "";
    const expiresIn = parseInt(params.get("expires_in") ?? "3600", 10);
    if (!accessToken) return null;

    // Decode user from JWT payload
    const payload = JSON.parse(atob(accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const sess = /** @type {SupabaseSession} */ ({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      user: {
        id: payload.sub ?? "",
        email: payload.email ?? "",
        name: payload.user_metadata?.name ?? payload.user_metadata?.full_name ?? "",
        picture: payload.user_metadata?.avatar_url ?? "",
        provider: payload.app_metadata?.provider ?? "unknown",
      },
    });
    _saveSession(sess);

    // Clean hash from URL without reload
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    return sess;
  } catch {
    return null;
  }
}

// ── Admin check ───────────────────────────────────────────────────────────

/**
 * Determine if the current session is an admin.
 * Uses the same email allowlist as the existing auth service.
 * @param {SupabaseSession | null} sess
 * @returns {boolean}
 */
export function isAdmin(sess) {
  if (!sess?.user?.email) return false;
  return getApprovedAdminEmails().includes(
    sess.user.email.trim().toLowerCase(),
  );
}
