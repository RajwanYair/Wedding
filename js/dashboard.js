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
