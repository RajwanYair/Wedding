/**
 * src/handlers/checkin-handlers.js — Check-in domain action handlers
 */

import { on } from "../core/events.js";
import { t } from "../core/i18n.js";
import { showConfirmDialog } from "../core/ui.js";
import {
  checkInGuest,
  setCheckinSearch,
  exportCheckinReport,
  resetAllCheckins,
  toggleGiftMode,
  startQrScan,
  stopQrScan,
  startNFCCheckin,
  stopNFCCheckin,
  printGuestQrBadges,
} from "../sections/checkin.js";

/**
 * Register `data-action` handlers for the check-in section.
 * Idempotent — call once at app boot.
 */
export function register() {
  on("checkInGuest", (el) => checkInGuest(el.dataset.actionArg ?? ""));
  on("checkinSearch", (_el, e) => {
    const input = /** @type {HTMLInputElement|null} */ (
      e.target instanceof HTMLInputElement ? e.target : null
    );
    setCheckinSearch(input?.value ?? "");
  });
  on("exportCheckinReport", () => exportCheckinReport());
  on("resetAllCheckins", () =>
    showConfirmDialog(t("confirm_reset_checkins"), () => resetAllCheckins()),
  );
  on("toggleGiftMode", () => toggleGiftMode());
  on("startQrScan", () => startQrScan());
  on("stopQrScan", () => stopQrScan());
  on("startNFCCheckin", () => startNFCCheckin());
  on("stopNFCCheckin", () => stopNFCCheckin());
  on("printGuestQrBadges", () => printGuestQrBadges());
  on("writeNFCForGuest", (el) =>
    import("../services/nfc.js").then(({ writeNFCTag }) =>
      writeNFCTag(el.dataset.actionArg ?? "").catch(() => {}),
    ),
  );
}
