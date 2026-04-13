/**
 * Wedding Manager — Google Apps Script Web App
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
 *   { action: 'replaceAll',  sheet: 'Attendees', rows: [[...], ...] }
 *   { action: 'append',      sheet: 'Attendees', row: [...] }
 *   { action: 'ensureSheets' }   — create Attendees, Tables, Config if missing
 *
 * TABS USED:
 *   Attendees  — guest data (one guest per row, header = GUEST_COLS)
 *   Tables     — seating table data
 *   Config     — wedding info as key | value rows
 */

const SPREADSHEET_ID = '1hgAD078LFdzPEUKb3vgv8KXMd09n9EUlHR3ANP9SBMA';

const ALLOWED_SHEETS = ['Attendees', 'Tables', 'Config'];

/* ── Helpers ───────────────────────────────────────────────────────────── */

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
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

/* ── doPost ────────────────────────────────────────────────────────────── */

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action || 'append';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    /* ── ensureSheets: create any missing tabs ───────────────────────── */
    if (action === 'ensureSheets') {
      ALLOWED_SHEETS.forEach(function(name) { getOrCreateSheet(ss, name); });
      return jsonResponse({ ok: true, action: 'ensureSheets' });
    }

    /* Validate sheet name for all other actions */
    const sheetName = data.sheet;
    if (!ALLOWED_SHEETS.includes(sheetName)) {
      return jsonResponse({ ok: false, error: 'Sheet not allowed: ' + sheetName });
    }
    const sheet = getOrCreateSheet(ss, sheetName);

    /* ── replaceAll: clear sheet then bulk-write all rows ───────────── */
    if (action === 'replaceAll') {
      const rows = data.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        return jsonResponse({ ok: false, error: 'rows array is empty or missing' });
      }
      sheet.clearContents();
      sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      return jsonResponse({ ok: true, action: 'replaceAll', count: rows.length });
    }

    /* ── append: add a single row at the bottom ─────────────────────── */
    if (action === 'append') {
      const row = data.row;
      if (!Array.isArray(row)) {
        return jsonResponse({ ok: false, error: 'row is not an array' });
      }
      sheet.appendRow(row);
      return jsonResponse({ ok: true, action: 'append' });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

/* ── doGet: health check ───────────────────────────────────────────────── */

function doGet() {
  return jsonResponse({ ok: true, service: 'Wedding Manager', version: '1.5.0' });
}
