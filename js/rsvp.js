'use strict';

/* ── RSVP ── */
/* ── RSVP ── */
function submitRSVP() {
  const firstName = document.getElementById('rsvpFirstName').value.trim();
  if (!firstName) { document.getElementById('rsvpFirstName').focus(); return; }

  const lastName     = document.getElementById('rsvpLastName').value.trim();
  const phone        = document.getElementById('rsvpPhone').value.trim();
  const side         = document.getElementById('rsvpSide').value;
  const status       = document.getElementById('rsvpAttending').value;
  const count        = parseInt(document.getElementById('rsvpGuests').value, 10)   || 1;
  const children     = parseInt(document.getElementById('rsvpChildren').value, 10) || 0;
  const meal         = document.getElementById('rsvpMeal').value;
  const accessibility= document.getElementById('rsvpAccessibility').checked;
  const notes        = document.getElementById('rsvpNotes').value.trim();
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

