/**
 * Wedding Manager — Google Apps Script Web App  v2.0.0
 * Handles all write operations from the Wedding Manager app.
 *
 * SETUP (one-time):
 *   1. Open: https://script.google.com  → New project
 *   2. Paste this file (replace the default Code.gs content)
 *   3. Deploy → New deployment
 *      - Type: Web App
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   4. Authorize when prompted (allows the script to edit your spreadsheet)
 *   5. Copy the Web App URL and paste it in the app:
 *      Settings → Google Sheets → Apps Script Web App URL → Save
 *
 * SUPPORTED ACTIONS (POST body is JSON):
 *   { action: 'replaceAll',    sheet: 'Attendees', rows: [[...], ...] }
 *   { action: 'append',        sheet: 'Attendees', row: [...] }
 *   { action: 'deleteRow',     sheet: 'Attendees', id: 'guest-id' }
 *   { action: 'ensureSheets' } — create Attendees, Tables, Config, Vendors, Expenses, RSVP_Log
 *   { action: 'sendEmail',     type: 'rsvpConfirmation'|'adminRsvpNotify', to, name, ... }
 *   { action: 'savePushSubscription', subscription: {...} }
 *
 * NEW in v2.0.0:
 *   • Vendors, Expenses, RSVP_Log sheet tabs supported (S3.7/S3.8)
 *   • deleteRow action: remove a row by id column (S3.3 optimistic delete)
 *   • Structured error objects: { ok, error, code } for client handling
 *   • getPushSubscriptions also available as POST action
 *
 * NEW in v1.20.0:
 *   • transport column (index 14) added to COL map and guest row validation
 *   • doGet ?action=getRowCount&sheet=X — used by the app to verify writes succeeded
 *
 * NEW in v1.18.0:
 *   • Server-side field validation (Sprint 4.1) — rejects malformed guest/RSVP data
 *   • Rate limiting via PropertiesService (Sprint 4.2) — max 30 req/min per deployment
 *   • Email notifications via MailApp (Sprint 3.6) — RSVP confirmations + admin alerts
 *
 * TABS USED:
 *   Attendees  — guest data (one guest per row, header = GUEST_COLS)
 *   Tables     — seating table data
 *   Config     — wedding info as key | value rows
 *   Vendors    — vendor/supplier data (S3.7)
 *   Expenses   — expense tracking (S3.7)
 *   RSVP_Log   — append-only RSVP audit trail (S3.7)
 */

const SPREADSHEET_ID = '1hgAD078LFdzPEUKb3vgv8KXMd09n9EUlHR3ANP9SBMA';

const ALLOWED_SHEETS = ['Attendees', 'Tables', 'Config', 'Vendors', 'Expenses', 'RSVP_Log'];

/* ── Index constants for Attendees columns (must match GUEST_COLS in config.js) ── */
var COL = {
  ID:           0,
  FIRST_NAME:   1,
  LAST_NAME:    2,
  PHONE:        3,
  EMAIL:        4,
  COUNT:        5,
  CHILDREN:     6,
  STATUS:       7,
  SIDE:         8,
  GROUP:        9,
  RELATIONSHIP: 10,
  MEAL:         11,
  MEAL_NOTES:   12,
  ACCESSIBILITY:13,
  TRANSPORT:    14,  // added v1.20.0
};

var VALID_STATUS    = ['pending', 'confirmed', 'declined', 'maybe', ''];
var VALID_SIDE      = ['groom', 'bride', 'mutual', ''];
var VALID_MEAL      = ['regular', 'vegetarian', 'vegan', 'gluten_free', 'kosher', ''];
var VALID_GROUP     = ['family', 'friends', 'work', 'other', ''];
var VALID_TRANSPORT = ['tefachot', 'jerusalem', '', null, undefined];

/* ── Helpers ───────────────────────────────────────────────────────────── */

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── Rate limiting (Sprint 4.2) ──────────────────────────────────────── */

/**
 * Tracks request counts per minute using ScriptProperties.
 * Key pattern: rl_YYYYMMDDHHMM  Value: request count (string).
 * Returns false (and should abort) when limit is exceeded.
 */
function _checkRateLimit() {
  try {
    var props = PropertiesService.getScriptProperties();
    var now   = new Date();
    var key   = 'rl_' + Utilities.formatDate(now, 'UTC', 'yyyyMMddHHmm');
    var count = parseInt(props.getProperty(key) || '0', 10);
    var LIMIT = 30;
    if (count >= LIMIT) { return false; }
    props.setProperty(key, String(count + 1));
    /* Purge entries older than 10 minutes to keep properties store clean */
    var cutoff = Utilities.formatDate(new Date(now.getTime() - 10 * 60000), 'UTC', 'yyyyMMddHHmm');
    var allKeys = props.getKeys();
    allKeys.forEach(function(k) {
      if (k.slice(0, 3) === 'rl_' && k.slice(3) < cutoff) {
        props.deleteProperty(k);
      }
    });
    return true;
  } catch (_e) {
    /* If PropertiesService fails, allow the request */
    return true;
  }
}

/* ── Input validation (Sprint 4.1) ──────────────────────────────────── */

/**
 * Validate a guest row array before writing to the Attendees sheet.
 * @param {Array} row — parallel to GUEST_COLS order
 * @returns {string|null} error message, or null if valid
 */
function _validateGuestRow(row) {
  if (!Array.isArray(row)) { return 'row must be an array'; }
  var fn = String(row[COL.FIRST_NAME] || '').trim();
  if (fn.length === 0)   { return 'firstName is required'; }
  if (fn.length > 100)   { return 'firstName exceeds 100 chars'; }
  var ln = String(row[COL.LAST_NAME] || '');
  if (ln.length > 100)   { return 'lastName exceeds 100 chars'; }
  var ph = String(row[COL.PHONE] || '');
  if (ph.length > 30)    { return 'phone exceeds 30 chars'; }
  var em = String(row[COL.EMAIL] || '').trim();
  if (em.length > 254)   { return 'email exceeds 254 chars'; }
  if (em && !em.includes('@')) { return 'email format invalid'; }
  var cnt = row[COL.COUNT];
  if (cnt !== '' && cnt !== null && cnt !== undefined) {
    var n = Number(cnt);
    if (isNaN(n) || n < 0 || n > 200) { return 'count out of range (0–200)'; }
  }
  var st = String(row[COL.STATUS] || '');
  if (VALID_STATUS.indexOf(st) === -1) { return 'invalid status: ' + st; }
  var si = String(row[COL.SIDE] || '');
  if (VALID_SIDE.indexOf(si) === -1)   { return 'invalid side: ' + si; }
  var ml = String(row[COL.MEAL] || '');
  if (VALID_MEAL.indexOf(ml) === -1)   { return 'invalid meal: ' + ml; }
  var gr = String(row[COL.GROUP] || '');
  if (VALID_GROUP.indexOf(gr) === -1)  { return 'invalid group: ' + gr; }
  var tr = row.length > COL.TRANSPORT ? (row[COL.TRANSPORT] || '') : '';
  if (VALID_TRANSPORT.indexOf(tr) === -1) { return 'invalid transport: ' + tr; }
  return null;
}

/* ── Email sending (Sprint 3.6) ──────────────────────────────────────── */

/**
 * Reads couple names from the Config sheet (graceful fallback to defaults).
 */
function _getCoupleNames(ss) {
  var groom = 'החתן', bride = 'הכלה';
  try {
    var cfg = ss.getSheetByName('Config');
    if (cfg) {
      var rows = cfg.getDataRange().getValues();
      rows.forEach(function(r) {
        if (r[0] === 'groom') { groom = r[1] || groom; }
        if (r[0] === 'bride') { bride = r[1] || bride; }
      });
    }
  } catch (_e) { /* ignore */ }
  return { groom: groom, bride: bride };
}

function _handleSendEmail(data) {
  var to = String(data.to || '').trim();
  if (!to || !to.includes('@')) {
    return jsonResponse({ ok: false, error: 'invalid recipient email' });
  }
  /* Validate recipient length */
  if (to.length > 254) {
    return jsonResponse({ ok: false, error: 'recipient email too long' });
  }
  var type = String(data.type || '');
  var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  var names = _getCoupleNames(ss);

  if (type === 'rsvpConfirmation') {
    var guestName = String(data.name   || '').slice(0, 100);
    var status    = String(data.status || 'confirmed').slice(0, 20);
    var subject   = 'אישור הגעה — חתונת ' + names.groom + ' ו' + names.bride;
    var body      = 'שלום ' + guestName + ',\n\n'
      + 'נרשמת לחתונה בהצלחה 🎉\n'
      + 'סטטוס: ' + status + '\n\n'
      + 'נשמח לראותך!\n'
      + names.groom + ' ו' + names.bride;
    MailApp.sendEmail(to, subject, body);
    return jsonResponse({ ok: true, action: 'sendEmail', type: 'rsvpConfirmation' });
  }

  if (type === 'adminRsvpNotify') {
    var notifyName   = String(data.name   || '').slice(0, 100);
    var notifyPhone  = String(data.phone  || '').slice(0, 30);
    var notifyStatus = String(data.status || '').slice(0, 20);
    var nSubject = 'RSVP חדשה: ' + notifyName;
    var nBody    = 'אורח/ת חדש/ה:\n'
      + 'שם: '    + notifyName   + '\n'
      + 'טלפון: ' + notifyPhone  + '\n'
      + 'סטטוס: ' + notifyStatus + '\n';
    MailApp.sendEmail(to, nSubject, nBody);
    return jsonResponse({ ok: true, action: 'sendEmail', type: 'adminRsvpNotify' });
  }

  return jsonResponse({ ok: false, error: 'unknown email type: ' + type });
}

/* ── Push subscription helpers (Sprint 5.4) ───────────────────────────── */

/**
 * Store (or update) a Web Push subscription endpoint in Script Properties.
 * Supports up to 10 subscriptions (multi-admin); de-duplicates by endpoint.
 */
function _savePushSubscription(data) {
  var sub = data.subscription;
  if (!sub || !sub.endpoint) {
    return jsonResponse({ ok: false, error: 'Missing subscription.endpoint' });
  }
  var props   = PropertiesService.getScriptProperties();
  var raw     = props.getProperty('push_subscriptions');
  var current = raw ? JSON.parse(raw) : [];
  // Remove any existing entry for the same endpoint
  current = current.filter(function(s) { return s.endpoint !== sub.endpoint; });
  current.push(sub);
  // Keep the most recent 10 subscriptions
  if (current.length > 10) current = current.slice(-10);
  props.setProperty('push_subscriptions', JSON.stringify(current));
  return jsonResponse({ ok: true, action: 'savePushSubscription', count: current.length });
}

/** Return all stored push subscriptions (consumed by scripts/send-push.mjs). */
function _getPushSubscriptions() {
  var props = PropertiesService.getScriptProperties();
  var raw   = props.getProperty('push_subscriptions');
  var subs  = raw ? JSON.parse(raw) : [];
  return jsonResponse({ ok: true, subscriptions: subs });
}

/* ── doPost ────────────────────────────────────────────────────────────── */

function doPost(e) {
  try {
    /* ── Rate limit check ── */
    if (!_checkRateLimit()) {
      return jsonResponse({ ok: false, error: 'Rate limit exceeded. Please try again in a minute.' });
    }

    var data   = JSON.parse(e.postData.contents);
    var action = data.action || 'append';

    /* ── Email action doesn't need a spreadsheet open ── */
    if (action === 'sendEmail') {
      return _handleSendEmail(data);
    }

    /* ── Push subscription storage ── */
    if (action === 'savePushSubscription') {
      return _savePushSubscription(data);
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    /* ── ensureSheets: create any missing tabs ───────────────────────── */
    if (action === 'ensureSheets') {
      /* Core tabs + new S3.7 tabs */
      var ensureList = ALLOWED_SHEETS;
      ensureList.forEach(function(name) { getOrCreateSheet(ss, name); });
      return jsonResponse({ ok: true, action: 'ensureSheets', sheets: ensureList });
    }

    /* Validate sheet name for all other actions */
    var sheetName = data.sheet;
    if (ALLOWED_SHEETS.indexOf(sheetName) === -1) {
      return jsonResponse({ ok: false, error: 'Sheet not allowed: ' + sheetName });
    }
    var sheet = getOrCreateSheet(ss, sheetName);

    /* ── replaceAll: clear sheet then bulk-write all rows ───────────── */
    if (action === 'replaceAll') {
      var rows = data.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        return jsonResponse({ ok: false, error: 'rows array is empty or missing' });
      }
      /* Validate guest rows when writing to Attendees (skip header row at index 0) */
      if (sheetName === 'Attendees') {
        for (var i = 1; i < rows.length; i++) {
          var rowErr = _validateGuestRow(rows[i]);
          if (rowErr) {
            return jsonResponse({ ok: false, error: 'Row ' + i + ': ' + rowErr });
          }
        }
      }
      sheet.clearContents();
      sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      return jsonResponse({ ok: true, action: 'replaceAll', count: rows.length });
    }

    /* ── append: add a single row at the bottom ─────────────────────── */
    if (action === 'append') {
      var row = data.row;
      if (!Array.isArray(row)) {
        return jsonResponse({ ok: false, error: 'row is not an array', code: 'INVALID_ROW' });
      }
      /* Validate guest row when appending to Attendees */
      if (sheetName === 'Attendees') {
        var appendErr = _validateGuestRow(row);
        if (appendErr) {
          return jsonResponse({ ok: false, error: appendErr, code: 'VALIDATION_ERROR' });
        }
      }
      sheet.appendRow(row);
      return jsonResponse({ ok: true, action: 'append' });
    }

    /* ── deleteRow: remove the first row where column 0 == id ──────── */
    if (action === 'deleteRow') {
      var targetId = String(data.id || '').trim();
      if (!targetId) {
        return jsonResponse({ ok: false, error: 'id is required for deleteRow', code: 'MISSING_ID' });
      }
      var lastRow = sheet.getLastRow();
      var deleted = 0;
      /* Iterate from bottom to top so row indices stay stable */
      for (var r = lastRow; r >= 2; r--) {
        var cellVal = String(sheet.getRange(r, 1).getValue() || '');
        if (cellVal === targetId) {
          sheet.deleteRow(r);
          deleted++;
          break; /* IDs are unique — stop after first match */
        }
      }
      return jsonResponse({ ok: true, action: 'deleteRow', deleted: deleted });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action, code: 'UNKNOWN_ACTION' });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString(), code: 'INTERNAL_ERROR' });
  }
}

/* ── doGet: health check + push subscriptions read ───────────────────────── */

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  if (params.action === 'getPushSubscriptions') {
    return _getPushSubscriptions();
  }
  /* Return row count for a sheet tab — used by the app to verify writes succeeded */
  if (params.action === 'getRowCount') {
    var sheetName = String(params.sheet || '');
    if (ALLOWED_SHEETS.indexOf(sheetName) === -1) {
      return jsonResponse({ ok: false, error: 'Sheet not allowed: ' + sheetName });
    }
    try {
      var ss2 = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sh2 = ss2.getSheetByName(sheetName);
      var cnt = sh2 ? Math.max(0, sh2.getLastRow() - 1) : -1; // −1 for header
      return jsonResponse({ ok: true, sheet: sheetName, count: cnt });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.toString() });
    }
  }
  return jsonResponse({ ok: true, service: 'Wedding Manager', version: '2.0.0' });
}
