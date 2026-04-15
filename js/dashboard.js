// @ts-check
"use strict";

/* ── Dashboard: Stats, Countdown, Header ── */

/* ── Scroll-triggered stat cards (IntersectionObserver) ── */
let _statObserver = null;

function _initStatObserver() {
  if (_statObserver) return;
  if (!("IntersectionObserver" in window)) return;
  _statObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.remove("stat-hidden");
          entry.target.classList.add("stat-visible");
          _statObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );
}

function _observeStatCards() {
  _initStatObserver();
  if (!_statObserver) return;
  document.querySelectorAll(".stat-card").forEach(function (card) {
    if (!card.classList.contains("stat-visible")) {
      card.classList.add("stat-hidden");
      _statObserver.observe(card);
    }
  });
}

/* ── Animated Counter ── */
function animateCounter(domEl, target) {
  if (!domEl) return;
  const prev = parseInt(domEl.textContent, 10) || 0;
  if (prev === target) return;
  const duration = 500;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    domEl.textContent = Math.round(prev + (target - prev) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
/* ── Top Bar ── */
function updateTopBar() {
  if (!window.el.topBarCouple) return;
  const g =
    window._weddingInfo.groom ||
    (window._currentLang === "he" ? "חתן" : "Groom");
  const b =
    window._weddingInfo.bride ||
    (window._currentLang === "he" ? "כלה" : "Bride");
  const dateStr = window._weddingInfo.date
    ? ` 💍 ${window._weddingInfo.date.split("-").reverse().join(".")}`
    : "";
  window.el.topBarCouple.textContent = `${g} & ${b}${dateStr}`;
}

function updateHeaderInfo() {
  const rec = document.getElementById("headerReception");
  const venueText = document.getElementById("headerVenueText");
  const venueChip = document.getElementById("headerVenueChip");
  if (rec) rec.textContent = window._weddingInfo.time || "";
  if (venueText && venueChip) {
    const v = window._weddingInfo.venue || "";
    venueText.textContent = v;
    venueChip.style.display = v ? "" : "none";
  }
}

/* ── Stats ── */
function renderStats() {
  const total = window._guests.reduce(function (s, g) {
    return s + (g.count || 1);
  }, 0);
  const confirmed = window._guests
    .filter(function (g) {
      return g.status === "confirmed";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const pending = window._guests
    .filter(function (g) {
      return g.status === "pending";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const declined = window._guests
    .filter(function (g) {
      return g.status === "declined";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const seated = window._guests
    .filter(function (g) {
      return g.tableId;
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const sent = window._guests.filter(function (g) {
    return g.sent;
  }).length;
  const groomSide = window._guests
    .filter(function (g) {
      return g.side === "groom";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const brideSide = window._guests
    .filter(function (g) {
      return g.side === "bride";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const vegCount = window._guests.filter(function (g) {
    return g.meal === "vegetarian" || g.meal === "vegan";
  }).length;
  const accCount = window._guests.filter(function (g) {
    return g.accessibility;
  }).length;
  const transportCount = window._guests.filter(function (g) {
    return g.transport && g.transport !== "none" && g.transport !== "";
  }).length;

  animateCounter(window.el.statTotal, total);
  animateCounter(window.el.statConfirmed, confirmed);
  animateCounter(window.el.statPending, pending);
  animateCounter(window.el.statDeclined, declined);
  animateCounter(window.el.statTables, window._tables.length);
  animateCounter(window.el.statSeated, seated);
  window.el.statSent.textContent = sent;
  window.el.statUnsent.textContent = window._guests.length - sent;
  animateCounter(window.el.statGroomSide, groomSide);
  animateCounter(window.el.statBrideSide, brideSide);
  animateCounter(window.el.statVeg, vegCount);
  animateCounter(window.el.statAccessibility, accCount);
  if (window.el.statTransport)
    animateCounter(window.el.statTransport, transportCount);
  window.el.guestCount.textContent = window._guests.length;

  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  window.el.progressFill.style.width = `${pct}%`;
  window.el.progressPercent.textContent = `${pct}%`;

  renderCharts();
  renderRsvpDeadlineBanner();
  _observeStatCards();
}

/**
 * Shows a banner on the dashboard when an RSVP deadline is near and guests are
 * still pending. Hidden automatically if deadline is >14 days away or no
 * pending guests remain.
 */
function renderRsvpDeadlineBanner() {
  const banner = document.getElementById("rsvpDeadlineBanner");
  if (!banner) return;
  const deadline = window._weddingInfo.rsvpDeadline;
  const pendingGuests = window._guests.filter(function (g) {
    return g.status === "pending";
  });
  if (!deadline || pendingGuests.length === 0) {
    banner.hidden = true;
    return;
  }
  const daysLeft = Math.ceil(
    (new Date(deadline).setHours(23, 59, 59) - Date.now()) / 86400000,
  );
  if (daysLeft > 14) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  banner.replaceChildren();

  const msgEl = document.createElement("span");
  msgEl.className = "deadline-msg";
  if (daysLeft < 0) {
    msgEl.textContent = window
      .t("rsvp_deadline_overdue")
      .replace("{n}", pendingGuests.length);
  } else if (daysLeft === 0) {
    msgEl.textContent = window
      .t("rsvp_deadline_today")
      .replace("{n}", pendingGuests.length);
  } else {
    msgEl.textContent = window
      .t("rsvp_deadline_banner")
      .replace("{days}", daysLeft)
      .replace("{n}", pendingGuests.length);
  }

  const btn = document.createElement("button");
  btn.className = "btn btn-green-api btn-small";
  btn.setAttribute("data-action", "sendWhatsAppAllViaApi");
  btn.setAttribute("data-action-arg", "pending");
  btn.textContent = window.t("rsvp_reminder_send");

  banner.appendChild(msgEl);
  banner.appendChild(btn);
}

/* ── Countdown ── */
function renderCountdown() {
  if (!window._weddingInfo.date) {
    window.el.countdown.replaceChildren();
    return;
  }
  const target = new Date(
    `${window._weddingInfo.date}T${window._weddingInfo.time || "18:00"}`,
  );
  const diff = target - new Date();

  if (diff <= 0) {
    const mazel = document.createElement("div");
    mazel.style.cssText = "font-size:1.3em; color:var(--gold);";
    mazel.textContent = `\ud83c\udf89 ${
      window._currentLang === "he"
        ? "\u05de\u05d6\u05dc \u05d8\u05d5\u05d1! \u05d4\u05d9\u05d5\u05dd \u05d4\u05d2\u05d3\u05d5\u05dc \u05d4\u05d2\u05d9\u05e2!"
        : "Mazel Tov! The big day is here!"
    }`;
    window.el.countdown.replaceChildren(mazel);
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  window.el.countdown.replaceChildren(
    cdItem(days, window.t("countdown_days"), "\ud83d\udcc5"),
    cdItem(hours, window.t("countdown_hours"), "\ud83d\udd50"),
    cdItem(mins, window.t("countdown_minutes"), "\u23f1\ufe0f"),
    cdItem(secs, window.t("countdown_seconds"), "\u2728"),
  );
}
function cdItem(n, label, icon) {
  const item = document.createElement("div");
  item.className = "countdown-item";
  const numEl = document.createElement("div");
  numEl.className = "countdown-number";
  numEl.textContent = n;
  const labelEl = document.createElement("div");
  labelEl.className = "countdown-label";
  labelEl.textContent = `${icon || ""} ${label}`;
  item.appendChild(numEl);
  item.appendChild(labelEl);
  return item;
}

/* ── Badge Emoji Maps ── */
const STATUS_ICON = {
  confirmed: "✅",
  pending: "⏳",
  declined: "❌",
  maybe: "🤔",
};
const SIDE_ICON = { groom: "🤵", bride: "👰", mutual: "🤝" };
const MEAL_ICON = {
  regular: "🍽️",
  vegetarian: "🥗",
  vegan: "🌱",
  kosher: "✡️",
  gluten_free: "🌾",
  other: "❓",
};

/* ── Charts (Canvas donut) ── */

/**
 * Draw a donut chart on a canvas element.
 * segments: [{ value, color, label }, ...]
 * centerLabel: short text rendered in the middle (e.g. total count)
 */
function _drawDonut(canvas, segments, centerLabel) {
  const dpr = window.devicePixelRatio || 1;
  const SIZE = 160;
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.width = `${SIZE}px`;
  canvas.style.height = `${SIZE}px`;

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, SIZE, SIZE);

  const cx = SIZE / 2,
    cy = SIZE / 2;
  const outerR = SIZE / 2 - 8;
  const innerR = outerR * 0.56;
  const total = segments.reduce(function (s, seg) {
    return s + (seg.value || 0);
  }, 0);

  if (total === 0) {
    /* empty state: dashed ring */
    ctx.beginPath();
    ctx.arc(cx, cy, (outerR + innerR) / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = outerR - innerR;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "rgba(240,230,214,0.35)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("—", cx, cy);
    return;
  }

  let startAngle = -Math.PI / 2;
  const GAP =
    segments.filter(function (s) {
      return s.value > 0;
    }).length > 1
      ? 0.03
      : 0;

  segments.forEach(function (seg) {
    if (!seg.value) return;
    const sweep = (seg.value / total) * Math.PI * 2;
    const sa = startAngle + GAP / 2;
    const ea = startAngle + sweep - GAP / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, sa, ea);
    ctx.arc(cx, cy, innerR, ea, sa, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    startAngle += sweep;
  });

  /* Center: total number */
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "rgba(240,230,214,0.95)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(total, cx, cy - 7);

  /* Center: label */
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "rgba(240,230,214,0.5)";
  ctx.fillText(centerLabel, cx, cy + 10);
}

/** Build the color-dot legend below a chart */
function _buildLegend(legendEl, segments) {
  if (!legendEl) return;
  legendEl.replaceChildren();
  const frag = document.createDocumentFragment();
  segments.forEach(function (seg) {
    if (!seg.value) return;
    const item = document.createElement("div");
    item.className = "chart-legend-item";
    const dot = document.createElement("span");
    dot.className = "chart-legend-dot";
    dot.style.background = seg.color;
    const lbl = document.createElement("span");
    lbl.textContent = `${seg.label}\u00a0${seg.value}`;
    item.appendChild(dot);
    item.appendChild(lbl);
    frag.appendChild(item);
  });
  legendEl.appendChild(frag);
}

function renderCharts() {
  const canvasRsvp = document.getElementById("chartRsvp");
  const canvasMeal = document.getElementById("chartMeal");
  const canvasSide = document.getElementById("chartSide");
  if (!canvasRsvp || !canvasMeal || !canvasSide) return;

  /* ── RSVP ── */
  const confirmed = window._guests
    .filter(function (g) {
      return g.status === "confirmed";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const pending = window._guests
    .filter(function (g) {
      return g.status === "pending";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const declined = window._guests
    .filter(function (g) {
      return g.status === "declined";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const maybe = window._guests
    .filter(function (g) {
      return g.status === "maybe";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);

  const rsvpSegs = [
    { value: confirmed, color: "#6ee7b7", label: window.t("status_confirmed") },
    { value: pending, color: "#fcd34d", label: window.t("status_pending") },
    { value: maybe, color: "#d4a574", label: window.t("status_maybe") },
    { value: declined, color: "#fca5a5", label: window.t("status_declined") },
  ];
  _drawDonut(canvasRsvp, rsvpSegs, window.t("chart_total"));
  _buildLegend(document.getElementById("chartRsvpLegend"), rsvpSegs);

  /* ── Meals (by number of guest records, not head count) ── */
  const mealCounts = {
    regular: 0,
    vegetarian: 0,
    vegan: 0,
    kosher: 0,
    gluten_free: 0,
    other: 0,
  };
  window._guests.forEach(function (g) {
    const m = g.meal || "regular";
    mealCounts[m] = (mealCounts[m] || 0) + 1;
  });
  const mealSegs = [
    {
      value: mealCounts.regular,
      color: "#d4a574",
      label: window.t("meal_regular"),
    },
    {
      value: mealCounts.vegetarian,
      color: "#6ee7b7",
      label: window.t("meal_vegetarian"),
    },
    {
      value: mealCounts.vegan,
      color: "#34d399",
      label: window.t("meal_vegan"),
    },
    {
      value: mealCounts.kosher,
      color: "#d4a030",
      label: window.t("meal_kosher"),
    },
    {
      value: mealCounts.gluten_free,
      color: "#60a5fa",
      label: window.t("meal_gluten_free"),
    },
    {
      value: mealCounts.other || 0,
      color: "#9ca3af",
      label: window.t("meal_other"),
    },
  ];
  _drawDonut(canvasMeal, mealSegs, window.t("chart_guests"));
  _buildLegend(document.getElementById("chartMealLegend"), mealSegs);

  /* ── Side ── */
  const groomCt = window._guests
    .filter(function (g) {
      return (g.side || "mutual") === "groom";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const brideCt = window._guests
    .filter(function (g) {
      return (g.side || "mutual") === "bride";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
  const mutualCt = window._guests
    .filter(function (g) {
      return (g.side || "mutual") === "mutual";
    })
    .reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);

  const sideSegs = [
    { value: groomCt, color: "#60a5fa", label: window.t("side_groom") },
    { value: brideCt, color: "#e8a0b4", label: window.t("side_bride") },
    { value: mutualCt, color: "#d4a574", label: window.t("side_mutual") },
  ];
  _drawDonut(canvasSide, sideSegs, window.t("chart_total"));
  _buildLegend(document.getElementById("chartSideLegend"), sideSegs);
}
