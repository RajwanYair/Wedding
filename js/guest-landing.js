"use strict";

/* ── Guest Landing Page (v1.15.0) ────────────────────────────────────────────
   Shown to non-admin users as their default view.
   Displays: couple banner, countdown, timeline (read-only), RSVP call-to-action.
   ─────────────────────────────────────────────────────────────────────────── */

function renderGuestLanding() {
  _renderLandingHero();
  _renderLandingTimeline();
  renderRegistryLinks();
}

function _renderLandingHero() {
  const isHe = _currentLang === "he";
  const groom = isHe
    ? _weddingInfo.groom || "חתן"
    : _weddingInfo.groomEn || _weddingInfo.groom || "Groom";
  const bride = isHe
    ? _weddingInfo.bride || "כלה"
    : _weddingInfo.brideEn || _weddingInfo.bride || "Bride";

  const nameEl = document.getElementById("landingCoupleName");
  if (nameEl) nameEl.textContent = groom + " & " + bride;

  const hebrewEl = document.getElementById("landingHebrewDate");
  if (hebrewEl) {
    const hDate = _weddingInfo.hebrewDate || "";
    hebrewEl.textContent = hDate;
    hebrewEl.style.display = hDate ? "" : "none";
  }

  const dateEl = document.getElementById("landingDate");
  if (dateEl) {
    dateEl.textContent = _weddingInfo.date
      ? formatDateHebrew(_weddingInfo.date)
      : t("landing_date_tbd");
  }

  const venueEl = document.getElementById("landingVenue");
  if (venueEl) venueEl.textContent = _weddingInfo.venue || "";

  const addrEl = document.getElementById("landingAddress");
  if (addrEl) {
    addrEl.textContent = _weddingInfo.address || "";
    addrEl.style.display = _weddingInfo.address ? "" : "none";
  }

  const wazeEl = document.getElementById("landingWazeLink");
  if (wazeEl) {
    if (_weddingInfo.wazeLink) {
      wazeEl.href = _weddingInfo.wazeLink;
      wazeEl.style.display = "";
    } else {
      wazeEl.style.display = "none";
    }
  }
}

function _renderLandingTimeline() {
  const container = document.getElementById("landingTimeline");
  if (!container) return;
  container.innerHTML = "";

  if (!_timeline || !_timeline.length) {
    const empty = document.createElement("p");
    empty.style.cssText =
      "color:var(--text-muted); text-align:center; padding:1rem;";
    empty.textContent = t("timeline_empty");
    container.appendChild(empty);
    return;
  }

  const sorted = _timeline.slice().sort(function (a, b) {
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
