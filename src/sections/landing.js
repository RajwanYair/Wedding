/**
 * src/sections/landing.js — Guest-facing landing page section (S0.8)
 *
 * Public landing with couple info, registry links, and table finder.
 */

import { storeGet, storeSubscribe } from "../core/store.js";
import { t } from "../core/i18n.js";
import { formatDateHebrew } from "../utils/date.js";
/** @type {(() => void)[]} */
const _unsubs = [];

export function mount(/** @type {HTMLElement} */ _container) {
  _unsubs.push(storeSubscribe("weddingInfo", renderLanding));
  _unsubs.push(storeSubscribe("timeline", renderLanding));
  renderLanding();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}

export function renderLanding() {
  const info = /** @type {Record<string,string>} */ (
    storeGet("weddingInfo") ?? {}
  );

  // Couple names
  const coupleEl = document.getElementById("landingCoupleName");
  if (coupleEl && (info.groom || info.bride)) {
    coupleEl.textContent = `${info.groom || ""} & ${info.bride || ""}`;
  }

  // Hebrew date
  const hebrewDateEl = document.getElementById("landingHebrewDate");
  if (hebrewDateEl) {
    hebrewDateEl.textContent = info.hebrewDate || "";
  }

  // Gregorian date
  const dateEl = document.getElementById("landingDate");
  if (dateEl && info.date) dateEl.textContent = formatDateHebrew(info.date);

  // Venue
  const venueEl = document.getElementById("landingVenue");
  if (venueEl) venueEl.textContent = info.venue || "";

  // Address
  const addressEl = document.getElementById("landingAddress");
  if (addressEl) addressEl.textContent = info.venueAddress || "";

  // Waze link
  const wazeLink = /** @type {HTMLAnchorElement|null} */ (
    document.getElementById("landingWazeLink")
  );
  if (wazeLink) {
    if (info.venueWaze && info.venueWaze.startsWith("https://")) {
      wazeLink.href = info.venueWaze;
      wazeLink.classList.remove("u-hidden");
    } else {
      wazeLink.classList.add("u-hidden");
    }
  }

  // Timeline (read-only listing)
  const timelineEl = document.getElementById("landingTimeline");
  if (timelineEl) {
    const items = /** @type {any[]} */ (storeGet("timeline") ?? []);
    timelineEl.textContent = "";
    if (items.length === 0) {
      const p = document.createElement("p");
      p.className = "u-text-muted";
      p.textContent = "";
      timelineEl.appendChild(p);
    } else {
      items
        .slice()
        .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
        .forEach((item) => {
          const row = document.createElement("div");
          row.className = "timeline-row";
          row.textContent = `${item.icon || "📌"} ${item.time || ""} — ${item.title || ""}`;
          timelineEl.appendChild(row);
        });
    }
  }

  // Registry (guest-facing)
  const registrySection = document.getElementById("landingRegistrySection");
  const registryList = document.getElementById("landingRegistryList");
  if (registrySection && registryList) {
    const links = _getRegistryLinks(info);
    if (links.length > 0) {
      registrySection.classList.remove("u-hidden");
      registryList.textContent = "";
      links.forEach((item) => {
        const a = document.createElement("a");
        a.className = "registry-card";
        a.href = item.url || "#";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = item.name || item.url || "";
        registryList.appendChild(a);
      });
    } else {
      registrySection.classList.add("u-hidden");
    }
  }
}

/**
 * Parse guest-facing registry links from weddingInfo.
 * @param {Record<string, string>} info
 * @returns {Array<{ url: string, name: string }>}
 */
function _getRegistryLinks(info) {
  try {
    const raw = JSON.parse(info.registryLinks || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (typeof item === "string") {
          return { url: item, name: item };
        }
        if (item && typeof item === "object") {
          return {
            url: typeof item.url === "string" ? item.url : "",
            name: typeof item.name === "string" ? item.name : (typeof item.url === "string" ? item.url : ""),
          };
        }
        return null;
      })
      .filter((item) => item && item.url.startsWith("https://"));
  } catch {
    return [];
  }
}

/**
 * Table finder — look up a guest's assigned table by name/phone.
 * @param {string} query
 * @returns {{ table?: any, guest?: any, found: boolean }}
 */
export function findTableByQuery(query) {
  if (!query.trim()) return { found: false };
  const lq = query.toLowerCase();
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);

  const guest = guests.find(
    (g) =>
      `${g.firstName} ${g.lastName || ""}`.toLowerCase().includes(lq) ||
      (g.phone || "").includes(query.trim()),
  );
  if (!guest) return { found: false };

  const table = tables.find((tb) => tb.id === guest.tableId);
  return { found: !!table, guest, table };
}

/**
 * Display table finder result in the DOM.
 * @param {string} query
 */
export function showTableFinder(query) {
  const result = findTableByQuery(query);
  const resultEl = document.getElementById("tablefinderResult");
  if (!resultEl) return;

  if (result.found && result.table) {
    resultEl.textContent = `${t("your_table")}: ${result.table.name}`;
    resultEl.classList.remove("u-hidden");
  } else {
    resultEl.textContent = t("table_not_found");
    resultEl.classList.remove("u-hidden");
  }
}
