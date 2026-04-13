'use strict';

/* ── RSVP ── */

/** 90-second cooldown between RSVP submissions (guest users only) */
const _RSVP_COOLDOWN_MS = 90 * 1000;

function _rsvpCooldownOk() {
  const last = parseInt(localStorage.getItem(STORAGE_PREFIX + 'lastRsvp') || '0', 10);
  return (Date.now() - last) >= _RSVP_COOLDOWN_MS;
}

function submitRSVP() {
  /* Rate-limit unauthenticated/guest users to prevent spam submissions */
  if (!(_authUser && _authUser.isAdmin) && !_rsvpCooldownOk()) {
    showToast(t('toast_rsvp_cooldown'), 'warning'); return;
  }

  const firstName = sanitizeInput(document.getElementById('rsvpFirstName').value, 100);
  if (!firstName) { document.getElementById('rsvpFirstName').focus(); return; }

  const lastName     = sanitizeInput(document.getElementById('rsvpLastName').value, 100);
  const phone        = sanitizeInput(document.getElementById('rsvpPhone').value, 20);
  const notes        = sanitizeInput(document.getElementById('rsvpNotes').value, 1000);
  const status       = document.getElementById('rsvpAttending').value;
  const side         = document.getElementById('rsvpSide').value;
  const count        = parseInt(document.getElementById('rsvpGuests').value, 10)   || 1;
  const children     = parseInt(document.getElementById('rsvpChildren').value, 10) || 0;
  const meal         = document.getElementById('rsvpMeal').value;
  const accessibility= document.getElementById('rsvpAccessibility').checked;
  const now          = new Date().toISOString();

  // Match by phone or full name
  const existing = _guests.find(function(g) {
    return (phone && g.phone === phone) ||
      (guestFullName(g).toLowerCase() === (firstName + ' ' + lastName).trim().toLowerCase());
  });

  if (existing) {
    existing.status       = status;
    existing.count        = count;
    existing.children     = children;
    existing.meal         = meal;
    existing.accessibility= accessibility;
    if (notes) existing.notes = notes;
    if (lastName && !existing.lastName) existing.lastName = lastName;
    existing.rsvpDate = now;
    existing.updatedAt= now;
    showToast(t('toast_rsvp_updated'), 'success');
  } else {
    _guests.push({
      id: uid(), firstName, lastName, phone, email: '',
      count, children, status, side, group: 'other',
      relationship: '', meal, mealNotes: '', accessibility,
      tableId: '', notes, gift: '', sent: false,
      rsvpDate: now, createdAt: now, updatedAt: now,
    });
    showToast(t('toast_rsvp_submitted'), 'success');
  }

  saveAll(); renderGuests(); renderStats();
  /* Record submission timestamp for rate-limiting (guest users) */
  if (!(_authUser && _authUser.isAdmin)) {
    localStorage.setItem(STORAGE_PREFIX + 'lastRsvp', String(Date.now()));
  }
  // Sync to Google Sheets
  if (_authUser && _authUser.isAdmin) {
    syncGuestsToSheets();
  } else if (SHEETS_WEBAPP_URL) {
    const rsvpGuest = existing || _guests[_guests.length - 1];
    sheetsAppendRsvp(rsvpGuest);
  }

  // Reset RSVP form
  ['rsvpFirstName','rsvpLastName','rsvpPhone','rsvpNotes'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('rsvpAttending').value = 'confirmed';
  document.getElementById('rsvpGuests').value    = '1';
  document.getElementById('rsvpChildren').value  = '0';
  document.getElementById('rsvpMeal').value      = 'regular';
  document.getElementById('rsvpAccessibility').checked = false;
}

