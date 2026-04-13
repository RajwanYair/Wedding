'use strict';

/* ── Google Sheets Integration ── */
/* ── Google Sheets Integration ── */

/** Initialize the OAuth2 token client for Sheets API scope */
function initSheetsTokenClient() {
  if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.oauth2) return;
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE')) return;
  _sheetsTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SHEETS_SCOPE,
    callback: function(tokenResponse) {
      if (tokenResponse.error) { console.warn('Sheets token error:', tokenResponse.error); return; }
      _sheetsToken = tokenResponse.access_token;
      updateSheetsStatusBadge();
      loadFromSheets();
    },
  });
}

/** Request (or refresh) a Sheets API access token */
function requestSheetsAccess() {
  if (_sheetsToken) { loadFromSheets(); return; }
  if (!_sheetsTokenClient) initSheetsTokenClient();
  if (_sheetsTokenClient) _sheetsTokenClient.requestAccessToken({ prompt: '' });
}

/** Low-level Sheets API v4 fetch helper */
async function sheetsRequest(method, path, body) {
  if (!_sheetsToken) return null;
  const base = 'https://sheets.googleapis.com/v4/spreadsheets/' + SPREADSHEET_ID;
  let resp;
  try {
    resp = await fetch(base + path, {
      method: method,
      headers: Object.assign(
        { Authorization: 'Bearer ' + _sheetsToken },
        body ? { 'Content-Type': 'application/json' } : {}
      ),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (_e) { return null; }
  if (resp.status === 401) { _sheetsToken = null; updateSheetsStatusBadge(); return null; }
  if (!resp.ok) return null;
  return resp.json();
}

/** Write header rows to empty sheets; safe to call every load */
async function sheetsEnsureHeaders() {
  const gData = await sheetsRequest('GET', '/values/' + encodeURIComponent(SHEETS_GUESTS_TAB + '!A1:A1'));
  if (gData && !gData.values) {
    await sheetsRequest('PUT',
      '/values/' + encodeURIComponent(SHEETS_GUESTS_TAB + '!A1') + '?valueInputOption=RAW',
      { values: [GUEST_COLS] });
  }
  const tData = await sheetsRequest('GET', '/values/' + encodeURIComponent(SHEETS_TABLES_TAB + '!A1:A1'));
  if (tData && !tData.values) {
    await sheetsRequest('PUT',
      '/values/' + encodeURIComponent(SHEETS_TABLES_TAB + '!A1') + '?valueInputOption=RAW',
      { values: [TABLE_COLS] });
  }
}

/** Convert a guest object to a flat row array matching GUEST_COLS order */
function guestToRow(g) {
  return GUEST_COLS.map(function(k) {
    const v = g[k];
    return (v === undefined || v === null) ? '' : String(v);
  });
}

/** Build a guest object from a header row + data row */
function rowToGuest(headers, row) {
  const g = {};
  headers.forEach(function(h, i) { g[h] = row[i] !== undefined ? row[i] : ''; });
  g.count        = parseInt(g.count, 10) || 1;
  g.children     = parseInt(g.children, 10) || 0;
  g.accessibility = g.accessibility === 'true' || g.accessibility === true;
  g.sent          = g.sent === 'true' || g.sent === true;
  return g;
}

/** Convert a table object to a flat row array matching TABLE_COLS order */
function tableToRow(tbl) {
  return TABLE_COLS.map(function(k) { return String(tbl[k] !== undefined ? tbl[k] : ''); });
}

/** Build a table object from a header row + data row */
function rowToTable(headers, row) {
  const tbl = {};
  headers.forEach(function(h, i) { tbl[h] = row[i] !== undefined ? row[i] : ''; });
  tbl.capacity = parseInt(tbl.capacity, 10) || 10;
  return tbl;
}

/** Load all guests + tables from Sheets into in-memory state and localStorage */
async function loadFromSheets() {
  if (!_sheetsToken) return;
  showToast(t('toast_sheets_loading'), 2500);
  try {
    await sheetsEnsureHeaders();

    const gData = await sheetsRequest('GET', '/values/' + encodeURIComponent(SHEETS_GUESTS_TAB + '!A:U'));
    if (gData && gData.values && gData.values.length > 1) {
      const headers = gData.values[0];
      _guests = gData.values.slice(1)
        .filter(function(r) { return r[0]; })
        .map(function(r) { return rowToGuest(headers, r); });
      migrateGuests();
      save('guests', _guests);
    }

    const tData = await sheetsRequest('GET', '/values/' + encodeURIComponent(SHEETS_TABLES_TAB + '!A:D'));
    if (tData && tData.values && tData.values.length > 1) {
      const headers = tData.values[0];
      _tables = tData.values.slice(1)
        .filter(function(r) { return r[0]; })
        .map(function(r) { return rowToTable(headers, r); });
      save('tables', _tables);
    }

    renderGuests(); renderTables(); renderStats();
    if (document.getElementById('sec-settings').classList.contains('active')) renderDataSummary();
    showToast(t('toast_sheets_loaded'));
  } catch (_e) {
    showToast(t('toast_sheets_error'));
  }
}

/** Push all guests to Sheets (full replace). Fire-and-forget. */
async function syncGuestsToSheets() {
  save('guests', _guests);
  if (!_sheetsToken) return;
  try {
    await sheetsRequest('POST', '/values/' + encodeURIComponent(SHEETS_GUESTS_TAB) + ':clear', {});
    const rows = [GUEST_COLS].concat(_guests.map(guestToRow));
    await sheetsRequest('PUT',
      '/values/' + encodeURIComponent(SHEETS_GUESTS_TAB + '!A1') + '?valueInputOption=USER_ENTERED',
      { values: rows });
  } catch (_e) { /* offline — localStorage already saved */ }
}

/** Push all tables to Sheets (full replace). Fire-and-forget. */
async function syncTablesToSheets() {
  save('tables', _tables);
  if (!_sheetsToken) return;
  try {
    await sheetsRequest('POST', '/values/' + encodeURIComponent(SHEETS_TABLES_TAB) + ':clear', {});
    const rows = [TABLE_COLS].concat(_tables.map(tableToRow));
    await sheetsRequest('PUT',
      '/values/' + encodeURIComponent(SHEETS_TABLES_TAB + '!A1') + '?valueInputOption=USER_ENTERED',
      { values: rows });
  } catch (_e) {}
}

/**
 * Append a single RSVP row to Sheets via the Apps Script Web App.
 * Used for guest users who don't have an OAuth2 Sheets token.
 * Set SHEETS_WEBAPP_URL to enable.
 */
async function sheetsAppendRsvp(guest) {
  if (!SHEETS_WEBAPP_URL) return;
  try {
    await fetch(SHEETS_WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet: SHEETS_GUESTS_TAB, action: 'append', row: guestToRow(guest) }),
    });
  } catch (_e) {} // best-effort
}

/** Update the "Sheets: connected/disconnected" badge in the settings card */
function updateSheetsStatusBadge() {
  const badge = document.getElementById('sheetsBadge');
  if (!badge) return;
  const on = Boolean(_sheetsToken);
  badge.textContent  = on ? ('🟢 ' + t('sheets_status_on')) : ('🔴 ' + t('sheets_status_off'));
  badge.style.color  = on ? 'var(--positive)' : 'var(--text-muted)';
}

/** Called from the Sheets sync button in Settings */
function syncSheetsNow() {
  if (_sheetsToken) {
    loadFromSheets();
  } else if (_authUser && _authUser.isAdmin) {
    requestSheetsAccess();
  } else {
    showToast(t('sheets_status_off'));
  }
}

