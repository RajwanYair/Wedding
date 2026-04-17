/**
 * src/core/nav-auth.js — Navigation auth state update (Phase 6.3)
 *
 * Updates nav visibility and user-bar chip based on current auth state.
 * Extracted from main.js to fulfill the ≤200-line goal.
 */

import { t } from "./i18n.js";
import { updateStatusBar } from "./status-bar.js";
import { maybeShowWhatsNew } from "./whats-new.js";

/**
 * Update nav visibility and user-bar chip based on current auth state.
 * Called during bootstrap and on every auth state change.
 * @param {import('../services/auth.js').AuthUser | null} user
 */
export function updateNavForAuth(user) {
  const isAdmin = user?.isAdmin ?? false;

  // Show/hide admin-only nav items
  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    el.classList.toggle("u-hidden", !isAdmin);
  });

  // Update user-bar chip
  const btnSignIn = document.getElementById("btnSignIn");
  const btnSignOut = document.getElementById("btnSignOut");
  const userAvatar = /** @type {HTMLImageElement | null} */ (
    document.getElementById("userAvatar")
  );
  const userDisplayName = document.getElementById("userDisplayName");
  const userRoleBadge = document.getElementById("userRoleBadge");

  if (btnSignIn) btnSignIn.classList.toggle("u-hidden", isAdmin);
  if (btnSignOut) btnSignOut.classList.toggle("u-hidden", !isAdmin);
  if (userDisplayName)
    userDisplayName.textContent = isAdmin ? (user?.name ?? "") : "";
  if (userRoleBadge)
    userRoleBadge.textContent = isAdmin ? t("role_admin") : "";
  if (userAvatar) {
    const hasPic = isAdmin && !!user?.picture;
    userAvatar.classList.toggle("u-hidden", !hasPic);
    if (hasPic) userAvatar.src = user?.picture ?? "";
  }

  // Update footer status bar and show What's New on admin login
  updateStatusBar(user);
  maybeShowWhatsNew(user);
}
