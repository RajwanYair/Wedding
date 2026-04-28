/**
 * src/sections/workspace-switcher.js — S140 workspace switcher + role badges.
 *
 * Renders a workspace dropdown in the nav area showing the current workspace
 * name and user role badge. Consumes workspace-roles.js (S132) for RBAC.
 */

import { getStore, updateStore } from "../core/store.js";
import { t } from "../core/i18n.js";
import { hasPermission } from "../services/workspace-roles.js";
import { BaseSection, fromSection } from "../core/section-base.js";

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
 * @returns {{ id: string, name: string, role: import('../services/workspace-roles.js').WorkspaceRole }[]}
 */
function getWorkspaces() {
  return getStore(STORAGE_KEY) ?? [
    { id: "default", name: t("workspace_default"), role: "owner" },
  ];
}

/** Get the active workspace id. */
function getActiveWorkspaceId() {
  return getStore(ACTIVE_KEY) ?? "default";
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
  updateStore(ACTIVE_KEY, id);
  renderWorkspaceSwitcher();
}

/**
 * Get the role badge emoji for a role.
 * @param {string} role
 */
function getRoleBadge(role) {
  return ROLE_BADGE[role] ?? "👤";
}

/**
 * Render the workspace switcher dropdown into #workspaceSwitcher.
 */
function renderWorkspaceSwitcher() {
  const container = document.getElementById("workspaceSwitcher");
  if (!container) return;

  const workspace = getActiveWorkspace();
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
export function selectWorkspace(id) {
  switchWorkspace(id);
  const dropdown = document.getElementById("wsDropdown");
  if (dropdown) dropdown.classList.add("u-hidden");
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
