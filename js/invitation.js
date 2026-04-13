'use strict';

/* ── Invitation ── */
/* ── Invitation ── */
function handleInvitationUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const validTypes = ['image/jpeg','image/png','image/svg+xml','image/gif','image/webp'];
  if (!validTypes.includes(file.type)) { showToast(t('toast_invalid_file'), 'error'); return; }
  if (file.size > 5 * 1024 * 1024)   { showToast('Max 5MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = function(ev) { _invitationDataUrl = ev.target.result; renderInvitation(); saveAll(); };
  reader.readAsDataURL(file);
}

const DEFAULT_INVITATION_SRC = 'invitation.jpg';

function renderInvitation() {
  let src = _invitationDataUrl || DEFAULT_INVITATION_SRC;
  /* Safety: only allow known relative paths or trusted data:image/ URLs */
  if (src !== DEFAULT_INVITATION_SRC && !src.startsWith('data:image/')) {
    _invitationDataUrl = '';
    src = DEFAULT_INVITATION_SRC;
  }
  el.invitationImage.innerHTML = '<img src="' + escapeHtml(src) + '" alt="Wedding Invitation" style="max-width:100%;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.35);">';
}

function renderDefaultInvitationSVG() {
  const groom   = _weddingInfo.groom   || (_currentLang === 'he' ? 'חתן' : 'Groom');
  const bride   = _weddingInfo.bride   || (_currentLang === 'he' ? 'כלה' : 'Bride');
  const groomEn = _weddingInfo.groomEn || 'Groom';
  const brideEn = _weddingInfo.brideEn || 'Bride';
  const showHebrew = _currentLang === 'he';
  const groomDisplay = showHebrew ? groom : groomEn;
  const brideDisplay = showHebrew ? bride : brideEn;
  const dateDisp   = _weddingInfo.date ? formatDateHebrew(_weddingInfo.date) : (_currentLang === 'he' ? 'תאריך לא נקבע' : 'Date TBD');
  const hebrewDate = _weddingInfo.hebrewDate || '';
  const time       = _weddingInfo.time        || '18:00';
  const venue      = _weddingInfo.venue       || (_currentLang === 'he' ? 'אולם האירועים' : 'Venue');
  const address    = _weddingInfo.address     || '';

  el.invitationImage.innerHTML =
    '<svg viewBox="0 0 500 720" xmlns="http://www.w3.org/2000/svg" style="max-width:420px; width:100%;">' +
      '<defs>' +
        '<linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
          '<stop offset="0%" style="stop-color:#1a0a2e"/><stop offset="100%" style="stop-color:#2d1b4e"/></linearGradient>' +
        '<linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
          '<stop offset="0%" style="stop-color:#b8864e"/><stop offset="50%" style="stop-color:#d4a574"/><stop offset="100%" style="stop-color:#b8864e"/></linearGradient>' +
      '</defs>' +
      '<rect width="500" height="720" rx="20" fill="url(#bgGrad)"/>' +
      '<rect x="10" y="10" width="480" height="700" rx="16" fill="none" stroke="url(#goldGrad)" stroke-width="1" opacity="0.5"/>' +
      '<rect x="22" y="22" width="456" height="676" rx="12" fill="none" stroke="url(#goldGrad)" stroke-width="0.5" opacity="0.25"/>' +
      '<path d="M150 80 Q200 50 250 80 Q300 50 350 80" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" opacity="0.7"/>' +
      '<text x="250" y="62" text-anchor="middle" font-size="24" fill="#d4a574" opacity="0.7">✦</text>' +
      '<circle cx="230" cy="145" r="24" fill="none" stroke="#d4a574" stroke-width="2.5" opacity="0.85"/>' +
      '<circle cx="270" cy="145" r="24" fill="none" stroke="#d4a574" stroke-width="2.5" opacity="0.85"/>' +
      '<text x="250" y="200" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#d4a574" opacity="0.75">' +
        (_currentLang === 'he' ? 'בשעה טובה ומוצלחת' : 'With great joy') +
      '</text>' +
      '<text x="250" y="268" text-anchor="middle" font-family="Georgia,serif" font-size="42" fill="#f0dcc4">' + escapeHtml(groomDisplay) + '</text>' +
      '<text x="250" y="306" text-anchor="middle" font-size="26" fill="#d4a574">❤</text>' +
      '<text x="250" y="346" text-anchor="middle" font-family="Georgia,serif" font-size="42" fill="#f0dcc4">' + escapeHtml(brideDisplay) + '</text>' +
      (hebrewDate ? '<text x="250" y="390" text-anchor="middle" font-size="16" fill="#e8c9a0" opacity="0.85">' + escapeHtml(hebrewDate) + '</text>' : '') +
      '<line x1="130" y1="412" x2="370" y2="412" stroke="url(#goldGrad)" stroke-width="0.8" opacity="0.45"/>' +
      '<text x="250" y="448" text-anchor="middle" font-size="15" fill="#e8c9a0">📅 ' + escapeHtml(dateDisp) + '</text>' +
      '<text x="250" y="480" text-anchor="middle" font-size="15" fill="#e8c9a0">🕐 ' + escapeHtml(time) + '</text>' +
      '<text x="250" y="512" text-anchor="middle" font-size="15" fill="#e8c9a0">📍 ' + escapeHtml(venue) + '</text>' +
      (address ? '<text x="250" y="540" text-anchor="middle" font-size="12" fill="#e8c9a0" opacity="0.7">' + escapeHtml(address) + '</text>' : '') +
      '<path d="M150 620 Q200 650 250 620 Q300 650 350 620" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" opacity="0.6"/>' +
      '<text x="250" y="672" text-anchor="middle" font-size="13" fill="#d4a574" opacity="0.55">' +
        (_currentLang === 'he' ? 'נשמח לראותכם! 💍' : 'We hope to see you! 💍') +
      '</text>' +
    '</svg>';
}

/* ── Venue Map (OpenStreetMap via Nominatim geocoding) ── */

/**
 * Geocode the wedding venue address via Nominatim and show an OSM embed iframe.
 * Falls back to a Google Maps search link if geocoding fails or no address is set.
 */
async function renderVenueMap() {
  const container = document.getElementById('venueMapContainer');
  if (!container) return;
  const addr = (_weddingInfo.address || '').trim();
  if (!addr) { container.style.display = 'none'; return; }
  container.style.display = '';

  const iframe   = document.getElementById('venueMapFrame');
  const fallback = document.getElementById('venueMapFallback');

  try {
    const geocodeUrl =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
      encodeURIComponent(addr);
    const resp = await fetch(geocodeUrl, {
      headers: { 'Accept-Language': 'he,en;q=0.8', 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (!resp.ok) throw new Error('geocode_http');
    const results = await resp.json();
    if (!Array.isArray(results) || !results.length) throw new Error('geocode_noresult');

    const lat    = parseFloat(results[0].lat);
    const lon    = parseFloat(results[0].lon);
    const margin = 0.008;
    const bbox   = (lon - margin) + ',' + (lat - margin) + ',' +
                   (lon + margin) + ',' + (lat + margin);

    if (iframe) {
      iframe.src           = 'https://www.openstreetmap.org/export/embed.html?bbox=' + bbox +
                             '&layer=mapnik&marker=' + lat + ',' + lon;
      iframe.style.display = '';
    }
    if (fallback) fallback.style.display = 'none';
  } catch (_err) {
    if (iframe)   iframe.style.display   = 'none';
    if (fallback) {
      fallback.href         = 'https://www.google.com/maps/search/' + encodeURIComponent(addr);
      fallback.style.display = '';
    }
  }
}
