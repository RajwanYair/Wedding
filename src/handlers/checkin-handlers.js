/**
 * src/handlers/checkin-handlers.js — Check-in domain action handlers
 */

import { on } from "../core/events.js";
import { t } from "../core/i18n.js";
import { showConfirmDialog, showToast } from "../core/ui.js";
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
import { bulkCheckIn } from "../services/guest-service.js";

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
    import("../services/security.js").then(({ writeNFCTag }) =>
      writeNFCTag(el.dataset.actionArg ?? "").catch(() => {}),
    ),
  );
  on("bulkCheckIn", async (el) => {
    const ids = (el.dataset.actionArg ?? "").split(",").filter(Boolean);
    if (ids.length === 0) return;
    await bulkCheckIn(ids);
    showToast(t("checkin_bulk_done").replace("{n}", String(ids.length)), "success");
  });
}
