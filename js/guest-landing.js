// @ts-check
"use strict";

/* ── Guest Landing Page (v1.15.0) ────────────────────────────────────────────
   Shown to non-admin users as their default view.
   Displays: couple banner, countdown, timeline (read-only), RSVP call-to-action.
   ─────────────────────────────────────────────────────────────────────────── */

function renderGuestLanding() {
  _renderLandingHero();
  _renderLandingTimeline();
  window.renderRegistryLinks();
}

function _renderLandingHero() {
  const isHe = window._currentLang === "he";
  const groom = isHe
    ? window._weddingInfo.groom || "חתן"
    : window._weddingInfo.groomEn || window._weddingInfo.groom || "Groom";
  const bride = isHe
    ? window._weddingInfo.bride || "כלה"
    : window._weddingInfo.brideEn || window._weddingInfo.bride || "Bride";

  const nameEl = document.getElementById("landingCoupleName");
  if (nameEl) nameEl.textContent = `${groom  } & ${  bride}`;

  const hebrewEl = document.getElementById("landingHebrewDate");
  if (hebrewEl) {
    const hDate = window._weddingInfo.hebrewDate || "";
    hebrewEl.textContent = hDate;
    hebrewEl.style.display = hDate ? "" : "none";
  }

  const dateEl = document.getElementById("landingDate");
  if (dateEl) {
    dateEl.textContent = window._weddingInfo.date
      ? window.formatDateHebrew(window._weddingInfo.date)
      : window.t("landing_date_tbd");
  }

  const venueEl = document.getElementById("landingVenue");
  if (venueEl) venueEl.textContent = window._weddingInfo.venue || "";

  const addrEl = document.getElementById("landingAddress");
  if (addrEl) {
    addrEl.textContent = window._weddingInfo.address || "";
    addrEl.style.display = window._weddingInfo.address ? "" : "none";
  }

  const wazeEl = document.getElementById("landingWazeLink");
  if (wazeEl) {
    if (window._weddingInfo.wazeLink) {
      wazeEl.href = window._weddingInfo.wazeLink;
      wazeEl.style.display = "";
    } else {
      wazeEl.style.display = "none";
    }
  }
}

function _renderLandingTimeline() {
  const container = document.getElementById("landingTimeline");
  if (!container) return;
  container.replaceChildren();

  if (!window._timeline || !window._timeline.length) {
    const empty = document.createElement("p");
    empty.style.cssText =
      "color:var(--text-muted); text-align:center; padding:1rem;";
    empty.textContent = window.t("timeline_empty");
    container.appendChild(empty);
    return;
  }

  const sorted = window._timeline.slice().sort(function (a, b) {
    return (a.time || "").localeCompare(b.time || "");
  });

  sorted.forEach(function (item) {
    const div = document.createElement("div");
    div.className = "timeline-item";

    const dot = document.createElement("div");
    dot.className = "timeline-dot";
    dot.textContent = item.icon || "📌";

    const content = document.createElement("div");
    content.className = "timeline-content";

    if (item.time) {
      const timeEl = document.createElement("div");
      timeEl.className = "timeline-time";
      timeEl.textContent = item.time;
      content.appendChild(timeEl);
    }

    const titleEl = document.createElement("div");
    titleEl.className = "timeline-title";
    titleEl.textContent = item.title || "";
    content.appendChild(titleEl);

    if (item.description) {
      const desc = document.createElement("div");
      desc.className = "timeline-desc";
      desc.textContent = item.description;
      content.appendChild(desc);
    }

    div.appendChild(dot);
    div.appendChild(content);
    container.appendChild(div);
  });
}
