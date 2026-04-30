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
    { id: "venueLat", key: "venueLat" },
    { id: "venueLon", key: "venueLon" },
    { id: "virtualLink", key: "virtualLink" }, // S431: virtual/hybrid event join link
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

  // Venue map: reveal iframe using lat/lon (preferred) or address fallback
  const mapContainer = document.getElementById("venueMapContainer");
  if (mapContainer && (info.venueLat || info.venueAddress)) {
    const mapFrame = /** @type {HTMLIFrameElement|null} */ (
      document.getElementById("venueMapFrame")
    );
    const lat = parseFloat(info.venueLat ?? "");
    const lon = parseFloat(info.venueLon ?? "");
    if (mapFrame) {
      if (!Number.isNaN(lat) && !Number.isNaN(lon) && info.venueLat && info.venueLon) {
        // Use proper OSM embed via venue-links utility
        import("../utils/venue-links.js").then(({ buildOsmEmbedUrl }) => {
          mapFrame.src = buildOsmEmbedUrl(lat, lon);
        }).catch(() => {});
      } else if (info.venueAddress) {
        // Fallback: address-only rough embed (Nominatim search)
        const encoded = encodeURIComponent(info.venueAddress);
        mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=&layer=mapnik&query=${encoded}`;
      }
    }
    mapContainer.classList.remove("u-hidden");
    const fallback = document.getElementById("venueMapFallback");
    if (fallback) {
      const encoded = encodeURIComponent(
        info.venueAddress || (info.venueLat && info.venueLon ? `${lat},${lon}` : ""),
      );
      /** @type {HTMLAnchorElement} */ (fallback).href =
        info.venueAddress
          ? `https://www.google.com/maps/search/?api=1&query=${encoded}`
          : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
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

/**
 * Geocode the venue address using Nominatim (OSM, no API key),
 * persist lat/lon to store, and refresh the venue map.
 * Bound to data-action="geocodeVenueAddress".
 */
export async function geocodeVenueAddress() {
  const { showToast } = await import("../core/ui.js");
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const address = info.venueAddress?.trim();
  if (!address) {
    showToast(t("geocode_no_address"), "warning");
    return;
  }
  const statusEl = document.getElementById("geocodeStatus");
  if (statusEl) statusEl.textContent = t("geocoding");

  try {
    const params = new URLSearchParams({ q: address, format: "json", limit: "1" });
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { "Accept-Language": "he,en" } },
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const results = /** @type {Array<{lat:string,lon:string}>} */ (await resp.json());
    if (!results.length) {
      if (statusEl) statusEl.textContent = t("geocode_not_found");
      showToast(t("geocode_not_found"), "warning");
      return;
    }
    const { lat, lon } = results[0];
    storeSet("weddingInfo", { ...info, venueLat: lat, venueLon: lon });
    // Reflect in form fields
    const latInput = /** @type {HTMLInputElement|null} */ (document.getElementById("venueLat"));
    const lonInput = /** @type {HTMLInputElement|null} */ (document.getElementById("venueLon"));
    if (latInput) latInput.value = lat;
    if (lonInput) lonInput.value = lon;
    if (statusEl) statusEl.textContent = `${lat}, ${lon}`;
    showToast(t("geocode_ok"), "success");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (statusEl) statusEl.textContent = `${t("geocode_error")}: ${msg}`;
    showToast(t("geocode_error"), "error");
  }
}

