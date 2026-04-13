"use strict";
/* eslint-disable prefer-const -- state variables are reassigned across files */

/* ── Wedding Manager — Config & State v1.5.0 ── */

/* ── State ── */
/* ── State ── */
const STORAGE_PREFIX = "wedding_v1_";
let _guests = [];
let _tables = [];
const _weddingDefaults = {
  groom: "אליאור",
  groomEn: "Elior",
  bride: "טובה",
  brideEn: "Tova",
  date: "2026-05-07",
  hebrewDate: "כ' באייר התשפ\"ו",
  time: "18:00",
  ceremonyTime: "19:30",
  venue: "",
  address: "",
  wazeLink: "",
  giftBudget: 0,
};
let _weddingInfo = { ..._weddingDefaults };
let _invitationDataUrl = "";
let _currentFilter = "all";
let _sideFilter = "all";
let _sortCol = "";
let _sortAsc = true;
let _editingGuestId = null;
let _editingTableId = null;
let _currentLang = "he";
let _currentTheme = "";
const THEMES = [
  "",
  "theme-rosegold",
  "theme-gold",
  "theme-emerald",
  "theme-royal",
];
let _themeIndex = 0;

/* ── Auth Config ── */
// Google — replace with your OAuth 2.0 Client ID from https://console.cloud.google.com
//   APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application)
//   Authorized origins: http://localhost, https://rajwanyair.github.io
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

// Facebook — replace with your App ID from https://developers.facebook.com
//   My Apps → Create App → Consumer → Facebook Login for Business
//   Settings → Basic: App Domains = rajwanyair.github.io
const FB_APP_ID = "";

// Apple — replace with your Service ID from https://developer.apple.com
//   Certificates, IDs & Profiles → Services IDs → Sign In with Apple
//   Return URLs: https://rajwanyair.github.io/Wedding
const APPLE_SERVICE_ID = "";

// Emails that receive full admin access to all app features.
// ⚠️  This is a client-side check — appropriate for a personal wedding app only.
const ADMIN_EMAILS = ["yair.rajwan@gmail.com"];

/* ── Google Sheets Config ── */
// Spreadsheet: https://docs.google.com/spreadsheets/d/1hgAD078LFdzPEUKb3vgv8KXMd09n9EUlHR3ANP9SBMA
const SPREADSHEET_ID = "1hgAD078LFdzPEUKb3vgv8KXMd09n9EUlHR3ANP9SBMA";
const SHEETS_GUESTS_TAB = "Attendees"; // Rename Sheet1 → Attendees in your spreadsheet
const SHEETS_TABLES_TAB = "Tables"; // Rename Sheet2 → Tables  in your spreadsheet
// For guest RSVP without admin login: deploy .github/scripts/sheets-webapp.gs as a
// Google Apps Script Web App (Execute as: Me | Who has access: Anyone), then paste URL:
const SHEETS_WEBAPP_URL = "";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GUEST_COLS = [
  "id",
  "firstName",
  "lastName",
  "phone",
  "email",
  "count",
  "children",
  "status",
  "side",
  "group",
  "relationship",
  "meal",
  "mealNotes",
  "accessibility",
  "tableId",
  "gift",
  "notes",
  "sent",
  "rsvpDate",
  "createdAt",
  "updatedAt",
];
const TABLE_COLS = ["id", "name", "capacity", "shape"];

/* ── Auth State ── */
let _authUser = null; // null | { name, firstName, lastName, email, picture, isAdmin, provider }
let _sheetsToken = null; // OAuth2 access token for Sheets API (in-memory only)
let _sheetsTokenClient = null; // google.accounts.oauth2 token client instance
// Extra admin emails approved via Settings (stored in localStorage, merged with ADMIN_EMAILS)
let _approvedEmails = [];
// Runtime override for provider credentials (entered via Settings, stored in localStorage)
let _runtimeAuthConfig = { googleClientId: '', fbAppId: '', appleServiceId: '' };
