// @ts-check
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
  const confirmed = window._guests.filter(function (g) {
    return g.status === "confirmed";
  });
  const pending = window._guests.filter(function (g) {
    return g.status === "pending";
  });
  const declined = window._guests.filter(function (g) {
    return g.status === "declined";
  });
  const maybe = window._guests.filter(function (g) {
    return g.status === "maybe";
  });

  const totalGuests = window._guests.length;
  const adultsCount = window._guests.reduce(function (s, g) {
    return s + (g.count || 1);
  }, 0);
  const childCount = window._guests.reduce(function (s, g) {
    return s + (g.children || 0);
  }, 0);
  const confirmedHeads = confirmed.reduce(function (s, g) {
    return s + (g.count || 1);
  }, 0);

  const groomSide = window._guests.filter(function (g) {
    return g.side === "groom";
  }).length;
  const brideSide = window._guests.filter(function (g) {
    return g.side === "bride";
  }).length;
  const mutualSide = window._guests.filter(function (g) {
    return g.side === "mutual";
  }).length;

  const mealRegular = window._guests.filter(function (g) {
    return g.meal === "regular";
  }).length;
  const mealVeg = window._guests.filter(function (g) {
    return g.meal === "vegetarian";
  }).length;
  const mealVegan = window._guests.filter(function (g) {
    return g.meal === "vegan";
  }).length;
  const mealGluten = window._guests.filter(function (g) {
    return g.meal === "gluten_free";
  }).length;
  const mealKosher = window._guests.filter(function (g) {
    return g.meal === "kosher";
  }).length;

  const sentCount = window._guests.filter(function (g) {
    return g.sent;
  }).length;
  const unsentCount = totalGuests - sentCount;
  const accessCount = window._guests.filter(function (g) {
    return g.accessibility;
  }).length;

  /* ── 1) RSVP status donut ── */
  _renderRsvpDonut({
    confirmed: confirmed.length,
    pending: pending.length,
    declined: declined.length,
    maybe: maybe.length,
    total: totalGuests,
    confirmedHeads,
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

  /* ── 6) Meal summary for caterer ── */
  renderMealSummary();
}

function _renderRsvpDonut(d) {
  const el = document.getElementById("analyticsRsvpDonut");
  if (!el) return;
  el.replaceChildren();

  const segments = [
    {
      label: window.t("filter_confirmed"),
      value: d.confirmed,
      color: "var(--positive)",
    },
    {
      label: window.t("filter_pending"),
      value: d.pending,
      color: "var(--warning)",
    },
    {
      label: window.t("filter_declined"),
      value: d.declined,
      color: "var(--negative)",
    },
    { label: window.t("stat_maybe"), value: d.maybe, color: "var(--accent)" },
  ];

  const donut = buildDonutSVG(
    segments,
    String(d.total),
    window.t("stat_guests"),
  );
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
    note.textContent = window
      .t("analytics_confirmed_heads")
      .replace("{n}", d.confirmedHeads);
    el.appendChild(note);
  }
}

function _renderSideChart(groom, bride, mutual, total) {
  const el = document.getElementById("analyticsSideChart");
  if (!el) return;
  el.replaceChildren();
  const max = Math.max(groom, bride, mutual, 1);
  el.appendChild(
    buildBarRow(`🤵 ${  window.t("side_groom")}`, groom, max, "#60a5fa"),
  );
  el.appendChild(
    buildBarRow(`👰 ${  window.t("side_bride")}`, bride, max, "var(--rose)"),
  );
  el.appendChild(
    buildBarRow(`🤝 ${  window.t("side_mutual")}`, mutual, max, "var(--accent)"),
  );
  if (total > 0) {
    const note = document.createElement("p");
    note.style.cssText =
      "font-size:0.8rem; color:var(--text-muted); margin-top:0.3rem;";
    note.textContent = window.t("analytics_total_guests").replace("{n}", total);
    el.appendChild(note);
  }
}

function _renderMealChart(regular, veg, vegan, gluten, kosher, _total) {
  const el = document.getElementById("analyticsMealChart");
  if (!el) return;
  el.replaceChildren();
  const max = Math.max(regular, veg, vegan, gluten, kosher, 1);
  el.appendChild(
    buildBarRow(
      `🍽️ ${  window.t("meal_regular")}`,
      regular,
      max,
      "var(--accent)",
    ),
  );
  el.appendChild(
    buildBarRow(
      `🥗 ${  window.t("meal_vegetarian")}`,
      veg,
      max,
      "var(--positive)",
    ),
  );
  el.appendChild(
    buildBarRow(`🌱 ${  window.t("meal_vegan")}`, vegan, max, "#4ade80"),
  );
  el.appendChild(
    buildBarRow(
      `🌾 ${  window.t("meal_gluten_free")}`,
      gluten,
      max,
      "var(--warning)",
    ),
  );
  el.appendChild(
    buildBarRow(`🍽️ ${  window.t("meal_kosher")}`, kosher, max, "#c084fc"),
  );
}

function _renderSentChart(sent, unsent, _total) {
  const el = document.getElementById("analyticsSentChart");
  if (!el) return;
  el.replaceChildren();
  const max = Math.max(sent, unsent, 1);
  el.appendChild(
    buildBarRow(
      `📤 ${  window.t("progress_sent")}`,
      sent,
      max,
      "var(--positive)",
    ),
  );
  el.appendChild(
    buildBarRow(
      `📭 ${  window.t("progress_unsent")}`,
      unsent,
      max,
      "var(--warning)",
    ),
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

/**
 * Render a meal-type breakdown table with counts for confirmed guests.
 * Includes a "Copy for caterer" button that puts a formatted summary on the
 * clipboard.  Called at the end of renderAnalytics().
 */
function renderMealSummary() {
  const el = document.getElementById("analyticsMealSummary");
  if (!el) return;
  el.replaceChildren();

  const MEAL_TYPES = [
    "regular",
    "vegetarian",
    "vegan",
    "gluten_free",
    "kosher",
  ];
  const MEAL_ICONS = {
    regular: "🍽️",
    vegetarian: "🥗",
    vegan: "🌱",
    gluten_free: "🌾",
    kosher: "✡️",
  };

  /* Count adults and children per meal type (confirmed guests only) */
  const rows = MEAL_TYPES.map(function (meal) {
    const guests = window._guests.filter(function (g) {
      return g.status === "confirmed" && (g.meal || "regular") === meal;
    });
    const adults = guests.reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
    const children = guests.reduce(function (s, g) {
      return s + (g.children || 0);
    }, 0);
    return {
      meal,
      adults,
      children,
      total: adults + children,
    };
  }).filter(function (r) {
    return r.total > 0;
  });

  if (rows.length === 0) return;

  /* Card header */
  const header = document.createElement("div");
  header.className = "card-header";
  const icon = document.createElement("span");
  icon.className = "icon";
  icon.textContent = "📋";
  const title = document.createElement("span");
  title.setAttribute("data-i18n", "meal_summary_title");
  title.textContent = window.t("meal_summary_title");
  header.appendChild(icon);
  header.appendChild(document.createTextNode(" "));
  header.appendChild(title);
  el.appendChild(header);

  /* Table */
  const table = document.createElement("table");
  table.className = "meal-summary-table";

  /* Head */
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  [
    window.t("meal_type_label"),
    window.t("col_adults"),
    window.t("col_children_count"),
    window.t("stat_total"),
  ].forEach(function (h) {
    const th = document.createElement("th");
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  /* Body */
  const tbody = document.createElement("tbody");
  let grandAdults = 0,
    grandChildren = 0;
  rows.forEach(function (r) {
    const tr = document.createElement("tr");
    const tdMeal = document.createElement("td");
    tdMeal.textContent =
      `${MEAL_ICONS[r.meal] || ""  } ${  window.t(`meal_${  r.meal}`)}`;
    const tdAdults = document.createElement("td");
    tdAdults.textContent = r.adults;
    const tdChildren = document.createElement("td");
    tdChildren.textContent = r.children;
    const tdTotal = document.createElement("td");
    tdTotal.textContent = r.total;
    tr.appendChild(tdMeal);
    tr.appendChild(tdAdults);
    tr.appendChild(tdChildren);
    tr.appendChild(tdTotal);
    tbody.appendChild(tr);
    grandAdults += r.adults;
    grandChildren += r.children;
  });
  /* Totals row */
  const totalTr = document.createElement("tr");
  totalTr.className = "meal-summary-total";
  const tdLabel = document.createElement("td");
  tdLabel.textContent = window.t("stat_total");
  const tdTA = document.createElement("td");
  tdTA.textContent = grandAdults;
  const tdTC = document.createElement("td");
  tdTC.textContent = grandChildren;
  const tdTT = document.createElement("td");
  tdTT.textContent = grandAdults + grandChildren;
  totalTr.appendChild(tdLabel);
  totalTr.appendChild(tdTA);
  totalTr.appendChild(tdTC);
  totalTr.appendChild(tdTT);
  tbody.appendChild(totalTr);
  table.appendChild(tbody);
  el.appendChild(table);

  /* Copy for caterer button */
  const btn = document.createElement("button");
  btn.className = "btn btn-secondary btn-small u-mt-sm";
  btn.setAttribute("data-action", "copyMealSummary");
  btn.textContent = window.t("meal_summary_copy");
  el.appendChild(btn);
}

/**
 * Copy the meal summary as plain text to the clipboard (for the caterer).
 */
function copyMealSummary() {
  const MEAL_TYPES = [
    "regular",
    "vegetarian",
    "vegan",
    "gluten_free",
    "kosher",
  ];
  const MEAL_ICONS = {
    regular: "🍽️",
    vegetarian: "🥗",
    vegan: "🌱",
    gluten_free: "🌾",
    kosher: "✡️",
  };
  const isHe = window._currentLang === "he";
  const lines = [isHe ? "סיכום ארוחות לשף" : "Meal Summary for Caterer", ""];
  MEAL_TYPES.forEach(function (meal) {
    const guests = window._guests.filter(function (g) {
      return g.status === "confirmed" && (g.meal || "regular") === meal;
    });
    const adults = guests.reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
    const children = guests.reduce(function (s, g) {
      return s + (g.children || 0);
    }, 0);
    if (adults + children > 0) {
      const mealLabel = window.t(`meal_${  meal}`);
      lines.push(
        `${MEAL_ICONS[meal] || "" 
          } ${ 
          mealLabel 
          }: ${ 
          adults 
          }${isHe ? " מבוגרים" : " adults" 
          }${children > 0
            ? `, ${  children  }${isHe ? " ילדים" : " children"}`
            : ""}`,
      );
    }
  });
  const text = lines.join("\n");
  navigator.clipboard
    .writeText(text)
    .then(function () {
      window.showToast(window.t("meal_summary_copied"), "success");
    })
    .catch(function () {
      window.showToast(text, "info");
    });
}
