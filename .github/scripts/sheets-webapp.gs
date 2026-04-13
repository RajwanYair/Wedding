/**
 * Wedding Manager — Google Apps Script Web App
 * Handles unauthenticated RSVP submissions from guest users
 * (Admin operations use Sheets API v4 directly via OAuth2 token)
 *
 * SETUP (one-time):
 *   1. Open: https://script.google.com
 *   2. New project → paste this file
 *   3. Edit SPREADSHEET_ID below to match your spreadsheet
 *   4. Deploy → New deployment → Type: Web App
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   5. Copy the Web App URL and paste it as SHEETS_WEBAPP_URL in index.html
 *
 * SPREADSHEET:
 *   Sheet "Attendees" — guest rows (columns match GUEST_COLS in index.html)
 *   Sheet "Tables"    — table rows  (columns match TABLE_COLS in index.html)
 */

const SPREADSHEET_ID = '1hgAD078LFdzPEUKb3vgv8KXMd09n9EUlHR3ANP9SBMA';

const ALLOWED_SHEETS = ['Attendees', 'Tables'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetName = data.sheet;

    if (!ALLOWED_SHEETS.includes(sheetName)) {
      return jsonResponse({ ok: false, error: 'Sheet not allowed: ' + sheetName });
    }

    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return jsonResponse({ ok: false, error: 'Sheet not found: ' + sheetName });
    }

    if (data.action === 'append' || !data.action) {
      sheet.appendRow(data.row);
      return jsonResponse({ ok: true, action: 'append' });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + data.action });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  return jsonResponse({ ok: true, service: 'Wedding Manager RSVP', version: '1.0' });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
