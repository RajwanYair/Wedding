/**
 * src/utils/roles.js — Role-based permission model (Sprint 17 / Phase 4)
 *
 * Provides a lightweight RBAC layer on top of the existing isAdmin boolean.
 * Three roles: "guest" (RSVP only), "viewer" (read-only admin), "admin" (full).
 *
 * Usage:
 *   import { ROLES, hasPermission, canAccessSection } from "../utils/roles.js";
 *   if (hasPermission(user?.role, "guest:edit")) { ... }
 */

// ── Role constants ────────────────────────────────────────────────────────

/** All valid role identifiers. */
export const ROLES = /** @type {const} */ ({
  GUEST: "guest",
  VIEWER: "viewer",
  ADMIN: "admin",
});

/** @typedef {"guest" | "viewer" | "admin"} Role */

// ── Permission catalog ────────────────────────────────────────────────────

/**
 * Complete map of role → permission set.
 *
 * Permissions follow "resource:action" naming. Roles inherit lower-tier
 * permissions via the hierarchy GUEST < VIEWER < ADMIN.
 *
 * @type {Readonly<Record<Role, ReadonlySet<string>>>}
 */
export const ROLE_PERMISSIONS = Object.freeze({
  guest: new Set([
    "rsvp:submit",
    "rsvp:view",
    "landing:view",
    "invitation:view",
  ]),

  viewer: new Set([
    // inherits all guest permissions
    "rsvp:submit",
    "rsvp:view",
    "landing:view",
    "invitation:view",
    // read-only admin views
    "guests:view",
    "tables:view",
    "vendors:view",
    "expenses:view",
    "analytics:view",
    "dashboard:view",
    "timeline:view",
    "checkin:view",
    "budget:view",
    "whatsapp:view",
    "communication:view",
    "gallery:view",
    "registry:view",
    "changelog:view",
    "settings:view",
  ]),

  admin: new Set([
    // inherits all viewer permissions
    "rsvp:submit",
    "rsvp:view",
    "landing:view",
    "invitation:view",
    "guests:view",
    "tables:view",
    "vendors:view",
    "expenses:view",
    "analytics:view",
    "dashboard:view",
    "timeline:view",
    "checkin:view",
    "budget:view",
    "whatsapp:view",
    "communication:view",
    "gallery:view",
    "registry:view",
    "changelog:view",
    "settings:view",
    // write permissions (admin-only)
    "guest:edit",
    "guest:delete",
    "guest:import",
    "guest:export",
    "table:edit",
    "table:delete",
    "vendor:edit",
    "vendor:delete",
    "expense:edit",
    "expense:delete",
    "timeline:edit",
    "settings:edit",
    "whatsapp:send",
    "checkin:mark",
    "gallery:manage",
    "contact-collector:manage",
  ]),
});

// ── Permission helpers ────────────────────────────────────────────────────

/**
 * Resolve a raw value to a canonical Role.
 * Falls back to "guest" for unknown/missing values.
 *
 * @param {unknown} rawRole
 * @returns {Role}
 */
export function resolveRole(rawRole) {
  if (rawRole === ROLES.ADMIN) return ROLES.ADMIN;
  if (rawRole === ROLES.VIEWER) return ROLES.VIEWER;
  return ROLES.GUEST;
}

/**
 * Check whether a role has a specific permission.
 *
 * @param {unknown} role  Raw role value (resolved via resolveRole)
 * @param {string} permission  "resource:action" string
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  const r = resolveRole(role);
  return ROLE_PERMISSIONS[r].has(permission);
}

/**
 * Return the effective role for an auth user object.
 * Convenience: maps isAdmin → "admin", otherwise "guest".
 *
 * @param {{ isAdmin?: boolean, role?: unknown } | null | undefined} user
 * @returns {Role}
 */
export function getRoleFromUser(user) {
  if (!user) return ROLES.GUEST;
  if (user.role != null) return resolveRole(user.role);
  return user.isAdmin ? ROLES.ADMIN : ROLES.GUEST;
}

/**
 * Derive all sections accessible to a given role.
 *
 * @param {unknown} role
 * @returns {string[]}  Section names the role can at minimum view
 */
export function getAccessibleSections(role) {
  const r = resolveRole(role);
  const perms = ROLE_PERMISSIONS[r];
  return [...perms]
    .filter((p) => p.endsWith(":view"))
    .map((p) => p.replace(/:view$/, ""));
}

/**
 * Check whether a given role may view or interact with a named section.
 *
 * @param {string} sectionName  e.g. "guests", "rsvp"
 * @param {unknown} role
 * @returns {boolean}
 */
export function canAccessSection(sectionName, role) {
  return hasPermission(role, `${sectionName}:view`);
}
