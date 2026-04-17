/**
 * src/services/auth-claims.js — JWT claim helpers (Sprint 81)
 *
 * Reads claims from the Supabase session JWT without a network call.
 * All helpers are pure functions of a `session` object so they can be
 * tested without a live Supabase client.
 */

/**
 * @typedef {{ access_token?: string }} Session
 * @typedef {Record<string, unknown>} ClaimsMap
 */

/**
 * Decode the payload of a JWT (base64url → JSON).
 * Returns an empty object on any parse error — never throws.
 * @param {string} token
 * @returns {ClaimsMap}
 */
export function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return {};
    // base64url → base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
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
 * Check whether the session carries a specific role (in the `role` claim
 * or inside an array `app_roles` claim).
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
 * Check whether the authenticated user owns the given event (via `event_id` claim).
 * @param {Session | null | undefined} session
 * @param {string} eventId
 * @returns {boolean}
 */
export function isEventOwner(session, eventId) {
  const claims = getClaims(session);
  return claims.event_id === eventId;
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
