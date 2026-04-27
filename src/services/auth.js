/**
 * src/services/auth.js — Authentication service (S0 named-export module)
 *
 * Named-export adapter for Google/Facebook/Apple/Anonymous auth.
 * Handles email allowlist validation and session rotation.
 * No window.* side effects.
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
