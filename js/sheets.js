'use strict';

/* ── Google Sheets Integration ──────────────────────────────────────────────
   Reading  : public gviz/tq endpoint (no auth — works for any shared sheet)
   Writing  : Google Apps Script Web App, no-cors POST (deploy once, done)
   Auto-sync: polls every SHEETS_SYNC_INTERVAL_MS for remote changes
   ─────────────────────────────────────────────────────────────────────────── */

const _GVIZ_BASE = 'https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/gviz/tq';

/* Runtime state */
let _sheetsToken       = null; // OAuth2 token (legacy / optional)
let _sheetsTokenClient = null; // GIS token client (legacy / optional)
let _sheetsSyncTimer   = null; // setInterval handle
const _sheetsLastSig     = {};   // { tabName: fingerprint } for change detection

/* ── Runtime Web App URL (settable at runtime via Settings UI) ────────────── */

function _getWebAppUrl() {
  const stored = localStorage.getItem('wedding_v1_sheetsWebAppUrl');
  return (stored && stored.trim()) || (SHEETS_WEBAPP_URL || '');
}

/* ── Public Read via gviz/tq ─────────────────────────────────────────────── */

/**
 * Fetch a public sheet tab via the gviz/tq endpoint.
 * Works for sheets shared as "Anyone with the link can view/edit".
 * Returns the parsed gviz JSON object, or null on failure.
 */
async function sheetsGvizRead(tabName) {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.includes('YOUR')) return null;
  const url = _GVIZ_BASE + '?tqx=out:json&sheet=' + encodeURIComponent(tabName);
  try {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) return null;
    const text = await resp.text();
    const start = text.indexOf('{');
    const end   = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch (_e) { return null; }
}

/** Convert a gviz table response to an array of plain objects, keyed by column labels */
function _gvizToObjects(gvizData) {
  if (!gvizData || !gvizData.table || !gvizData.table.cols) return [];
  const cols = gvizData.table.cols.map(function(c) { return c.label || c.id || ''; });
  return (gvizData.table.rows || []).map(function(r) {
    const obj = {};
    cols.forEach(function(col, i) {
      obj[col] = (r.c && r.c[i] && r.c[i].v != null) ? String(r.c[i].v) : '';
    });
    return obj;
  }).filter(function(row) {
    return Object.values(row).some(function(v) { return v !== ''; });
  });
}

/** Extract a lightweight fingerprint for change detection from a gviz response */
function _gvizSig(gvizData) {
  if (!gvizData) return '';
  const sig  = gvizData.sig || '';
  const rows = (gvizData.table && gvizData.table.rows) ? gvizData.table.rows.length : 0;
  return sig + '|' + rows;
}

/* ── Row Converters ──────────────────────────────────────────────────────── */

function guestToRow(g) {
  return GUEST_COLS.map(function(k) {
    const v = g[k];
    return (v === undefined || v === null) ? '' : String(v);
  });
}

function rowToGuest(headers, row) {
  const g = {};
  headers.forEach(function(h, i) { g[h] = row[i] !== undefined ? row[i] : ''; });
  g.count        = parseInt(g.count, 10)  || 1;
  g.children     = parseInt(g.children, 10) || 0;
  g.accessibility = g.accessibility === 'true' || g.accessibility === true;
  g.sent          = g.sent === 'true'        || g.sent === true;
  return g;
}

function tableToRow(tbl) {
  return TABLE_COLS.map(function(k) { return String(tbl[k] !== undefined ? tbl[k] : ''); });
}

function rowToTable(headers, row) {
  const tbl = {};
  headers.forEach(function(h, i) { tbl[h] = row[i] !== undefined ? row[i] : ''; });
  tbl.capacity = parseInt(tbl.capacity, 10) || 10;
  return tbl;
}

/* ── Apps Script Write (no-cors, fire-and-forget) ────────────────────────── */

/**
 * POST a payload to the Apps Script Web App.
 * Uses no-cors so no CORS preflight is needed; response is opaque (ignored).
 */
async function _sheetsWebAppPost(payload) {
  const url = _getWebAppUrl();
  if (!url) return;
  try {
    await fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
  } catch (_e) { /* offline — localStorage already saved */ }
}

/* ── Load from Sheets (primary data source) ──────────────────────────────── */

/**
 * Load all three tabs from the public sheet and overwrite in-memory state +
 * localStorage.  Called on startup and whenever remote changes are detected.
 */
async function loadFromSheetsOnInit() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.includes('YOUR')) return;

  const [gData, tData, cfgData] = await Promise.all([
    sheetsGvizRead(SHEETS_GUESTS_TAB),
    sheetsGvizRead(SHEETS_TABLES_TAB),
    sheetsGvizRead(SHEETS_CONFIG_TAB),
  ]);

  /* Store fingerprints for change detection */
  if (gData)   _sheetsLastSig[SHEETS_GUESTS_TAB] = _gvizSig(gData);
  if (tData)   _sheetsLastSig[SHEETS_TABLES_TAB] = _gvizSig(tData);
  if (cfgData) _sheetsLastSig[SHEETS_CONFIG_TAB] = _gvizSig(cfgData);

  let reRender = false;

  if (gData && gData.table) {
    const objects = _gvizToObjects(gData).filter(function(r) { return r.id; });
    if (objects.length > 0) {
      _guests = objects.map(function(obj) {
        return rowToGuest(Object.keys(obj), Object.values(obj));
      });
      migrateGuests();
      save('guests', _guests);
      reRender = true;
    }
  }

  if (tData && tData.table) {
    const objects = _gvizToObjects(tData).filter(function(r) { return r.id; });
    if (objects.length > 0) {
      _tables = objects.map(function(obj) {
        return rowToTable(Object.keys(obj), Object.values(obj));
      });
      save('tables', _tables);
      reRender = true;
    }
  }

  if (cfgData && cfgData.table) {
    const objects = _gvizToObjects(cfgData);
    if (objects.length > 0) {
      const cfg = {};
      objects.forEach(function(r) { if (r.key) cfg[r.key] = r.value || ''; });
      if (Object.keys(cfg).length > 0) {
        _weddingInfo = Object.assign({}, _weddingDefaults, cfg);
        if (cfg.giftBudget !== undefined) {
          _weddingInfo.giftBudget = parseFloat(cfg.giftBudget) || 0;
        }
        save('wedding', _weddingInfo);
        reRender = true;
      }
    }
  }

  if (reRender) {
    renderGuests();
    renderTables();
    renderStats();
    updateHeaderInfo();
    updateTopBar();
    renderCountdown();
    loadWeddingDetailsToForm();
    updateSheetsStatusBadge();
    if (typeof renderBudget === 'function') renderBudget();
  }
}

/* ── Write to Sheets ─────────────────────────────────────────────────────── */

/** Push all guests to the Attendees tab (replaces full sheet contents) */
async function syncGuestsToSheets() {
  save('guests', _guests);
  const rows = [GUEST_COLS].concat(_guests.map(guestToRow));

  if (_getWebAppUrl()) {
    await _sheetsWebAppPost({ action: 'replaceAll', sheet: SHEETS_GUESTS_TAB, rows: rows });
  }

  /* Also sync via Sheets API v4 if an OAuth token is available */
  if (_sheetsToken) {
    try {
      await sheetsRequest('POST', '/values/' + encodeURIComponent(SHEETS_GUESTS_TAB) + ':clear', {});
      await sheetsRequest('PUT',
        '/values/' + encodeURIComponent(SHEETS_GUESTS_TAB + '!A1') + '?valueInputOption=USER_ENTERED',
        { values: rows });
    } catch (_e) { /* offline */ }
  }
}

/** Push all tables to the Tables tab (replaces full sheet contents) */
async function syncTablesToSheets() {
  save('tables', _tables);
  const rows = [TABLE_COLS].concat(_tables.map(tableToRow));

  if (_getWebAppUrl()) {
    await _sheetsWebAppPost({ action: 'replaceAll', sheet: SHEETS_TABLES_TAB, rows: rows });
  }

  if (_sheetsToken) {
    try {
      await sheetsRequest('POST', '/values/' + encodeURIComponent(SHEETS_TABLES_TAB) + ':clear', {});
      await sheetsRequest('PUT',
        '/values/' + encodeURIComponent(SHEETS_TABLES_TAB + '!A1') + '?valueInputOption=USER_ENTERED',
        { values: rows });
    } catch (_e) { /* offline */ }
  }
}

/** Push weddingInfo key-value pairs to the Config tab */
async function syncConfigToSheets() {
  save('wedding', _weddingInfo);
  const rows = [['key', 'value']].concat(
    Object.keys(_weddingInfo).map(function(k) {
      return [k, String(_weddingInfo[k] !== undefined ? _weddingInfo[k] : '')];
    })
  );
  if (_getWebAppUrl()) {
    await _sheetsWebAppPost({ action: 'replaceAll', sheet: SHEETS_CONFIG_TAB, rows: rows });
  }
}

/**
 * Append a single RSVP row via the Apps Script Web App.
 * Used for guest users who are not logged in as admins.
 */
async function sheetsAppendRsvp(guest) {
  await _sheetsWebAppPost({ action: 'append', sheet: SHEETS_GUESTS_TAB, row: guestToRow(guest) });
}

/* ── Auto-sync (Change Detection Polling) ────────────────────────────────── */

/** Check for remote changes; reload if any tab's fingerprint has changed */
async function _checkSheetsForChanges() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.includes('YOUR')) return;

  const [gData, tData, cfgData] = await Promise.all([
    sheetsGvizRead(SHEETS_GUESTS_TAB),
    sheetsGvizRead(SHEETS_TABLES_TAB),
    sheetsGvizRead(SHEETS_CONFIG_TAB),
  ]);

  const gSig   = _gvizSig(gData);
  const tSig   = _gvizSig(tData);
  const cfgSig = _gvizSig(cfgData);

  const changed =
    (gSig   && gSig   !== _sheetsLastSig[SHEETS_GUESTS_TAB]) ||
    (tSig   && tSig   !== _sheetsLastSig[SHEETS_TABLES_TAB]) ||
    (cfgSig && cfgSig !== _sheetsLastSig[SHEETS_CONFIG_TAB]);

  /* Update stored sigs regardless */
  if (gSig)   _sheetsLastSig[SHEETS_GUESTS_TAB] = gSig;
  if (tSig)   _sheetsLastSig[SHEETS_TABLES_TAB] = tSig;
  if (cfgSig) _sheetsLastSig[SHEETS_CONFIG_TAB] = cfgSig;

  if (changed) {
    await loadFromSheetsOnInit();
    showToast(t('toast_sheets_loaded'));
  }
}

/** Start the auto-sync polling loop */
function startSheetsAutoSync() {
  if (_sheetsSyncTimer) clearInterval(_sheetsSyncTimer);
  _sheetsSyncTimer = setInterval(_checkSheetsForChanges, SHEETS_SYNC_INTERVAL_MS);
}

/** Stop the auto-sync polling loop */
function stopSheetsAutoSync() {
  if (_sheetsSyncTimer) { clearInterval(_sheetsSyncTimer); _sheetsSyncTimer = null; }
}

/* ── OAuth2 (legacy — kept as optional path for direct Sheets API access) ── */

function initSheetsTokenClient() {
  const clientId = GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes('YOUR')) return;
  if (typeof window.google === 'undefined' || !window.google.accounts || !window.google.accounts.oauth2) return;
  _sheetsTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SHEETS_SCOPE,
    callback: function(tokenResponse) {
      if (tokenResponse.error) { console.warn('Sheets token error:', tokenResponse.error); return; }
      _sheetsToken = tokenResponse.access_token;
      updateSheetsStatusBadge();
      loadFromSheetsOnInit();
    },
  });
}

function requestSheetsAccess() {
  if (_sheetsToken) { loadFromSheetsOnInit(); return; }
  if (!_sheetsTokenClient) initSheetsTokenClient();
  if (_sheetsTokenClient) _sheetsTokenClient.requestAccessToken({ prompt: '' });
}

/** Low-level Sheets API v4 fetch helper (OAuth token required) */
async function sheetsRequest(method, path, body) {
  if (!_sheetsToken) return null;
  const base = 'https://sheets.googleapis.com/v4/spreadsheets/' + SPREADSHEET_ID;
  try {
    const resp = await fetch(base + path, {
      method: method,
      headers: Object.assign(
        { Authorization: 'Bearer ' + _sheetsToken },
        body ? { 'Content-Type': 'application/json' } : {}
      ),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (resp.status === 401) { _sheetsToken = null; updateSheetsStatusBadge(); return null; }
    if (!resp.ok) return null;
    return resp.json();
  } catch (_e) { return null; }
}

/* ── Settings UI ─────────────────────────────────────────────────────────── */

/** Update the status badge in Settings → Sheets card */
function updateSheetsStatusBadge() {
  const badge = document.getElementById('sheetsBadge');
  if (!badge) return;
  const hasSheet  = Boolean(SPREADSHEET_ID && !SPREADSHEET_ID.includes('YOUR'));
  const hasWriter = Boolean(_getWebAppUrl() || _sheetsToken);
  if (hasSheet && hasWriter) {
    badge.textContent = '\uD83D\uDFE2 ' + t('sheets_status_on');
    badge.style.color = 'var(--positive)';
  } else if (hasSheet) {
    badge.textContent = '\uD83D\uDFE1 ' + t('sheets_read_only');
    badge.style.color = 'var(--warning, #f59e0b)';
  } else {
    badge.textContent = '\uD83D\uDD34 ' + t('sheets_status_off');
    badge.style.color = 'var(--text-muted)';
  }
}

/** Save the Apps Script Web App URL entered in the Settings input */
function saveWebAppUrl() {
  const inp = document.getElementById('sheetsWebAppUrl');
  if (!inp) return;
  const url = inp.value.trim();
  localStorage.setItem('wedding_v1_sheetsWebAppUrl', url);
  updateSheetsStatusBadge();
  showToast(t('sheets_webapp_saved'), 'success');
}

/** Render current values into the Sheets settings card (called when Settings tab opens) */
function renderSheetsSettings() {
  const inp = document.getElementById('sheetsWebAppUrl');
  if (inp) inp.value = _getWebAppUrl();
  updateSheetsStatusBadge();
}

/** Create any missing sheet tabs via the Apps Script Web App */
async function createMissingSheetTabs() {
  if (!_getWebAppUrl()) { showToast(t('sheets_webapp_saved') + ' — ' + t('sheets_status_off'), 'warning'); return; }
  await _sheetsWebAppPost({ action: 'ensureSheets' });
  showToast(t('toast_sheets_loaded'), 'success');
}

/** Called from the Sheets sync button in Settings */
function syncSheetsNow() {
  loadFromSheetsOnInit().then(function() {
    showToast(t('toast_sheets_loaded'));
  });
}
