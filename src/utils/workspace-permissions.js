/**
 * src/utils/workspace-permissions.js — S662 Fine-grained workspace permissions
 *
 * Role-based permission checking for multi-user workspace access.
 * Supports owner / admin / editor / viewer roles with action-level granularity.
 *
 * @module workspace-permissions
 * @owner workspace
 */

/**
 * Role hierarchy (higher index = more privilege).
 * @type {ReadonlyArray<string>}
 */
export const ROLES = Object.freeze(["viewer", "editor", "admin", "owner"]);

/**
 * Actions mapped to minimum required role.
 * @type {Readonly<Record<string, string>>}
 */
export const ACTION_ROLES = Object.freeze({
  // View
  "view:guests": "viewer",
  "view:tables": "viewer",
  "view:vendors": "viewer",
  "view:budget": "viewer",
  "view:analytics": "viewer",
  "view:rsvp": "viewer",
  // Edit
  "edit:guests": "editor",
  "edit:tables": "editor",
  "edit:vendors": "editor",
  "edit:budget": "editor",
  "edit:rsvp": "editor",
  "edit:website": "editor",
  // Admin
  "manage:members": "admin",
  "manage:settings": "admin",
  "manage:integrations": "admin",
  "manage:export": "admin",
  "manage:import": "admin",
  // Owner
  "delete:workspace": "owner",
  "transfer:ownership": "owner",
  "manage:billing": "owner",
});

/**
 * Get the numeric level of a role (higher = more privilege).
 *
 * @param {string} role
 * @returns {number} -1 if unknown
 */
export function roleLevel(role) {
  return ROLES.indexOf(role);
}

/**
 * Check if a user role can perform an action.
 *
 * @param {string} userRole
 * @param {string} action
 * @returns {boolean}
 */
export function canPerform(userRole, action) {
  const required = ACTION_ROLES[action];
  if (!required) return false;
  return roleLevel(userRole) >= roleLevel(required);
}

/**
 * List all actions a role can perform.
 *
 * @param {string} role
 * @returns {string[]}
 */
export function allowedActions(role) {
  const level = roleLevel(role);
  if (level < 0) return [];
  return Object.entries(ACTION_ROLES)
    .filter(([, required]) => level >= roleLevel(required))
    .map(([action]) => action);
}

/**
 * Check if roleA outranks roleB.
 *
 * @param {string} roleA
 * @param {string} roleB
 * @returns {boolean}
 */
export function outranks(roleA, roleB) {
  return roleLevel(roleA) > roleLevel(roleB);
}

/**
 * Determine if a user can change another user's role.
 * Rules: must outrank the target AND the new role.
 *
 * @param {string} actorRole
 * @param {string} targetCurrentRole
 * @param {string} newRole
 * @returns {boolean}
 */
export function canChangeRole(actorRole, targetCurrentRole, newRole) {
  if (roleLevel(actorRole) < 0 || roleLevel(newRole) < 0) return false;
  return outranks(actorRole, targetCurrentRole) && outranks(actorRole, newRole);
}

/**
 * Summarise a member list by role counts.
 *
 * @param {Array<{ role: string }>} members
 * @returns {Record<string, number>}
 */
export function roleSummary(members) {
  if (!Array.isArray(members)) return {};
  /** @type {Record<string, number>} */
  const counts = {};
  for (const { role } of members) {
    counts[role] = (counts[role] ?? 0) + 1;
  }
  return counts;
}

/**
 * Filter members who can perform a specific action.
 *
 * @param {Array<{ id: string, role: string }>} members
 * @param {string} action
 * @returns {Array<{ id: string, role: string }>}
 */
export function membersWhoCanPerform(members, action) {
  if (!Array.isArray(members)) return [];
  return members.filter((m) => canPerform(m.role, action));
}
