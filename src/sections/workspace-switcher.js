/**
 * src/sections/workspace-switcher.js — S140 workspace switcher + role badges.
 *
 * Renders a workspace dropdown in the nav area showing the current workspace
 * name and user role badge. Consumes workspace-roles.js (S132) for RBAC.
 */

import { storeGet, storeSet } from "../core/store.js";
import { t } from "../core/i18n.js";
import { hasPermission } from "../services/workspace.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import {
  canPerform as _uiCanPerform,
  canAssignRole as _uiCanAssignRole,
  roleRank as _uiRoleRank,
  listRoles as _uiListRoles,
  listActions as _uiListActions,
} from "../utils/workspace-ui-roles.js";

const STORAGE_KEY = "workspaces";
const ACTIVE_KEY = "activeWorkspace";

/** Role badge emoji map. */
const ROLE_BADGE = Object.freeze({
  owner: "👑",
  co_planner: "🤝",
  vendor: "🏪",
  photographer: "📸",
  guest: "👤",
});

/**
 * Get all workspaces from the store.
 * @returns {{ id: string, name: string, role: import('../services/workspace.js').WorkspaceRole }[]}
 */
function getWorkspaces() {
  return /** @type {any} */ (storeGet(STORAGE_KEY)) ?? [
    { id: "default", name: t("workspace_default"), role: "owner" },
  ];
}

/** Get the active workspace id. */
function getActiveWorkspaceId() {
  return storeGet(ACTIVE_KEY) ?? "default";
}

/** Get the active workspace object. */
function getActiveWorkspace() {
  const all = getWorkspaces();
  const activeId = getActiveWorkspaceId();
  return all.find((w) => w.id === activeId) ?? all[0];
}

/**
 * Switch to a different workspace by id.
 * @param {string} id
 */
function switchWorkspace(id) {
  const all = getWorkspaces();
  if (!all.some((w) => w.id === id)) return;
  storeSet(ACTIVE_KEY, id);
  renderWorkspaceSwitcher();
}

/**
 * Get the role badge emoji for a role.
 * @param {string} role
 */
function getRoleBadge(role) {
  return ROLE_BADGE[/** @type {keyof typeof ROLE_BADGE} */ (role)] ?? "👤";
}

/**
 * Render the workspace switcher dropdown into #workspaceSwitcher.
 */
function renderWorkspaceSwitcher() {
  const container = document.getElementById("workspaceSwitcher");
  if (!container) return;

  const workspace = getActiveWorkspace();
  if (!workspace) return;
  const all = getWorkspaces();
  const badge = getRoleBadge(workspace.role);
  const canInvite = hasPermission(workspace.role, "invite");

  container.textContent = "";

  // Current workspace label
  const label = document.createElement("button");
  label.className = "ws-current";
  label.setAttribute("aria-expanded", "false");
  label.setAttribute("aria-haspopup", "listbox");
  label.setAttribute("data-action", "toggleWorkspaceDropdown");
  label.textContent = `${badge} ${workspace.name}`;
  container.appendChild(label);

  // Role tag
  const roleTag = document.createElement("span");
  roleTag.className = "ws-role-badge";
  roleTag.textContent = t(`workspace_role_${workspace.role}`);
  container.appendChild(roleTag);

  // Dropdown (hidden by default)
  if (all.length > 1) {
    const dropdown = document.createElement("ul");
    dropdown.className = "ws-dropdown u-hidden";
    dropdown.id = "wsDropdown";
    dropdown.setAttribute("role", "listbox");

    for (const ws of all) {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("data-action", "selectWorkspace");
      li.setAttribute("data-action-arg", ws.id);
      li.className = ws.id === workspace.id ? "ws-item ws-item--active" : "ws-item";
      li.textContent = `${getRoleBadge(ws.role)} ${ws.name}`;
      dropdown.appendChild(li);
    }

    container.appendChild(dropdown);
  }

  // Invite button (only for users with invite permission)
  if (canInvite) {
    const invite = document.createElement("button");
    invite.className = "ws-invite-btn";
    invite.setAttribute("data-action", "inviteToWorkspace");
    invite.textContent = t("workspace_invite");
    container.appendChild(invite);
  }
}

/** Toggle the workspace dropdown visibility. */
export function toggleWorkspaceDropdown() {
  const dropdown = document.getElementById("wsDropdown");
  if (!dropdown) return;
  const isHidden = dropdown.classList.contains("u-hidden");
  dropdown.classList.toggle("u-hidden", !isHidden);
  const btn = dropdown.parentElement?.querySelector(".ws-current");
  if (btn) btn.setAttribute("aria-expanded", String(isHidden));
}

/** Select a workspace from the dropdown. */
export function selectWorkspace(/** @type {string} */ id) {
  switchWorkspace(id);
  const dropdown = document.getElementById("wsDropdown");
  if (dropdown) dropdown.classList.add("u-hidden");
}

/**
 * S436: Create a new event workspace with a user-supplied name.
 * Prompts for a name, adds it to the workspaces store, and switches to it.
 */
export function createNewEvent() {
  const name = window.prompt(t("ws_new_event_prompt"), t("ws_new_event_default"));
  if (!name?.trim()) return;
  const id = `event_${Date.now()}`;
  const workspaces = /** @type {import('../core/store.js').WorkspaceEntry[]} */ (
    storeGet(STORAGE_KEY)
  ) ?? [{ id: "default", name: t("workspace_default"), role: "owner" }];
  storeSet(STORAGE_KEY, [...workspaces, { id, name: name.trim(), role: "owner" }]);
  switchWorkspace(id);
}

class WorkspaceSwitcherSection extends BaseSection {
  async onMount() {
    renderWorkspaceSwitcher();
  }

  onUnmount() {
    const container = document.getElementById("workspaceSwitcher");
    if (container) container.textContent = "";
  }
}

export const { mount, unmount, capabilities } = fromSection(new WorkspaceSwitcherSection("workspace-switcher"));

// ── S610: workspace permission matrix helpers ─────────────────────────────

/**
 * Translate the legacy `co_planner` role used by the older workspace
 * service into the canonical `co-planner` role used by the new
 * permission matrix.
 * @param {string} role
 */
function _normaliseRole(role) {
  return role === "co_planner" ? "co-planner" : role;
}

/**
 * Check whether the supplied role is allowed to perform a workspace
 * UI action. Uses the canonical permission matrix from
 * `utils/workspace-ui-roles.js`.
 *
 * @param {string} role
 * @param {string} action
 * @returns {boolean}
 */
export function canPerformWorkspaceAction(role, action) {
  return _uiCanPerform(/** @type {any} */ (_normaliseRole(role)), /** @type {any} */ (action));
}

/**
 * Check whether `actor` may assign `target` role to another member.
 * @param {string} actor
 * @param {string} target
 */
export function canAssignWorkspaceRole(actor, target) {
  return _uiCanAssignRole(
    /** @type {any} */ (_normaliseRole(actor)),
    /** @type {any} */ (_normaliseRole(target)),
  );
}

/**
 * Build the role × action permission matrix used for the workspace
 * settings UI.
 * @returns {{ roles: ReadonlyArray<string>, actions: ReadonlyArray<string>, grid: Record<string, Record<string, boolean>> }}
 */
export function getWorkspacePermissionMatrix() {
  const roles = _uiListRoles();
  const actions = _uiListActions();
  /** @type {Record<string, Record<string, boolean>>} */
  const grid = {};
  for (const r of roles) {
    grid[r] = {};
    for (const a of actions) {
      grid[r][a] = _uiCanPerform(r, a);
    }
  }
  return { roles, actions, grid };
}

/**
 * Numeric rank of a role (higher = more privileged).
 * @param {string} role
 */
export function getWorkspaceRoleRank(role) {
  return _uiRoleRank(/** @type {any} */ (_normaliseRole(role)));
}
