/**
 * src/utils/workspace-members.js — S634 Workspace member CRUD
 *
 * Pure helpers for managing workspace members — adding, removing,
 * role changes, and member listing. Builds on workspace-ui-roles.js
 * (permission matrix) and workspace-invite.js (invite lifecycle).
 *
 * @module workspace-members
 * @owner platform
 */

import { canPerform } from "./workspace-ui-roles.js";

/**
 * @typedef {import('./workspace-ui-roles.js').WorkspaceRole} WorkspaceRole
 */

/**
 * @typedef {object} WorkspaceMember
 * @property {string}  userId
 * @property {string}  email
 * @property {string}  displayName
 * @property {WorkspaceRole} role
 * @property {string}  joinedAt    // ISO timestamp
 * @property {"active"|"suspended"} status
 */

/**
 * Add a member to a workspace member list. Rejects duplicates.
 *
 * @param {WorkspaceMember[]} members
 * @param {{ userId: string, email: string, displayName: string, role: WorkspaceRole }} data
 * @returns {{ ok: boolean, members?: WorkspaceMember[], error?: string }}
 */
export function addMember(members, data) {
  if (!Array.isArray(members)) return { ok: false, error: "members must be an array" };
  if (!data?.userId) return { ok: false, error: "userId is required" };
  if (!data.email) return { ok: false, error: "email is required" };
  if (members.some((m) => m.userId === data.userId)) {
    return { ok: false, error: "member already exists" };
  }
  const newMember = {
    userId: data.userId,
    email: data.email.trim().toLowerCase(),
    displayName: data.displayName || data.email,
    role: data.role || "guest",
    joinedAt: new Date().toISOString(),
    status: /** @type {const} */ ("active"),
  };
  return { ok: true, members: [...members, newMember] };
}

/**
 * Remove a member by userId. Cannot remove the last owner.
 *
 * @param {WorkspaceMember[]} members
 * @param {string} userId
 * @returns {{ ok: boolean, members?: WorkspaceMember[], error?: string }}
 */
export function removeMember(members, userId) {
  if (!Array.isArray(members)) return { ok: false, error: "members must be an array" };
  const target = members.find((m) => m.userId === userId);
  if (!target) return { ok: false, error: "member not found" };
  if (target.role === "owner") {
    const ownerCount = members.filter((m) => m.role === "owner" && m.status === "active").length;
    if (ownerCount <= 1) return { ok: false, error: "cannot remove the last owner" };
  }
  return { ok: true, members: members.filter((m) => m.userId !== userId) };
}

/**
 * Change a member's role. Cannot demote the last owner.
 *
 * @param {WorkspaceMember[]} members
 * @param {string} userId
 * @param {WorkspaceRole} newRole
 * @returns {{ ok: boolean, members?: WorkspaceMember[], error?: string }}
 */
export function changeRole(members, userId, newRole) {
  if (!Array.isArray(members)) return { ok: false, error: "members must be an array" };
  const idx = members.findIndex((m) => m.userId === userId);
  if (idx === -1) return { ok: false, error: "member not found" };
  const current = members[idx];
  if (current.role === "owner" && newRole !== "owner") {
    const ownerCount = members.filter((m) => m.role === "owner" && m.status === "active").length;
    if (ownerCount <= 1) return { ok: false, error: "cannot demote the last owner" };
  }
  const updated = [...members];
  updated[idx] = { ...current, role: newRole };
  return { ok: true, members: updated };
}

/**
 * Suspend or reactivate a member.
 *
 * @param {WorkspaceMember[]} members
 * @param {string} userId
 * @param {"active"|"suspended"} status
 * @returns {{ ok: boolean, members?: WorkspaceMember[], error?: string }}
 */
export function setMemberStatus(members, userId, status) {
  if (!Array.isArray(members)) return { ok: false, error: "members must be an array" };
  const idx = members.findIndex((m) => m.userId === userId);
  if (idx === -1) return { ok: false, error: "member not found" };
  if (members[idx].role === "owner" && status === "suspended") {
    const activeOwners = members.filter((m) => m.role === "owner" && m.status === "active").length;
    if (activeOwners <= 1) return { ok: false, error: "cannot suspend the last active owner" };
  }
  const updated = [...members];
  updated[idx] = { ...updated[idx], status };
  return { ok: true, members: updated };
}

/**
 * Check whether a user can perform a given action based on their role.
 *
 * @param {WorkspaceMember[]} members
 * @param {string} userId
 * @param {string} action
 * @returns {boolean}
 */
export function memberCanPerform(members, userId, action) {
  if (!Array.isArray(members)) return false;
  const member = members.find((m) => m.userId === userId && m.status === "active");
  if (!member) return false;
  return canPerform(member.role, /** @type {any} */ (action));
}

/**
 * Get member statistics for a workspace.
 *
 * @param {WorkspaceMember[]} members
 * @returns {{ total: number, active: number, suspended: number, byRole: Record<string, number> }}
 */
export function memberStats(members) {
  const stats = { total: 0, active: 0, suspended: 0, byRole: /** @type {Record<string, number>} */ ({}) };
  if (!Array.isArray(members)) return stats;
  for (const m of members) {
    stats.total++;
    if (m.status === "active") stats.active++;
    else stats.suspended++;
    stats.byRole[m.role] = (stats.byRole[m.role] ?? 0) + 1;
  }
  return stats;
}
