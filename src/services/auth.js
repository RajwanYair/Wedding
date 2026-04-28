/**
 * src/services/auth.js — Unified auth service (S194)
 *
 * Merged from:
 *   - auth.js             (S0)  — session management + email allowlist
 *   - auth-claims.js      (S81) — JWT claim helpers
 *   - oauth-providers.js  (S94) — OAuth provider abstraction
 */

import { getApprovedAdminEmails } from "../core/app-config.js";
import { load, remove } from "../core/state.js";
import { storeGet } from "../core/store.js";
import { setSecure, getSecure, removeSecure } from "./secure-storage.js";

const SESSION_KEY = "auth_user";
const SESSION_ROTATION_MS = 2 * 60 * 60 * 1000; // 2 hours

/** @typedef {{ uid: string, email: string, name: string, picture: string, provider: string, isAdmin: boolean, loginAt: number }} AuthUser */

/** @type {AuthUser | null} */
let _user = null;

/** @type {((user: AuthUser | null) => void) | null} */
let _onAuthChange = null;

/**
 * Register an auth-change listener.
 * @param {(user: AuthUser | null) => void} fn
 */
export function onAuthChange(fn) {
  _onAuthChange = fn;
}

/**
 * Load persisted session. Tries encrypted storage first (AES-GCM); falls
 * back to legacy plaintext for E2E-seeded sessions and first-boot migration.
 * On a successful plaintext read the value is immediately re-encrypted and
 * the plaintext entry is deleted (one-shot upgrade path).
 * @returns {Promise<AuthUser | null>}
 */
export async function loadSession() {
  // 1. Try encrypted store (normal path after first encrypted save).
  const secure = /** @type {AuthUser | null} */ (await getSecure(SESSION_KEY).catch(() => null));
  if (secure?.isAdmin) {
    _user = secure;
    return _user;
  }
  // 2. Plaintext fallback (E2E seeds / first-boot migration).
  const legacy = /** @type {AuthUser | null} */ (load(SESSION_KEY, null) ?? null);
  if (legacy?.isAdmin) {
    _user = legacy;
    // Upgrade: write encrypted, erase plaintext (fire-and-forget, errors silenced).
    setSecure(SESSION_KEY, legacy).catch(() => {});
    remove(SESSION_KEY);
    return _user;
  }
  return null;
}

/**
 * Save user session using AES-GCM encrypted storage (ROADMAP A3, OWASP A02).
 * The plaintext key is removed so no raw email/token remains in localStorage.
 * @param {AuthUser} user
 */
export function saveSession(user) {
  _user = user;
  // Write encrypted (async, errors silenced — in-memory _user is source of truth).
  setSecure(SESSION_KEY, user).catch(() => {});
  // Erase any legacy plaintext entry.
  remove(SESSION_KEY);
  _onAuthChange?.(user);
}

/**
 * Clear the current session (logout). Removes both encrypted and legacy entries.
 */
export function clearSession() {
  _user = null;
  removeSecure(SESSION_KEY);
  remove(SESSION_KEY);
  _onAuthChange?.(null);
}

/**
 * Return the currently authenticated user.
 * @returns {AuthUser | null}
 */
export function currentUser() {
  return _user;
}

/**
 * Check if an email is in the admin allowlist.
 * @param {string} email
 * @returns {boolean}
 */
export function isApprovedAdmin(email) {
  if (!email) return false;
  const norm = email.trim().toLowerCase();
  const merged = getApprovedAdminEmails();
  if (merged.includes(norm)) return true;
  const runtime = /** @type {string[]} */ (
    storeGet("approvedEmails") ?? load("approvedEmails", []) ?? []
  );
  return runtime.map((entry) => entry.trim().toLowerCase()).includes(norm);
}

/**
 * Handle successful OAuth login. Creates and saves admin session if approved.
 * @param {string} email
 * @param {string} name
 * @param {string} picture
 * @param {string} provider
 * @returns {AuthUser | null}  null if email not approved
 */
export function loginOAuth(email, name, picture, provider) {
  if (!isApprovedAdmin(email)) return null;
  const user = /** @type {AuthUser} */ ({
    uid: btoa(email),
    email,
    name,
    picture,
    provider,
    isAdmin: true,
    loginAt: Date.now(),
  });
  saveSession(user);
  return user;
}

/**
 * Enter as anonymous guest (RSVP-only, not persisted).
 * @returns {AuthUser}
 */
export function loginAnonymous() {
  const user = /** @type {AuthUser} */ ({
    uid: `anon_${Date.now().toString(36)}`,
    email: "",
    name: "Guest",
    picture: "",
    provider: "anonymous",
    isAdmin: false,
    loginAt: Date.now(),
  });
  _user = user;
  _onAuthChange?.(user);
  return user;
}

/**
 * Check if the session should be rotated and rotate if needed.
 * Call this from a setInterval (every 15 min) after admin login.
 * @returns {boolean}  true if rotation occurred
 */
export function maybeRotateSession() {
  if (!_user?.isAdmin) return false;
  if (Date.now() - _user.loginAt < SESSION_ROTATION_MS) return false;
  // Rotate: bump loginAt and re-save (encrypted).
  _user = { ..._user, loginAt: Date.now() };
  setSecure(SESSION_KEY, _user).catch(() => {});
  remove(SESSION_KEY);
  return true;
}

/**
 * Check whether the current admin session has expired (> SESSION_ROTATION_MS old).
 * @returns {boolean}  true if admin is logged in but session has expired
 */
export function isSessionExpired() {
  if (!_user?.isAdmin) return false;
  return Date.now() - _user.loginAt >= SESSION_ROTATION_MS;
}

// ── JWT claim helpers (merged from auth-claims.js, S81) ───────────────────

/**
 * @typedef {{ access_token?: string }} Session
 * @typedef {Record<string, unknown>} ClaimsMap
 */

/**
 * Decode the payload of a JWT without a network call.
 * @param {string} token
 * @returns {ClaimsMap}
 */
export function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return {};
    const b64 = (parts[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    return JSON.parse(json);
  } catch {
    return {};
  }
}

/**
 * Extract all claims from a Supabase session's access token.
 * @param {Session | null | undefined} session
 * @returns {ClaimsMap}
 */
export function getClaims(session) {
  if (!session?.access_token) return {};
  return decodeJwtPayload(session.access_token);
}

/**
 * Read a single claim by name.
 * @param {Session | null | undefined} session
 * @param {string} name
 * @returns {unknown}
 */
export function getClaim(session, name) {
  return getClaims(session)[name];
}

/**
 * Check whether the session carries a specific role.
 * @param {Session | null | undefined} session
 * @param {string} role
 * @returns {boolean}
 */
export function hasRole(session, role) {
  const claims = getClaims(session);
  if (claims.role === role) return true;
  const roles = claims.app_roles;
  if (Array.isArray(roles)) return roles.includes(role);
  return false;
}

/**
 * Check whether the authenticated user owns the given event.
 * @param {Session | null | undefined} session
 * @param {string} eventId
 * @returns {boolean}
 */
export function isEventOwner(session, eventId) {
  return getClaims(session).event_id === eventId;
}

/**
 * Check whether the JWT is expired.
 * @param {Session | null | undefined} session
 * @returns {boolean}
 */
export function isTokenExpired(session) {
  const exp = getClaim(session, "exp");
  if (typeof exp !== "number") return true;
  return Date.now() / 1000 > exp;
}

/**
 * Read the `sub` (subject / user ID) claim.
 * @param {Session | null | undefined} session
 * @returns {string | undefined}
 */
export function getUserId(session) {
  const sub = getClaim(session, "sub");
  return typeof sub === "string" ? sub : undefined;
}

// ── OAuth provider abstraction (merged from oauth-providers.js, S94) ──────

/** @typedef {'google' | 'facebook' | 'apple'} OAuthProvider */

/**
 * @typedef {object} OAuthProfile
 * @property {string} email
 * @property {string} name
 * @property {string} [picture]
 * @property {OAuthProvider} provider
 */

/**
 * Returns the loaded SDK detection result for diagnostics.
 * @returns {{ google: boolean, apple: boolean, facebook: boolean }}
 */
export function detectInstalledSdks() {
  /** @type {any} */
  const w = typeof window === "undefined" ? {} : window;
  return {
    google: typeof w.google?.accounts?.id?.prompt === "function",
    apple: typeof w.AppleID?.auth?.signIn === "function",
    facebook: false,
  };
}

/**
 * Determine which transport will be used for `provider`.
 * @param {OAuthProvider} provider
 * @returns {"sdk" | "supabase"}
 */
export function preferredTransport(provider) {
  if (provider === "facebook") return "supabase";
  const sdks = detectInstalledSdks();
  if (provider === "google") return sdks.google ? "sdk" : "supabase";
  if (provider === "apple") return sdks.apple ? "sdk" : "supabase";
  return "supabase";
}

/**
 * Initiate the OAuth flow for `provider`.
 * @param {OAuthProvider} provider
 * @returns {Promise<OAuthProfile | null>}
 */
export async function signInWith(provider) {
  const transport = preferredTransport(provider);
  if (transport === "supabase") {
    const { signInWithProvider } = await import("./supabase-auth.js");
    signInWithProvider(provider);
    return null;
  }
  /** @type {any} */
  const w = window;
  if (provider === "apple") {
    const resp = await w.AppleID.auth.signIn();
    const email = resp?.user?.email ?? "";
    const name = `${resp?.user?.name?.firstName ?? ""} ${resp?.user?.name?.lastName ?? ""}`.trim();
    return { email, name, provider };
  }
  if (provider === "google") {
    return new Promise((resolve, reject) => {
      try {
        w.google.accounts.id.prompt((/** @type {any} */ notification) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            resolve(null);
          }
        });
        resolve(null);
      } catch (err) {
        reject(err);
      }
    });
  }
  return null;
}
