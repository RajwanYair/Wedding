/**
 * src/handlers/auth-handlers.js — Auth action handler registration (Phase 6.3)
 *
 * Registers data-action handlers for: submitEmailLogin, loginFacebook,
 * loginApple, signOut, showAuthOverlay, hideAuthOverlay.
 * Extracted from main.js to reduce it to ≤200 lines.
 */

import { on } from "../core/events.js";
import { t } from "../core/i18n.js";
import { showToast, openModal, closeModal } from "../core/ui.js";
import { loginAnonymous, loginOAuth, clearSession } from "../services/auth.js";
import { switchSection } from "../core/section-resolver.js";

/**
 * Register all auth-related data-action handlers.
 * Call once at bootstrap.
 */
export function registerAuthHandlers() {
  on("submitEmailLogin", () => {
    const input = /** @type {HTMLInputElement | null} */ (
      document.getElementById("adminLoginEmail")
    );
    const email = input?.value?.trim() ?? "";
    const result = loginOAuth(email, email, "", "email");
    if (!result) {
      showToast(t("auth_email_not_approved"), "error");
    } else {
      closeModal("authOverlay");
      switchSection("dashboard");
      showToast(t("auth_welcome", { name: result.name }), "success");
    }
  });

  on("loginFacebook", () => {
    const fb = /** @type {any} */ (window).FB;
    if (!fb) return;
    fb.login(
      (/** @type {any} */ response) => {
        if (response.authResponse) {
          fb.api("/me", { fields: "name,email,picture" }, (/** @type {any} */ profile) => {
            const result = loginOAuth(
              profile.email || "",
              profile.name,
              profile.picture?.data?.url || "",
              "facebook",
            );
            if (result) {
              closeModal("authOverlay");
              switchSection("dashboard");
              showToast(t("auth_welcome", { name: result.name }), "success");
            }
          });
        }
      },
      { scope: "public_profile,email" },
    );
  });

  on("loginApple", () => {
    const AppleID = /** @type {any} */ (window).AppleID;
    if (!AppleID) return;
    AppleID.auth
      .signIn()
      .then((/** @type {any} */ response) => {
        const email = response?.user?.email ?? "";
        const name =
          `${response?.user?.name?.firstName ?? ""} ${response?.user?.name?.lastName ?? ""}`.trim();
        const result = loginOAuth(email, name, "", "apple");
        if (result) {
          closeModal("authOverlay");
          switchSection("dashboard");
          showToast(t("auth_welcome", { name: result.name }), "success");
        }
      })
      .catch(() => {});
  });

  on("signOut", () => {
    clearSession();
    loginAnonymous();
    switchSection("landing");
    showToast(t("auth_signed_out"), "info");
  });

  on("showAuthOverlay", () => openModal("authOverlay"));
  on("hideAuthOverlay", () => closeModal("authOverlay"));
}
