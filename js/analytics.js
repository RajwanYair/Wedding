"use strict";

/* ── RSVP Analytics Dashboard ── */

/* ─── SVG helpers ─────────────────────────────────────────── */

/**
 * Convert polar angle + radius to Cartesian (SVG coords).
 * angleDeg=0 → top (12 o'clock), increases clockwise.
 */
function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * Build an SVG arc path between two angles (for ring/donut segments).
 * Uses stroke, not fill — caller must set stroke-width to ring thickness.
 */
function arcPath(cx, cy, r, startDeg, endDeg) {
  /* Clamp tiny segments to avoid degenerate paths */
  if (endDeg - startDeg < 0.5) return "";
  /* Full circle edge case — draw two 180° arcs */
  if (endDeg - startDeg >= 359.9) {
    const mid = polarToXY(cx, cy, r, startDeg);
    const op = polarToXY(cx, cy, r, startDeg + 180);
    return `M ${mid.x} ${mid.y} A ${r} ${r} 0 0 1 ${op.x} ${op.y} A ${r} ${r} 0 0 1 ${mid.x} ${mid.y}`;
  }
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

/**
 * Build a donut SVG element.
 * @param {Array<{label:string, value:number, color:string}>} segments
 * @param {string} centerText  — displayed in the middle
 * @param {string} centerSub   — small sub-label below center text
 */
function buildDonutSVG(segments, centerText, centerSub) {
  const cx = 60,
    cy = 60,
    r = 42,
    sw = 14;
  const total = segments.reduce(function (s, x) {
    return s + x.value;
  }, 0);

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("role", "img");
  svg.style.cssText = "width:140px; height:140px; flex-shrink:0;";

  /* Background ring */
  const bg = document.createElementNS(ns, "circle");
  bg.setAttribute("cx", cx);
  bg.setAttribute("cy", cy);
  bg.setAttribute("r", r);
  bg.setAttribute("fill", "none");
  bg.setAttribute("stroke", "var(--glass-border)");
  bg.setAttribute("stroke-width", sw);
  svg.appendChild(bg);

  if (total > 0) {
    let cumDeg = 0;
    segments.forEach(function (seg) {
      if (!seg.value) return;
      const deg = (seg.value / total) * 360;
      const d = arcPath(cx, cy, r, cumDeg, cumDeg + deg);
      if (!d) {
        cumDeg += deg;
        return;
      }
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", seg.color);
      path.setAttribute("stroke-width", sw);
      path.setAttribute("stroke-linecap", "round");
      svg.appendChild(path);
      cumDeg += deg;
    });
  }

  /* Center text */
  const txt = document.createElementNS(ns, "text");
  txt.setAttribute("x", cx);
  txt.setAttribute("y", centerSub ? cy - 4 : cy + 5);
  txt.setAttribute("text-anchor", "middle");
  txt.setAttribute("font-size", "18");
  txt.setAttribute("font-weight", "bold");
  txt.setAttribute("fill", "var(--text-primary)");
  txt.textContent = centerText;
  svg.appendChild(txt);

  if (centerSub) {
    const sub = document.createElementNS(ns, "text");
    sub.setAttribute("x", cx);
    sub.setAttribute("y", cy + 12);
    sub.setAttribute("text-anchor", "middle");
    sub.setAttribute("font-size", "8");
    sub.setAttribute("fill", "var(--text-muted)");
    sub.textContent = centerSub;
    svg.appendChild(sub);
  }

  return svg;
}

/* ─── Bar chart helpers ────────────────────────────────────── */

/**
 * Build a horizontal bar-chart row.
 * @param {string} label
 * @param {number} value
 * @param {number} max
 * @param {string} color
 * @param {string} [suffix='']
 */
function buildBarRow(label, value, max, color, suffix) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const row = document.createElement("div");
  row.style.cssText =
    "display:flex; align-items:center; gap:0.6rem; margin-bottom:0.55rem;";

  const lbl = document.createElement("span");
  lbl.style.cssText =
    "min-width:105px; font-size:0.82rem; color:var(--text-secondary); text-align:end;";
  lbl.textContent = label;

  const track = document.createElement("div");
  track.style.cssText =
    "flex:1; background:var(--glass-border); border-radius:6px; height:10px; overflow:hidden;";

  const fill = document.createElement("div");
  fill.style.cssText = `width:${pct}%; background:${color}; height:100%; border-radius:6px; transition:width 0.5s ease;`;
  track.appendChild(fill);

  const val = document.createElement("span");
  val.style.cssText =
    "min-width:36px; font-size:0.82rem; font-weight:600; color:var(--text-primary);";
  val.textContent = value + (suffix || "");

  row.appendChild(lbl);
  row.appendChild(track);
  row.appendChild(val);
  return row;
}

/* ─── Legend helpers ───────────────────────────────────────── */
function buildLegend(segments, total) {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "display:flex; flex-direction:column; gap:0.4rem; justify-content:center;";
  segments.forEach(function (seg) {
    const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
    const row = document.createElement("div");
    row.style.cssText =
      "display:flex; align-items:center; gap:0.5rem; font-size:0.82rem;";
    const dot = document.createElement("span");
    dot.style.cssText = `width:10px; height:10px; border-radius:50%; background:${seg.color}; flex-shrink:0;`;
    const txt = document.createElement("span");
    txt.style.color = "var(--text-secondary)";
    txt.textContent = `${seg.label}: ${seg.value} (${pct}%)`;
    row.appendChild(dot);
    row.appendChild(txt);
    wrap.appendChild(row);
  });
  return wrap;
}

/* ─── Main render ──────────────────────────────────────────── */
function renderAnalytics() {
  const confirmed = _guests.filter(function (g) {
    return g.status === "confirmed";
  });
  const pending = _guests.filter(function (g) {
    return g.status === "pending";
  });
  const declined = _guests.filter(function (g) {
    return g.status === "declined";
  });
  const maybe = _guests.filter(function (g) {
    return g.status === "maybe";
  });

  const totalGuests = _guests.length;
  const adultsCount = _guests.reduce(function (s, g) {
    return s + (g.count || 1);
  }, 0);
  const childCount = _guests.reduce(function (s, g) {
    return s + (g.children || 0);
  }, 0);
  const confirmedHeads = confirmed.reduce(function (s, g) {
    return s + (g.count || 1);
  }, 0);

  const groomSide = _guests.filter(function (g) {
    return g.side === "groom";
  }).length;
  const brideSide = _guests.filter(function (g) {
    return g.side === "bride";
  }).length;
  const mutualSide = _guests.filter(function (g) {
    return g.side === "mutual";
  }).length;

  const mealRegular = _guests.filter(function (g) {
    return g.meal === "regular";
  }).length;
  const mealVeg = _guests.filter(function (g) {
    return g.meal === "vegetarian";
  }).length;
  const mealVegan = _guests.filter(function (g) {
    return g.meal === "vegan";
  }).length;
  const mealGluten = _guests.filter(function (g) {
    return g.meal === "gluten_free";
  }).length;
  const mealKosher = _guests.filter(function (g) {
    return g.meal === "kosher";
  }).length;

  const sentCount = _guests.filter(function (g) {
    return g.sent;
  }).length;
  const unsentCount = totalGuests - sentCount;
  const accessCount = _guests.filter(function (g) {
    return g.accessibility;
  }).length;

  /* ── 1) RSVP status donut ── */
  _renderRsvpDonut({
    confirmed: confirmed.length,
    pending: pending.length,
    declined: declined.length,
    maybe: maybe.length,
    total: totalGuests,
    confirmedHeads: confirmedHeads,
  });

  /* ── 2) Side distribution ── */
  _renderSideChart(groomSide, brideSide, mutualSide, totalGuests);

  /* ── 3) Meal preferences ── */
  _renderMealChart(
    mealRegular,
    mealVeg,
    mealVegan,
    mealGluten,
    mealKosher,
    totalGuests,
  );

  /* ── 4) Invitation sending ── */
  _renderSentChart(sentCount, unsentCount, totalGuests);

  /* ── 5) Headcount summary ── */
  _renderHeadcountSummary(adultsCount, childCount, confirmedHeads, accessCount);
}

function _renderRsvpDonut(d) {
  const el = document.getElementById("analyticsRsvpDonut");
  if (!el) return;
  el.innerHTML = "";

  const segments = [
    {
      label: t("filter_confirmed"),
      value: d.confirmed,
      color: "var(--positive)",
    },
    { label: t("filter_pending"), value: d.pending, color: "var(--warning)" },
    {
      label: t("filter_declined"),
      value: d.declined,
      color: "var(--negative)",
    },
    { label: t("stat_maybe"), value: d.maybe, color: "var(--accent)" },
  ];

  const donut = buildDonutSVG(segments, String(d.total), t("stat_guests"));
  const legend = buildLegend(segments, d.total);

  const wrap = document.createElement("div");
  wrap.style.cssText =
    "display:flex; align-items:center; gap:1.2rem; flex-wrap:wrap;";
  wrap.appendChild(donut);
  wrap.appendChild(legend);
  el.appendChild(wrap);

  /* headcount sub-note */
  if (d.total > 0 && d.confirmedHeads !== d.confirmed) {
    const note = document.createElement("p");
    note.style.cssText =
      "margin-top:0.5rem; font-size:0.8rem; color:var(--text-muted);";
    note.textContent = t("analytics_confirmed_heads").replace(
      "{n}",
      d.confirmedHeads,
    );
    el.appendChild(note);
  }
}

function _renderSideChart(groom, bride, mutual, total) {
  const el = document.getElementById("analyticsSideChart");
  if (!el) return;
  el.innerHTML = "";
  const max = Math.max(groom, bride, mutual, 1);
  el.appendChild(buildBarRow("🤵 " + t("side_groom"), groom, max, "#60a5fa"));
  el.appendChild(
    buildBarRow("👰 " + t("side_bride"), bride, max, "var(--rose)"),
  );
  el.appendChild(
    buildBarRow("🤝 " + t("side_mutual"), mutual, max, "var(--accent)"),
  );
  if (total > 0) {
    const note = document.createElement("p");
    note.style.cssText =
      "font-size:0.8rem; color:var(--text-muted); margin-top:0.3rem;";
    note.textContent = t("analytics_total_guests").replace("{n}", total);
    el.appendChild(note);
  }
}

function _renderMealChart(regular, veg, vegan, gluten, kosher, _total) {
  const el = document.getElementById("analyticsMealChart");
  if (!el) return;
  el.innerHTML = "";
  const max = Math.max(regular, veg, vegan, gluten, kosher, 1);
  el.appendChild(
    buildBarRow("🍽️ " + t("meal_regular"), regular, max, "var(--accent)"),
  );
  el.appendChild(
    buildBarRow("🥗 " + t("meal_vegetarian"), veg, max, "var(--positive)"),
  );
  el.appendChild(buildBarRow("🌱 " + t("meal_vegan"), vegan, max, "#4ade80"));
  el.appendChild(
    buildBarRow("🌾 " + t("meal_gluten_free"), gluten, max, "var(--warning)"),
  );
  el.appendChild(buildBarRow("✡️ " + t("meal_kosher"), kosher, max, "#c084fc"));
}

function _renderSentChart(sent, unsent, _total) {
  const el = document.getElementById("analyticsSentChart");
  if (!el) return;
  el.innerHTML = "";
  const max = Math.max(sent, unsent, 1);
  el.appendChild(
    buildBarRow("📤 " + t("progress_sent"), sent, max, "var(--positive)"),
  );
  el.appendChild(
    buildBarRow("📭 " + t("progress_unsent"), unsent, max, "var(--warning)"),
  );
}

function _renderHeadcountSummary(
  adults,
  children,
  confirmedHeads,
  accessCount,
) {
  const elAdults = document.getElementById("analyticsHeadAdults");
  const elChildren = document.getElementById("analyticsHeadChildren");
  const elTotal = document.getElementById("analyticsHeadTotal");
  const elConfirmed = document.getElementById("analyticsHeadConfirmed");
  const elAccess = document.getElementById("analyticsHeadAccess");
  if (elAdults) elAdults.textContent = adults;
  if (elChildren) elChildren.textContent = children;
  if (elTotal) elTotal.textContent = adults + children;
  if (elConfirmed) elConfirmed.textContent = confirmedHeads;
  if (elAccess) elAccess.textContent = accessCount;
}
