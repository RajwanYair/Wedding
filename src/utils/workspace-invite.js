/**
 * src/utils/workspace-invite.js — S626 Workspace invitation helpers
 *
 * Pure helpers for inviting users to a wedding workspace. Generates
 * invite tokens, validates email/phone invites, tracks invite status,
 * and manages the invite lifecycle (pending → accepted | expired).
 *
 * @module workspace-invite
 * @owner platform
 */

/**
 * @typedef {object} WorkspaceInvite
 * @property {string}  id
 * @property {string}  workspaceId
 * @property {string}  email
 * @property {string}  role       // "co-planner" | "vendor" | "photographer" | "guest"
 * @property {"pending"|"accepted"|"expired"|"revoked"} status
 * @property {string}  invitedBy  // user ID of inviter
 * @property {string}  createdAt  // ISO timestamp
 * @property {string=} expiresAt  // ISO timestamp
 * @property {string=} acceptedAt // ISO timestamp
 */

/** Valid invite statuses. */
export const INVITE_STATUSES = /** @type {const} */ (["pending", "accepted", "expired", "revoked"]);

/** Roles that can be invited (owner cannot be invited). */
export const INVITABLE_ROLES = /** @type {const} */ ([
  "co-planner",
  "vendor",
  "photographer",
  "guest",
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an invite request.
 *
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.role
 * @param {string} params.workspaceId
 * @returns {string[]} — array of error strings (empty = valid)
 */
export function validateInvite({ email, role, workspaceId }) {
  const errors = [];
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    errors.push("valid email is required");
  }
  if (!INVITABLE_ROLES.includes(/** @type {any} */ (role))) {
    errors.push(`invalid role: ${String(role)}`);
  }
  if (typeof workspaceId !== "string" || workspaceId.trim() === "") {
    errors.push("workspaceId is required");
  }
  return errors;
}

/**
 * Create a new pending invite.
 *
 * @param {object} params
 * @param {string} params.workspaceId
 * @param {string} params.email
 * @param {string} params.role
 * @param {string} params.invitedBy
 * @param {number} [params.expiryDays] - days until expiry (default 7)
 * @returns {{ ok: boolean, invite?: WorkspaceInvite, errors?: string[] }}
 */
export function createInvite({ workspaceId, email, role, invitedBy, expiryDays = 7 }) {
  const errors = validateInvite({ email, role, workspaceId });
  if (!invitedBy) errors.push("invitedBy is required");
  if (errors.length > 0) return { ok: false, errors };

  const now = new Date();
  const expires = new Date(now.getTime() + expiryDays * 86_400_000);
  return {
    ok: true,
    invite: {
      id: `inv_${Date.now().toString(36)}`,
      workspaceId,
      email: email.trim().toLowerCase(),
      role,
      status: "pending",
      invitedBy,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    },
  };
}

/**
 * Accept a pending invite.
 *
 * @param {WorkspaceInvite} invite
 * @param {string} [refDate] - reference date for expiry check
 * @returns {{ ok: boolean, invite?: WorkspaceInvite, error?: string }}
 */
export function acceptInvite(invite, refDate) {
  if (!invite || invite.status !== "pending") {
    return { ok: false, error: "only pending invites can be accepted" };
  }
  if (invite.expiresAt) {
    const ref = refDate ?? new Date().toISOString();
    if (invite.expiresAt < ref) {
      return { ok: false, error: "invite has expired" };
    }
  }
  return {
    ok: true,
    invite: {
      ...invite,
      status: "accepted",
      acceptedAt: new Date().toISOString(),
    },
  };
}

/**
 * Revoke a pending invite.
 *
 * @param {WorkspaceInvite} invite
 * @returns {{ ok: boolean, invite?: WorkspaceInvite, error?: string }}
 */
export function revokeInvite(invite) {
  if (!invite || invite.status !== "pending") {
    return { ok: false, error: "only pending invites can be revoked" };
  }
  return { ok: true, invite: { ...invite, status: "revoked" } };
}

/**
 * Check if there's already a pending invite for this email+workspace.
 *
 * @param {readonly WorkspaceInvite[]} invites
 * @param {string} email
 * @param {string} workspaceId
 * @returns {boolean}
 */
export function hasPendingInvite(invites, email, workspaceId) {
  if (!Array.isArray(invites)) return false;
  const target = typeof email === "string" ? email.trim().toLowerCase() : "";
  return invites.some(
    (i) => i.email === target && i.workspaceId === workspaceId && i.status === "pending",
  );
}

/**
 * Get invite statistics for a workspace.
 *
 * @param {readonly WorkspaceInvite[]} invites
 * @param {string} workspaceId
 * @returns {{ total: number, pending: number, accepted: number, expired: number, revoked: number }}
 */
export function inviteStats(invites, workspaceId) {
  const stats = { total: 0, pending: 0, accepted: 0, expired: 0, revoked: 0 };
  if (!Array.isArray(invites)) return stats;
  for (const i of invites) {
    if (i.workspaceId !== workspaceId) continue;
    stats.total++;
    if (i.status === "pending") stats.pending++;
    else if (i.status === "accepted") stats.accepted++;
    else if (i.status === "expired") stats.expired++;
    else if (i.status === "revoked") stats.revoked++;
  }
  return stats;
}
