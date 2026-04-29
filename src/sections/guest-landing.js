/**
 * src/sections/guest-landing.js — Guest invitation landing page (S0.8)
 *
 * Personalised landing shown from invitation link: ?guestId=xxx
 * Displays table info, RSVP status, and RSVP button for guests.
 */

import { storeGet } from "../core/store.js";
import { t } from "../core/i18n.js";
import { formatDateHebrew } from "../utils/date.js";
import { BaseSection, fromSection } from "../core/section-base.js";

/** @type {HTMLElement|null} */
let _container = null;

class GuestLandingSection extends BaseSection {
  async onMount(/** @type {HTMLElement} */ params) {
    _container = (params instanceof HTMLElement) ? params : null;
    _renderFromHash();
  }

  onUnmount() {
    _container = null;
  }
}

export const { mount, unmount, capabilities } = fromSection(new GuestLandingSection("guest-landing"));

function _renderFromHash() {
  const params = new URLSearchParams(window.location.search);
  const guestId = params.get("guestId");
  if (!guestId) return;

  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const guest = guests.find((g) => g.id === guestId);
  if (!guest || !_container) return;

  const nameEl = _container.querySelector("[data-guest-name]");
  if (nameEl) nameEl.textContent = `${guest.firstName} ${guest.lastName || ""}`;

  const dateEl = _container.querySelector("[data-wedding-date]");
  if (dateEl && info.date) dateEl.textContent = formatDateHebrew(info.date);

  const tableEl = _container.querySelector("[data-guest-table]");
  if (tableEl) {
    const table = tables.find((tb) => tb.id === guest.tableId);
    tableEl.textContent = table ? table.name : t("table_tbd");
  }

  const statusEl = _container.querySelector("[data-rsvp-status]");
  if (statusEl) statusEl.textContent = t(`status_${guest.status}`);
}
