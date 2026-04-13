"use strict";
/* eslint-disable prefer-const -- state variables are reassigned across files */

/* ── Wedding Manager — Config & State v1.12.0 ── */

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
// Emails that receive full admin access to all app features.
// ⚠️  This is a client-side check — appropriate for a personal wedding app only.
const ADMIN_EMAILS = ["yair.rajwan@gmail.com", "ylipman@gmail.com"];

// Google Client ID — required for Google Sign-In and optional Sheets API v4 OAuth.
// Get from https://console.cloud.google.com → Credentials → OAuth 2.0 Client IDs
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

// Facebook App ID — required for Facebook Sign-In.
// Get from https://developers.facebook.com → My Apps
const FB_APP_ID = "";

// Apple Service ID — required for Sign in with Apple.
// Get from https://developer.apple.com → Certificates, Identifiers & Profiles → Services IDs
const APPLE_SERVICE_ID = "";

/* ── Google Sheets Config ── */
// Spreadsheet: https://docs.google.com/spreadsheets/d/1hgAD078LFdzPEUKb3vgv8KXMd09n9EUlHR3ANP9SBMA
const SPREADSHEET_ID = "1hgAD078LFdzPEUKb3vgv8KXMd09n9EUlHR3ANP9SBMA";
const SHEETS_GUESTS_TAB  = "Attendees"; // Sheet tab for guests
const SHEETS_TABLES_TAB  = "Tables";    // Sheet tab for seating tables
const SHEETS_CONFIG_TAB  = "Config";    // Sheet tab for wedding info (key-value)
// Deploy .github/scripts/sheets-webapp.gs as a Google Apps Script Web App
// (Execute as: Me | Who has access: Anyone), then paste the Web App URL here
// or enter it at runtime in the Settings → Google Sheets card:
const SHEETS_WEBAPP_URL  = "";
const SHEETS_SCOPE       = "https://www.googleapis.com/auth/spreadsheets";
const SHEETS_SYNC_INTERVAL_MS = 30000; // auto-reload interval in milliseconds
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
