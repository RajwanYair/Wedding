/**
 * src/sections/invitation.js — Digital invitation section ESM module (S0.8)
 *
 * Renders a preview of the invitation card with editable wedding info.
 */

import { storeGet, storeSet } from "../core/store.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { markInvitationSent } from "../services/guest-service.js";

class InvitationSection extends BaseSection {
  async onMount() {
    this.subscribe("weddingInfo", renderInvitation);
    renderInvitation();
  }
}

export const { mount, unmount, capabilities } = fromSection(new InvitationSection("invitation"));

/**
 * Collect wedding detail form fields and persist them.
 */
export function updateWeddingDetails() {
  /** @type {Array<{id: string, key: string}>} */
  const fieldMap = [
    { id: "groomName", key: "groom" },
    { id: "brideName", key: "bride" },
    { id: "groomNameEn", key: "groomEn" },
    { id: "brideNameEn", key: "brideEn" },
    { id: "weddingDate", key: "date" },
    { id: "weddingHebrewDate", key: "hebrewDate" },
    { id: "weddingTime", key: "time" },
    { id: "weddingCeremonyTime", key: "ceremonyTime" },
    { id: "rsvpDeadline", key: "rsvpDeadline" },
    { id: "venueName", key: "venue" },
    { id: "venueAddress", key: "venueAddress" },
    { id: "venueWaze", key: "venueWaze" },
  ];
  const delta = /** @type {Record<string,string>} */ ({});
  fieldMap.forEach(({ id, key }) => {
    const input = /** @type {HTMLInputElement|null} */ (document.getElementById(id));
    if (input) delta[key] = input.value;
  });
  const current = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const prevGroomEn = current.groomEn ?? "";
  const prevBrideEn = current.brideEn ?? "";
  storeSet("weddingInfo", { ...current, ...delta });

  // If groomEn or brideEn changed from a non-empty value, offer to reinitialise backend tabs
  const newGroomEn = delta.groomEn ?? prevGroomEn;
  const newBrideEn = delta.brideEn ?? prevBrideEn;
  const namesChanged =
    (prevGroomEn && newGroomEn !== prevGroomEn) || (prevBrideEn && newBrideEn !== prevBrideEn);
  if (namesChanged && window.confirm(t("backend_reinit_prompt"))) {
    // Dynamic import: sections must not statically import services (B9 arch rule)
    import("../services/backend.js")
      .then(({ createMissingTabs }) => createMissingTabs())
      .then(() => {
        window.alert(t("backend_reinit_done"));
      })
      .catch(() => {
        window.alert(t("backend_reinit_skip"));
      });
  }
}

/**
 * Handle invitation image upload (file input change).
 * @param {HTMLInputElement} input
 */
export function handleInvitationUpload(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    const dataUrl = /** @type {string} */ (ev.target?.result);
    if (!dataUrl.startsWith("data:image/")) return;
    const current = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
    storeSet("weddingInfo", { ...current, invitationUrl: dataUrl });
    // Render immediately
    const container = document.getElementById("invitationImage");
    if (container) {
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "";
      img.style.maxWidth = "100%";
      container.textContent = "";
      container.appendChild(img);
    }
  };
  reader.readAsDataURL(file);
}

function renderInvitation() {
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});

  // Populate the editable form fields with persisted values
  /** @type {Array<{id: string, key: string}>} */
  const fieldMap = [
    { id: "groomName", key: "groom" },
    { id: "brideName", key: "bride" },
    { id: "groomNameEn", key: "groomEn" },
    { id: "brideNameEn", key: "brideEn" },
    { id: "weddingDate", key: "date" },
    { id: "weddingHebrewDate", key: "hebrewDate" },
    { id: "weddingTime", key: "time" },
    { id: "weddingCeremonyTime", key: "ceremonyTime" },
    { id: "rsvpDeadline", key: "rsvpDeadline" },
    { id: "venueName", key: "venue" },
    { id: "venueAddress", key: "venueAddress" },
    { id: "venueWaze", key: "venueWaze" },
  ];
  fieldMap.forEach(({ id, key }) => {
    const input = /** @type {HTMLInputElement|null} */ (document.getElementById(id));
    if (input && info[key] !== undefined && !input.value) {
      input.value = info[key];
    }
  });

  // Venue map: reveal iframe when address is known
  const mapContainer = document.getElementById("venueMapContainer");
  if (mapContainer && info.venueAddress) {
    const encoded = encodeURIComponent(info.venueAddress);
    const mapFrame = /** @type {HTMLIFrameElement|null} */ (
      document.getElementById("venueMapFrame")
    );
    if (mapFrame) {
      mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&marker=0,0&query=${encoded}`;
    }
    mapContainer.classList.remove("u-hidden");
    const fallback = document.getElementById("venueMapFallback");
    if (fallback) {
      /** @type {HTMLAnchorElement} */ (fallback).href =
        `https://www.google.com/maps/search/?api=1&query=${encoded}`;
      fallback.classList.remove("u-hidden");
    }
  }

  // Invitation image
  if (el.invitationImage && info.invitationUrl) {
    const img = /** @type {HTMLImageElement} */ (el.invitationImage);
    if (info.invitationUrl.startsWith("https://") || info.invitationUrl.startsWith("data:image/")) {
      img.src = info.invitationUrl;
    }
  }
}

/**
 * Mark a batch of guests as having received their invitation.
 * @param {string[]} ids  Guest IDs to mark as invitation-sent
 * @returns {Promise<void>}
 */
export async function batchMarkInvitationSent(ids) {
  await markInvitationSent(ids);
}
