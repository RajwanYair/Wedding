'use strict';

/* ── WhatsApp Integration ── */
/* ── WhatsApp ── */
function updateWaPreview() {
  const msg = fillTemplate(el.waTemplate.value, {
    name: _currentLang === 'he' ? 'ישראל כהן' : 'John Cohen',
  });
  el.waPreviewBubble.textContent = msg;
  const now = new Date();
  el.waPreviewTime.textContent = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
}

function fillTemplate(template, overrides) {
  return template
    .replace(/{name}/g,    overrides.name || '')
    .replace(/{groom}/g,   _weddingInfo.groom  || '')
    .replace(/{bride}/g,   _weddingInfo.bride  || '')
    .replace(/{date}/g,    _weddingInfo.date   ? formatDateHebrew(_weddingInfo.date) : '')
    .replace(/{hebrew_date}/g, _weddingInfo.hebrewDate || '')
    .replace(/{time}/g,    _weddingInfo.time   || '')
    .replace(/{ceremony}/g,_weddingInfo.ceremonyTime || '')
    .replace(/{venue}/g,   _weddingInfo.venue  || '')
    .replace(/{address}/g, _weddingInfo.address|| '')
    .replace(/{waze}/g,    _weddingInfo.wazeLink|| '');
}

function sendWhatsAppSingle(guestId) {
  const g = _guests.find(function(x) { return x.id === guestId; });
  if (!g || !g.phone) return;
  const msg   = fillTemplate(el.waTemplate.value, { name: g.firstName || guestFullName(g) });
  const phone = cleanPhone(g.phone);
  window.open('https://wa.me/' + encodeURIComponent(phone) + '?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
  g.sent = true;
  saveAll(); syncGuestsToSheets(); renderStats(); renderWaGuestList();
  showToast(t('toast_wa_opening'), 'success');
}

function sendWhatsAppAll(filter) {
  let list = _guests.filter(function(g) { return g.phone; });
  if (filter === 'pending') list = list.filter(function(g) { return g.status === 'pending'; });
  if (!list.length) return;
  list.forEach(function(g) { g.sent = true; });
  saveAll();
  syncGuestsToSheets();
  const first = list[0];
  const msg   = fillTemplate(el.waTemplate.value, { name: first.firstName || guestFullName(first) });
  window.open('https://wa.me/' + encodeURIComponent(cleanPhone(first.phone)) + '?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
  renderStats(); renderWaGuestList();
  showToast(t('toast_wa_opening') + ' (' + list.length + ')', 'success');
}

function renderWaGuestList() {
  const list = _guests.filter(function(g) { return g.phone; });
  if (!list.length) {
    el.waGuestList.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);"><div style="font-size:2.5em; margin-bottom:0.5rem;">📭</div>' + (_currentLang === 'he' ? 'אין אורחים עם מספר טלפון.' : 'No guests with phone numbers.') + '</div>';
    return;
  }
  el.waGuestList.innerHTML = '';
  list.forEach(function(g) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:0.8rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.03);';
    const sideKey = g.side || 'mutual';
    row.innerHTML =
      '<span style="font-size:1.1em;">' + (g.sent ? '✅' : '⏳') + '</span>' +
      '<span style="flex:1;font-size:0.9em;">' + escapeHtml(guestFullName(g)) + '</span>' +
      '<span class="side-badge side-' + sideKey + '" style="font-size:0.72em;"><span class="badge-icon">' + (SIDE_ICON[sideKey]||'') + '</span> ' + t('side_' + sideKey) + '</span>' +
      '<span style="font-size:0.8em;color:var(--text-muted);" dir="ltr">📞 ' + escapeHtml(g.phone) + '</span>' +
      '<button class="btn btn-whatsapp btn-small" onclick="sendWhatsAppSingle(\'' + g.id + '\')">💬 ' + t('btn_wa_send') + '</button>';
    el.waGuestList.appendChild(row);
  });
}

