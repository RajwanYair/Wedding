'use strict';

/* ── RSVP ── */

/** 90-second cooldown between RSVP submissions (guest users only) */
const _RSVP_COOLDOWN_MS = 90 * 1000;

function _rsvpCooldownOk() {
  const last = parseInt(localStorage.getItem(STORAGE_PREFIX + 'lastRsvp') || '0', 10);
  return (Date.now() - last) >= _RSVP_COOLDOWN_MS;
}

/**
 * Phone-first lookup: called on every input/blur of rsvpPhone.
 * - If phone has ≥7 digits → search guests by cleaned phone number.
 * - Found  → reveal form pre-filled with existing data, show "found" status.
 * - Not found → reveal empty form, show "new guest" status.
 * - Too short → hide form, show hint.
 */
function lookupRsvpByPhone() {
  const raw    = document.getElementById('rsvpPhone').value;
  const cleaned = cleanPhone(raw);
  const status  = document.getElementById('rsvpLookupStatus');
  const details = document.getElementById('rsvpDetails');

  /* Need at least 7 digits */
  if (cleaned.replace(/\D/g, '').length < 7) {
    details.style.display = 'none';
    status.style.display  = 'block';
    status.style.color    = 'var(--text-secondary)';
    status.textContent    = t('rsvp_phone_hint');
    return;
  }

  /* Search in-memory guests by cleaned phone */
  const match = _guests.find(function(g) {
    return g.phone && cleanPhone(g.phone) === cleaned;
  });

  details.style.display = '';

  if (match) {
    /* Pre-fill form with existing guest data */
    document.getElementById('rsvpFirstName').value          = match.firstName  || '';
    document.getElementById('rsvpLastName').value           = match.lastName   || '';
    document.getElementById('rsvpSide').value               = match.side       || 'groom';
    document.getElementById('rsvpAttending').value          = match.status     || 'confirmed';
    document.getElementById('rsvpGuests').value             = match.count      || 1;
    document.getElementById('rsvpChildren').value           = match.children   || 0;
    document.getElementById('rsvpMeal').value               = match.meal       || 'regular';
    document.getElementById('rsvpAccessibility').checked    = !!match.accessibility;
    document.getElementById('rsvpNotes').value              = match.notes      || '';
    status.style.display = 'block';
    status.style.color   = 'var(--positive, #34d399)';
    status.textContent   = t('rsvp_lookup_found');
  } else {
    /* Clear form for new guest entry */
    document.getElementById('rsvpFirstName').value       = '';
    document.getElementById('rsvpLastName').value        = '';
    document.getElementById('rsvpSide').value            = 'groom';
    document.getElementById('rsvpAttending').value       = 'confirmed';
    document.getElementById('rsvpGuests').value          = '1';
    document.getElementById('rsvpChildren').value        = '0';
    document.getElementById('rsvpMeal').value            = 'regular';
    document.getElementById('rsvpAccessibility').checked = false;
    document.getElementById('rsvpNotes').value           = '';
    status.style.display = 'block';
    status.style.color   = 'var(--text-secondary)';
    status.textContent   = t('rsvp_lookup_new');
  }
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
    if (navigator.onLine) {
      sheetsAppendRsvp(rsvpGuest);
    } else {
      /* Device is offline — queue for later */
      const row =
        typeof guestToRow === "function" ? guestToRow(rsvpGuest) : null;
      if (row) enqueueOfflineRsvp("rsvp", { action: "appendRsvp", row: row });
    }
  }

  logAudit("rsvp_submit", firstName + " " + lastName);

  /* Email notifications (Sprint 3.6) */
  const notifyGuest = existing || _guests[_guests.length - 1];
  sendRsvpConfirmation(notifyGuest);
  sendAdminRsvpNotify(notifyGuest);

  // Reset RSVP form
  ['rsvpFirstName','rsvpLastName','rsvpPhone','rsvpNotes'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('rsvpAttending').value = 'confirmed';
  document.getElementById('rsvpGuests').value    = '1';
  document.getElementById('rsvpChildren').value  = '0';
  document.getElementById('rsvpMeal').value      = 'regular';
  document.getElementById('rsvpAccessibility').checked = false;
  /* Hide details panel and reset lookup status */
  document.getElementById('rsvpDetails').style.display      = 'none';
  const st = document.getElementById('rsvpLookupStatus');
  st.style.display = 'block';
  st.style.color   = 'var(--text-secondary)';
  st.textContent   = t('rsvp_phone_hint');
}

