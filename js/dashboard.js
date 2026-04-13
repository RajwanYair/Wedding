'use strict';

/* ── Dashboard: Stats, Countdown, Header ── */
/* ── Top Bar ── */
function updateTopBar() {
  if (!el.topBarCouple) return;
  const g = _weddingInfo.groom || (_currentLang === 'he' ? 'חתן' : 'Groom');
  const b = _weddingInfo.bride || (_currentLang === 'he' ? 'כלה' : 'Bride');
  const dateStr = _weddingInfo.date ? ' 💍 ' + _weddingInfo.date.split('-').reverse().join('.') : '';
  el.topBarCouple.textContent = g + ' & ' + b + dateStr;
}

function updateHeaderInfo() {
  const rec       = document.getElementById('headerReception');
  const venueText = document.getElementById('headerVenueText');
  const venueChip = document.getElementById('headerVenueChip');
  if (rec) rec.textContent = _weddingInfo.time || '';
  if (venueText && venueChip) {
    const v = _weddingInfo.venue || '';
    venueText.textContent = v;
    venueChip.style.display = v ? '' : 'none';
  }
}


/* ── Stats ── */
function renderStats() {
  const total     = _guests.reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const confirmed = _guests.filter(function(g) { return g.status === 'confirmed'; }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const pending   = _guests.filter(function(g) { return g.status === 'pending';   }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const declined  = _guests.filter(function(g) { return g.status === 'declined';  }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const seated    = _guests.filter(function(g) { return g.tableId; }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const sent      = _guests.filter(function(g) { return g.sent; }).length;
  const groomSide = _guests.filter(function(g) { return g.side === 'groom'; }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const brideSide = _guests.filter(function(g) { return g.side === 'bride'; }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const vegCount  = _guests.filter(function(g) { return g.meal === 'vegetarian' || g.meal === 'vegan'; }).length;
  const accCount  = _guests.filter(function(g) { return g.accessibility; }).length;

  el.statTotal.textContent        = total;
  el.statConfirmed.textContent    = confirmed;
  el.statPending.textContent      = pending;
  el.statDeclined.textContent     = declined;
  el.statTables.textContent       = _tables.length;
  el.statSeated.textContent       = seated;
  el.statSent.textContent         = sent;
  el.statUnsent.textContent       = _guests.length - sent;
  el.statGroomSide.textContent    = groomSide;
  el.statBrideSide.textContent    = brideSide;
  el.statVeg.textContent          = vegCount;
  el.statAccessibility.textContent= accCount;
  el.guestCount.textContent       = _guests.length;

  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  el.progressFill.style.width   = pct + '%';
  el.progressPercent.textContent = pct + '%';

  renderCharts();
}

/* ── Countdown ── */
function renderCountdown() {
  if (!_weddingInfo.date) { el.countdown.innerHTML = ''; return; }
  const target = new Date(_weddingInfo.date + 'T' + (_weddingInfo.time || '18:00'));
  const diff   = target - new Date();

  if (diff <= 0) {
    el.countdown.innerHTML = '<div style="font-size:1.3em; color:var(--gold);">🎉 ' +
      (_currentLang === 'he' ? 'מזל טוב! היום הגדול הגיע!' : 'Mazel Tov! The big day is here!') + '</div>';
    return;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  const secs  = Math.floor((diff % 60000) / 1000);

  el.countdown.innerHTML =
    cdItem(days,  t('countdown_days'),  '📅') +
    cdItem(hours, t('countdown_hours'), '🕐') +
    cdItem(mins,  t('countdown_minutes'),'⏱️') +
    cdItem(secs,  t('countdown_seconds'),'✨');
}
function cdItem(n, label, icon) {
  return '<div class="countdown-item"><div class="countdown-number">' + n + '</div><div class="countdown-label">' + (icon || '') + ' ' + label + '</div></div>';
}

/* ── Badge Emoji Maps ── */
const STATUS_ICON = { confirmed: '✅', pending: '⏳', declined: '❌', maybe: '🤔' };
const SIDE_ICON   = { groom: '🤵', bride: '👰', mutual: '🤝' };
const MEAL_ICON   = { regular: '🍽️', vegetarian: '🥗', vegan: '🌱', kosher: '✡️', gluten_free: '🌾', other: '❓' };

/* ── Charts (Canvas donut) ── */

/**
 * Draw a donut chart on a canvas element.
 * segments: [{ value, color, label }, ...]
 * centerLabel: short text rendered in the middle (e.g. total count)
 */
function _drawDonut(canvas, segments, centerLabel) {
  const dpr  = window.devicePixelRatio || 1;
  const SIZE = 160;
  canvas.width  = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.width  = SIZE + 'px';
  canvas.style.height = SIZE + 'px';

  const ctx     = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, SIZE, SIZE);

  const cx = SIZE / 2, cy = SIZE / 2;
  const outerR = SIZE / 2 - 8;
  const innerR = outerR * 0.56;
  const total  = segments.reduce(function(s, seg) { return s + (seg.value || 0); }, 0);

  if (total === 0) {
    /* empty state: dashed ring */
    ctx.beginPath();
    ctx.arc(cx, cy, (outerR + innerR) / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = outerR - innerR;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '11px sans-serif';
    ctx.fillStyle    = 'rgba(240,230,214,0.35)';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('—', cx, cy);
    return;
  }

  let startAngle = -Math.PI / 2;
  const GAP = segments.filter(function(s) { return s.value > 0; }).length > 1 ? 0.03 : 0;

  segments.forEach(function(seg) {
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
  ctx.font         = 'bold 22px sans-serif';
  ctx.fillStyle    = 'rgba(240,230,214,0.95)';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy - 7);

  /* Center: label */
  ctx.font      = '10px sans-serif';
  ctx.fillStyle = 'rgba(240,230,214,0.5)';
  ctx.fillText(centerLabel, cx, cy + 10);
}

/** Build the color-dot legend below a chart */
function _buildLegend(legendEl, segments) {
  if (!legendEl) return;
  legendEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  segments.forEach(function(seg) {
    if (!seg.value) return;
    const item = document.createElement('div');
    item.className = 'chart-legend-item';
    const dot = document.createElement('span');
    dot.className = 'chart-legend-dot';
    dot.style.background = seg.color;
    const lbl = document.createElement('span');
    lbl.textContent = seg.label + '\u00a0' + seg.value;
    item.appendChild(dot);
    item.appendChild(lbl);
    frag.appendChild(item);
  });
  legendEl.appendChild(frag);
}

function renderCharts() {
  const canvasRsvp = document.getElementById('chartRsvp');
  const canvasMeal = document.getElementById('chartMeal');
  const canvasSide = document.getElementById('chartSide');
  if (!canvasRsvp || !canvasMeal || !canvasSide) return;

  /* ── RSVP ── */
  const confirmed = _guests.filter(function(g) { return g.status === 'confirmed'; }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const pending   = _guests.filter(function(g) { return g.status === 'pending';   }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const declined  = _guests.filter(function(g) { return g.status === 'declined';  }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const maybe     = _guests.filter(function(g) { return g.status === 'maybe';     }).reduce(function(s, g) { return s + (g.count || 1); }, 0);

  const rsvpSegs = [
    { value: confirmed, color: '#6ee7b7', label: t('status_confirmed') },
    { value: pending,   color: '#fcd34d', label: t('status_pending')   },
    { value: maybe,     color: '#d4a574', label: t('status_maybe')     },
    { value: declined,  color: '#fca5a5', label: t('status_declined')  },
  ];
  _drawDonut(canvasRsvp, rsvpSegs, t('chart_total'));
  _buildLegend(document.getElementById('chartRsvpLegend'), rsvpSegs);

  /* ── Meals (by number of guest records, not head count) ── */
  const mealCounts = { regular: 0, vegetarian: 0, vegan: 0, kosher: 0, gluten_free: 0, other: 0 };
  _guests.forEach(function(g) {
    const m = g.meal || 'regular';
    mealCounts[m] = (mealCounts[m] || 0) + 1;
  });
  const mealSegs = [
    { value: mealCounts.regular,    color: '#d4a574', label: t('meal_regular')     },
    { value: mealCounts.vegetarian, color: '#6ee7b7', label: t('meal_vegetarian')  },
    { value: mealCounts.vegan,      color: '#34d399', label: t('meal_vegan')       },
    { value: mealCounts.kosher,     color: '#d4a030', label: t('meal_kosher')      },
    { value: mealCounts.gluten_free,color: '#60a5fa', label: t('meal_gluten_free') },
    { value: mealCounts.other || 0, color: '#9ca3af', label: t('meal_other')       },
  ];
  _drawDonut(canvasMeal, mealSegs, t('chart_guests'));
  _buildLegend(document.getElementById('chartMealLegend'), mealSegs);

  /* ── Side ── */
  const groomCt  = _guests.filter(function(g) { return (g.side || 'mutual') === 'groom';  }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const brideCt  = _guests.filter(function(g) { return (g.side || 'mutual') === 'bride';  }).reduce(function(s, g) { return s + (g.count || 1); }, 0);
  const mutualCt = _guests.filter(function(g) { return (g.side || 'mutual') === 'mutual'; }).reduce(function(s, g) { return s + (g.count || 1); }, 0);

  const sideSegs = [
    { value: groomCt,  color: '#60a5fa', label: t('side_groom')  },
    { value: brideCt,  color: '#e8a0b4', label: t('side_bride')  },
    { value: mutualCt, color: '#d4a574', label: t('side_mutual') },
  ];
  _drawDonut(canvasSide, sideSegs, t('chart_total'));
  _buildLegend(document.getElementById('chartSideLegend'), sideSegs);
}
