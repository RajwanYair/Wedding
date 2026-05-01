/**
 * src/utils/workspace-roles.js — S601 Workspace roles + permissions
 *
 * Pure helpers for the upcoming multi-user workspace UI. Defines the
 * role hierarchy and the permission matrix used to gate UI actions.
 *
 * @owner platform
 */

const ROLES = /** @type {const} */ (["owner", "co-planner", "vendor", "photographer", "guest"]);

/** @typedef {(typeof ROLES)[number]} WorkspaceRole */

const ACTIONS = /** @type {const} */ ([
  "guests:read",
  "guests:write",
  "tables:read",
  "tables:write",
  "vendors:read",
  "vendors:write",
  "expenses:read",
  "expenses:write",
  "rsvp:submit",
  "settings:read",
  "settings:write",
  "members:invite",
  "members:remove",
  "checkin:scan",
  "media:upload",
]);

/** @typedef {(typeof ACTIONS)[number]} WorkspaceAction */

/** @type {Readonly<Record<WorkspaceRole, ReadonlySet<WorkspaceAction>>>} */
const MATRIX = Object.freeze({
  owner: new Set(ACTIONS),
  "co-planner": new Set(/** @type {WorkspaceAction[]} */ ([
    "guests:read", "guests:write",
    "tables:read", "tables:write",
    "vendors:read", "vendors:write",
    "expenses:read", "expenses:write",
    "rsvp:submit",
    "settings:read",
    "members:invite",
    "checkin:scan",
    "media:upload",
  ])),
  vendor: new Set(/** @type {WorkspaceAction[]} */ ([
    "vendors:read",
    "expenses:read",
    "settings:read",
    "media:upload",
  ])),
  photographer: new Set(/** @type {WorkspaceAction[]} */ ([
    "guests:read",
    "tables:read",
    "settings:read",
    "media:upload",
  ])),
  guest: new Set(/** @type {WorkspaceAction[]} */ ([
    "rsvp:submit",
  ])),
});

/** @returns {readonly WorkspaceRole[]} */
export function listRoles() {
  return ROLES;
}

/** @returns {readonly WorkspaceAction[]} */
export function listActions() {
  return ACTIONS;
}

/**
 * Hierarchy rank — higher = more privileged. Useful for "promote to"
 * UI: a user with rank N may only assign roles with rank ≤ N.
 *
 * @param {WorkspaceRole} role
 * @returns {number}
 */
export function roleRank(role) {
  const i = ROLES.indexOf(role);
  if (i === -1) return -1;
  return ROLES.length - 1 - i;
}

/**
 * Check whether a role is allowed to perform an action.
 * @param {WorkspaceRole} role
 * @param {WorkspaceAction} action
 * @returns {boolean}
 */
export function canPerform(role, action) {
  const set = MATRIX[role];
  return Boolean(set && set.has(action));
}

/**
 * @param {WorkspaceRole} actor
 * @param {WorkspaceRole} target
 * @returns {boolean}  whether `actor` may assign `target` to someone
 */
export function canAssignRole(actor, target) {
  if (!ROLES.includes(actor) || !ROLES.includes(target)) return false;
  if (!canPerform(actor, "members:invite")) return false;
  return roleRank(actor) >= roleRank(target);
}
