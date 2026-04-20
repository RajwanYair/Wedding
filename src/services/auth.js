/**
 * src/services/auth.js — Authentication service (S0 named-export module)
 *
 * Named-export adapter for Google/Facebook/Apple/Anonymous auth.
 * Handles email allowlist validation and session rotation.
 * No window.* side effects.
 */

import { getApprovedAdminEmails } from "../core/app-config.js";
import { save, load } from "../core/state.js";
import { storeGet } from "../core/store.js";

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
 * Load persisted session from localStorage.
 * @returns {AuthUser | null}
 */
export function loadSession() {
  _user = /** @type {any} */ (load(SESSION_KEY, null)) ?? null;
  if (_user && !_user.isAdmin) _user = null; // guest sessions not persisted
  return _user;
}

/**
 * Save user session to localStorage.
 * @param {AuthUser} user
 */
export function saveSession(user) {
  _user = user;
  save(SESSION_KEY, user);
  _onAuthChange?.(user);
}

/**
 * Clear the current session (logout).
 */
export function clearSession() {
  _user = null;
  save(SESSION_KEY, null);
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
  // Rotate: bump loginAt and re-save
  _user = { ..._user, loginAt: Date.now() };
  save(SESSION_KEY, _user);
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
