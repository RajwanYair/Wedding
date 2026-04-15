// @ts-check
'use strict';

/* ── Invitation ── */
/* ── Invitation ── */
function handleInvitationUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/gif",
    "image/webp",
  ];
  if (!validTypes.includes(file.type)) {
    window.showToast(window.t("toast_invalid_file"), "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    window.showToast("Max 5MB", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = function (ev) {
    window._invitationDataUrl = ev.target.result;
    renderInvitation();
    window.saveAll();
  };
  reader.readAsDataURL(file);
}

const DEFAULT_INVITATION_SRC = "invitation.jpg";

function renderInvitation() {
  let src = window._invitationDataUrl || DEFAULT_INVITATION_SRC;
  /* Safety: only allow known relative paths or trusted data:image/ URLs */
  if (src !== DEFAULT_INVITATION_SRC && !src.startsWith("data:image/")) {
    window._invitationDataUrl = "";
    src = DEFAULT_INVITATION_SRC;
  }
  const img = document.createElement("img");
  img.src = src;
  img.alt = "Wedding Invitation";
  img.style.cssText =
    "max-width:100%;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.35);";
  window.el.invitationImage.replaceChildren(img);
}

function renderDefaultInvitationSVG() {
  const groom =
    window._weddingInfo.groom ||
    (window._currentLang === "he" ? "\u05d7\u05ea\u05df" : "Groom");
  const bride =
    window._weddingInfo.bride ||
    (window._currentLang === "he" ? "\u05db\u05dc\u05d4" : "Bride");
  const groomEn = window._weddingInfo.groomEn || "Groom";
  const brideEn = window._weddingInfo.brideEn || "Bride";
  const showHebrew = window._currentLang === "he";
  const groomDisplay = showHebrew ? groom : groomEn;
  const brideDisplay = showHebrew ? bride : brideEn;
  const dateDisp = window._weddingInfo.date
    ? window.formatDateHebrew(window._weddingInfo.date)
    : window._currentLang === "he"
      ? "\u05ea\u05d0\u05e8\u05d9\u05da \u05dc\u05d0 \u05e0\u05e7\u05d1\u05e2"
      : "Date TBD";
  const hebrewDate = window._weddingInfo.hebrewDate || "";
  const time = window._weddingInfo.time || "18:00";
  const venue =
    window._weddingInfo.venue ||
    (window._currentLang === "he"
      ? "\u05d0\u05d5\u05dc\u05dd \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd"
      : "Venue");
  const address = window._weddingInfo.address || "";

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 500 720");
  svg.style.cssText = "max-width:420px; width:100%;";

  /* Helper to create SVG elements with attributes */
  function _svgEl(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) {
      e.setAttribute(k, attrs[k]);
    });
    return e;
  }
  function _svgText(attrs, text) {
    const e = _svgEl("text", attrs);
    e.textContent = text;
    return e;
  }

  /* Defs: gradients */
  const defs = document.createElementNS(NS, "defs");
  const bgGrad = _svgEl("linearGradient", {
    id: "bgGrad",
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "100%",
  });
  bgGrad.appendChild(
    _svgEl("stop", { offset: "0%", style: "stop-color:#1a0a2e" }),
  );
  bgGrad.appendChild(
    _svgEl("stop", { offset: "100%", style: "stop-color:#2d1b4e" }),
  );
  const goldGrad = _svgEl("linearGradient", {
    id: "goldGrad",
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "0%",
  });
  goldGrad.appendChild(
    _svgEl("stop", { offset: "0%", style: "stop-color:#b8864e" }),
  );
  goldGrad.appendChild(
    _svgEl("stop", { offset: "50%", style: "stop-color:#d4a574" }),
  );
  goldGrad.appendChild(
    _svgEl("stop", { offset: "100%", style: "stop-color:#b8864e" }),
  );
  defs.appendChild(bgGrad);
  defs.appendChild(goldGrad);
  svg.appendChild(defs);

  /* Background + borders */
  svg.appendChild(
    _svgEl("rect", {
      width: "500",
      height: "720",
      rx: "20",
      fill: "url(#bgGrad)",
    }),
  );
  svg.appendChild(
    _svgEl("rect", {
      x: "10",
      y: "10",
      width: "480",
      height: "700",
      rx: "16",
      fill: "none",
      stroke: "url(#goldGrad)",
      "stroke-width": "1",
      opacity: "0.5",
    }),
  );
  svg.appendChild(
    _svgEl("rect", {
      x: "22",
      y: "22",
      width: "456",
      height: "676",
      rx: "12",
      fill: "none",
      stroke: "url(#goldGrad)",
      "stroke-width": "0.5",
      opacity: "0.25",
    }),
  );

  /* Top ornament */
  svg.appendChild(
    _svgEl("path", {
      d: "M150 80 Q200 50 250 80 Q300 50 350 80",
      fill: "none",
      stroke: "url(#goldGrad)",
      "stroke-width": "1.5",
      opacity: "0.7",
    }),
  );
  svg.appendChild(
    _svgText(
      {
        x: "250",
        y: "62",
        "text-anchor": "middle",
        "font-size": "24",
        fill: "#d4a574",
        opacity: "0.7",
      },
      "\u2726",
    ),
  );

  /* Rings */
  svg.appendChild(
    _svgEl("circle", {
      cx: "230",
      cy: "145",
      r: "24",
      fill: "none",
      stroke: "#d4a574",
      "stroke-width": "2.5",
      opacity: "0.85",
    }),
  );
  svg.appendChild(
    _svgEl("circle", {
      cx: "270",
      cy: "145",
      r: "24",
      fill: "none",
      stroke: "#d4a574",
      "stroke-width": "2.5",
      opacity: "0.85",
    }),
  );

  /* Subtitle */
  svg.appendChild(
    _svgText(
      {
        x: "250",
        y: "200",
        "text-anchor": "middle",
        "font-family": "Georgia,serif",
        "font-size": "18",
        fill: "#d4a574",
        opacity: "0.75",
      },
      showHebrew
        ? "\u05d1\u05e9\u05e2\u05d4 \u05d8\u05d5\u05d1\u05d4 \u05d5\u05de\u05d5\u05e6\u05dc\u05d7\u05ea"
        : "With great joy",
    ),
  );

  /* Names */
  svg.appendChild(
    _svgText(
      {
        x: "250",
        y: "268",
        "text-anchor": "middle",
        "font-family": "Georgia,serif",
        "font-size": "42",
        fill: "#f0dcc4",
      },
      groomDisplay,
    ),
  );
  svg.appendChild(
    _svgText(
      {
        x: "250",
        y: "306",
        "text-anchor": "middle",
        "font-size": "26",
        fill: "#d4a574",
      },
      "\u2764",
    ),
  );
  svg.appendChild(
    _svgText(
      {
        x: "250",
        y: "346",
        "text-anchor": "middle",
        "font-family": "Georgia,serif",
        "font-size": "42",
        fill: "#f0dcc4",
      },
      brideDisplay,
    ),
  );

  /* Hebrew date */
  if (hebrewDate) {
    svg.appendChild(
      _svgText(
        {
          x: "250",
          y: "390",
          "text-anchor": "middle",
          "font-size": "16",
          fill: "#e8c9a0",
          opacity: "0.85",
        },
        hebrewDate,
      ),
    );
  }

  /* Divider */
  svg.appendChild(
    _svgEl("line", {
      x1: "130",
      y1: "412",
      x2: "370",
      y2: "412",
      stroke: "url(#goldGrad)",
      "stroke-width": "0.8",
      opacity: "0.45",
    }),
  );

  /* Details */
  svg.appendChild(
    _svgText(
      {
        x: "250",
        y: "448",
        "text-anchor": "middle",
        "font-size": "15",
        fill: "#e8c9a0",
      },
      `\ud83d\udcc5 ${  dateDisp}`,
    ),
  );
  svg.appendChild(
    _svgText(
      {
        x: "250",
        y: "480",
        "text-anchor": "middle",
        "font-size": "15",
        fill: "#e8c9a0",
      },
      `\ud83d\udd50 ${  time}`,
    ),
  );
  svg.appendChild(
    _svgText(
      {
        x: "250",
        y: "512",
        "text-anchor": "middle",
        "font-size": "15",
        fill: "#e8c9a0",
      },
      `\ud83d\udccd ${  venue}`,
    ),
  );
  if (address) {
    svg.appendChild(
      _svgText(
        {
          x: "250",
          y: "540",
          "text-anchor": "middle",
          "font-size": "12",
          fill: "#e8c9a0",
          opacity: "0.7",
        },
        address,
      ),
    );
  }

  /* Bottom ornament */
  svg.appendChild(
    _svgEl("path", {
      d: "M150 620 Q200 650 250 620 Q300 650 350 620",
      fill: "none",
      stroke: "url(#goldGrad)",
      "stroke-width": "1.5",
      opacity: "0.6",
    }),
  );
  svg.appendChild(
    _svgText(
      {
        x: "250",
        y: "672",
        "text-anchor": "middle",
        "font-size": "13",
        fill: "#d4a574",
        opacity: "0.55",
      },
      showHebrew
        ? "\u05e0\u05e9\u05de\u05d7 \u05dc\u05e8\u05d0\u05d5\u05ea\u05db\u05dd! \ud83d\udc8d"
        : "We hope to see you! \ud83d\udc8d",
    ),
  );

  window.el.invitationImage.replaceChildren(svg);
}

/* ── Venue Map (OpenStreetMap via Nominatim geocoding) ── */

/**
 * Geocode the wedding venue address via Nominatim and show an OSM embed iframe.
 * Falls back to a Google Maps search link if geocoding fails or no address is set.
 */
async function renderVenueMap() {
  const container = document.getElementById("venueMapContainer");
  if (!container) return;
  const addr = (window._weddingInfo.address || "").trim();
  if (!addr) {
    container.style.display = "none";
    return;
  }
  container.style.display = "";

  const iframe = document.getElementById("venueMapFrame");
  const fallback = document.getElementById("venueMapFallback");

  try {
    const geocodeUrl =
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${ 
      encodeURIComponent(addr)}`;
    const resp = await fetch(geocodeUrl, {
      headers: { "Accept-Language": "he,en;q=0.8", Accept: "application/json" },
      cache: "no-store",
    });
    if (!resp.ok) throw new Error("geocode_http");
    const results = await resp.json();
    if (!Array.isArray(results) || !results.length)
      throw new Error("geocode_noresult");

    const lat = parseFloat(results[0].lat);
    const lon = parseFloat(results[0].lon);
    const margin = 0.008;
    const bbox =
      `${lon -
      margin 
      },${ 
      lat - margin 
      },${ 
      lon + margin 
      },${ 
      lat + margin}`;

    if (iframe) {
      iframe.src =
        `https://www.openstreetmap.org/export/embed.html?bbox=${ 
        bbox 
        }&layer=mapnik&marker=${ 
        lat 
        },${ 
        lon}`;
      iframe.style.display = "";
    }
    if (fallback) fallback.style.display = "none";
  } catch (_err) {
    if (iframe) iframe.style.display = "none";
    if (fallback) {
      fallback.href =
        `https://www.google.com/maps/search/${  encodeURIComponent(addr)}`;
      fallback.style.display = "";
    }
  }
}
