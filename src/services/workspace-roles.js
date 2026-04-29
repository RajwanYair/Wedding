/**
 * src/services/workspace-roles.js — S132 org / team / planner roles.
 *
 * Pure RBAC helpers for the planner-mode workspace (Phase D3). No
 * persistence, no DOM. The data layer is expected to materialise these
 * as Supabase rows with RLS once the backend flip lands.
 */

/** @typedef {"owner"|"co_planner"|"vendor"|"photographer"|"guest"} WorkspaceRole */

/** @typedef {"read"|"write"|"approve"|"invite"|"billing"} Permission */

/** Static role → permission map. */
const ROLE_PERMS = Object.freeze({
  owner:        ["read", "write", "approve", "invite", "billing"],
  co_planner:   ["read", "write", "approve", "invite"],
  vendor:       ["read", "write"],
  photographer: ["read"],
  guest:        ["read"],
});

const ROLE_RANK = Object.freeze({
  owner: 5,
  co_planner: 4,
  vendor: 3,
  photographer: 2,
  guest: 1,
});

/** All known roles (frozen array). */
export const WORKSPACE_ROLES = Object.freeze(Object.keys(ROLE_PERMS));

/** Returns true iff the role grants the permission. */
export function hasPermission(/** @type {WorkspaceRole} */ role, /** @type {Permission} */ perm) {
  const list = ROLE_PERMS[role];
  if (!list) return false;
  return list.includes(perm);
}

/** Compare two roles. Returns -1 / 0 / 1 by rank. */
export function compareRoles(/** @type {WorkspaceRole} */ a, /** @type {WorkspaceRole} */ b) {
  const ra = ROLE_RANK[a] ?? 0;
  const rb = ROLE_RANK[b] ?? 0;
  if (ra > rb) return 1;
  if (ra < rb) return -1;
  return 0;
}

/** Returns true iff `actor` may change `target`'s role to `nextRole`. */
export function canAssignRole(/** @type {WorkspaceRole} */ actorRole, /** @type {WorkspaceRole} */ targetRole, /** @type {WorkspaceRole} */ nextRole) {
  if (!hasPermission(actorRole, "invite")) return false;
  // Cannot promote anyone to a higher rank than yourself.
  if (compareRoles(nextRole, actorRole) > 0) return false;
  // Cannot demote/replace someone of equal-or-higher rank than yourself
  // unless you are the owner.
  if (actorRole !== "owner" && compareRoles(targetRole, actorRole) >= 0) {
    return false;
  }
  return true;
}

/** Filter a permission list to only those granted by the role. */
export function filterByRole(/** @type {WorkspaceRole} */ role, /** @type {Permission[]} */ perms) {
  return (perms ?? []).filter((/** @type {Permission} */ p) => hasPermission(role, p));
}

/** Default member entry shape for new invites. */
export function newMember({ email = /** @type {string} */ (""), role = /** @type {WorkspaceRole} */ ("guest"), invitedBy = "" }) {
  if (typeof email !== "string" || !email.includes("@")) {
    throw new Error("invalid_email");
  }
  if (!ROLE_PERMS[role]) throw new Error("invalid_role");
  return {
    email: email.trim().toLowerCase(),
    role,
    invitedBy,
    invitedAt: new Date().toISOString(),
    status: "pending",
  };
}
