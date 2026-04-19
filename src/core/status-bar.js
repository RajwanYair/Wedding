/**
 * src/core/status-bar.js — Footer status bar renderer (S0.11)
 *
 * Displays app version, GAS version, and user role in the footer.
 */

import { APP_VERSION } from "./config.js";
import { getSheetsWebAppUrl } from "./app-config.js";
import { t } from "./i18n.js";

/** @type {string} */
let _gasVersion = "";

/**
 * Fetch the GAS (Google Apps Script) version once and update the status bar.
 * @param {import('../services/auth.js').AuthUser | null} user
 */
export async function fetchGasVersion(user) {
  try {
    const url = getSheetsWebAppUrl();
    if (!url) return;
    const resp = await fetch(/** @type {string} */ (url), { method: "GET", cache: "no-store" });
    if (!resp.ok) return;
    const data = await resp.json();
    _gasVersion = data?.version ?? "";
  } catch {
    _gasVersion = "";
  }
  updateStatusBar(user);
}

/**
 * Populate the footer status bar with app version, GAS version and user role.
 * @param {import('../services/auth.js').AuthUser | null} user
 */
export function updateStatusBar(user) {
  const verEl = document.getElementById("statusVersion");
  const gasEl = document.getElementById("statusGas");
  const roleEl = document.getElementById("statusRole");
  if (verEl) verEl.textContent = `v${APP_VERSION}`;
  if (gasEl) gasEl.textContent = _gasVersion ? `GAS v${_gasVersion}` : "";
  if (roleEl) {
    roleEl.textContent = user?.isAdmin
      ? `\u2705 ${t("role_admin")}`
      : `\uD83D\uDC64 ${t("role_guest") || "Guest"}`;
  }
}
