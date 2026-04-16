// @ts-check
"use strict";
/* eslint-disable prefer-const -- state variables are reassigned across files */

/* ── Wedding Manager — Config & State v4.4.0 ── */

/**
 * @typedef {'pending'|'confirmed'|'declined'|'maybe'} GuestStatus
 * @typedef {'groom'|'bride'|'mutual'} GuestSide
 * @typedef {'family'|'friends'|'work'|'neighbors'|'other'} GuestGroup
 * @typedef {'regular'|'vegetarian'|'vegan'|'kosher'|'gluten_free'|'other'} MealType
 * @typedef {'none'|'tefachot'|'jerusalem'|''} TransportOption
 *
 * @typedef {Object} Guest
 * @property {string}          id
 * @property {string}          firstName
 * @property {string}          lastName
 * @property {string}          phone
 * @property {string}          email
 * @property {number}          count
 * @property {number}          children
 * @property {GuestStatus}     status
 * @property {GuestSide}       side
 * @property {GuestGroup}      group
 * @property {string}          relationship
 * @property {MealType}        meal
 * @property {string}          mealNotes
 * @property {boolean}         accessibility
 * @property {TransportOption} transport
 * @property {string}          tableId
 * @property {string}          gift
 * @property {string}          notes
 * @property {boolean}         sent
 * @property {boolean}         arrived
 * @property {string|null}     arrivedAt
 * @property {string}          rsvpDate
 * @property {string}          createdAt
 * @property {string}          updatedAt
 *
 * @typedef {'round'|'rect'} TableShape
 *
 * @typedef {Object} SeatingTable
 * @property {string}     id
 * @property {string}     name
 * @property {number}     capacity
 * @property {TableShape} shape
 *
 * @typedef {Object} WeddingInfo
 * @property {string}  groom
 * @property {string}  groomEn
 * @property {string}  bride
 * @property {string}  brideEn
 * @property {string}  date
 * @property {string}  hebrewDate
 * @property {string}  time
 * @property {string}  ceremonyTime
 * @property {string}  venue
 * @property {string}  address
 * @property {string}  wazeLink
 * @property {number}  giftBudget
 * @property {boolean} [transportEnabled]
 * @property {string}  [transportTefachotTime]
 * @property {string}  [transportTefachotAddress]
 * @property {string}  [transportJerusalemTime]
 * @property {string}  [transportJerusalemAddress]
 */

/* ── State ── */
/* ── State ── */
const STORAGE_PREFIX = "wedding_v1_";
/** @type {Guest[]} */
let _guests = [];
/** @type {SeatingTable[]} */
let _tables = [];
/** @type {WeddingInfo} */
const _weddingDefaults = {
  groom: "אליאור",
  groomEn: "Elior",
  bride: "טובה",
  brideEn: "Tova",
  date: "2026-05-07",
  hebrewDate: "כ' באייר התשפ\"ו",
  time: "18:00",
  ceremonyTime: "18:50",
  venue: "",
  address: "",
  wazeLink: "",
  giftBudget: 0,
  rsvpDeadline: "",
};
/** @type {WeddingInfo} */
let _weddingInfo = { ..._weddingDefaults };
/** @type {Array<{id:string,category:string,name:string,contact:string,phone:string,price:number,paid:number,notes:string}>} */
let _vendors = [];
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
let _isLightMode = false;
let _timeline = [];
let _editingTimelineId = null;
let _expenses = [];
let _editingExpenseId = null;
let _gallery = [];
let _auditLog = [];
let _clientErrors = [];

/* ── Auth Config ── */
// Emails that receive full admin access to all app features.
// ⚠️  This is a client-side check — appropriate for a personal wedding app only.
const ADMIN_EMAILS = [
  "yair.rajwan@gmail.com",
  "ylipman@gmail.com",
  "elior.rajwan@gmail.com",
  "anat.rajwan@gmail.com",
];

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
const SHEETS_GUESTS_TAB = "Attendees"; // Sheet tab for guests
const SHEETS_TABLES_TAB = "Tables"; // Sheet tab for seating tables
const SHEETS_CONFIG_TAB = "Config"; // Sheet tab for wedding info (key-value)
const SHEETS_VENDORS_TAB = "Vendors"; // Sheet tab for vendors (S3.7)
const SHEETS_EXPENSES_TAB = "Expenses"; // Sheet tab for expenses (S3.7)
const SHEETS_RSVP_LOG_TAB = "RSVP_Log"; // Sheet tab for append-only RSVP log (S3.7)
// Deploy .github/scripts/sheets-webapp.gs as a Google Apps Script Web App
// (Execute as: Me | Who has access: Anyone), then paste the Web App URL here
// or enter it at runtime in the Settings → Google Sheets card:
const SHEETS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbxGYuciHXLurYbZn9s-Gx8uMmBSn1dZ20xOFoZkk3JXg3RrzR741jz2tsIKgLtN8cHQ/exec";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
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
  "transport",
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

/* ── Web Push (Sprint 5.4) ── */
// VAPID public key for Web Push subscriptions.
// Generate a key pair once with: node -e "const c=require('crypto');const {pk}=c.generateKeyPairSync('ec',{namedCurve:'prime256v1',publicKeyEncoding:{type:'spki',format:'der'},privateKeyEncoding:{type:'pkcs8',format:'der'}});console.log(Buffer.from(pk).slice(-65).toString('base64url'));"
// Store the matching private key in the GAS Script Properties as VAPID_PRIVATE_KEY.
const VAPID_PUBLIC_KEY =
  "BENRJjMYCrikYTpaSsKJanxxLDB3_S-3NRzItZz8E_H-gkjsWl2qTeF3yFhJdPo7-XUckwGniggULBfOmU93vPQ";

/* ── WhatsApp Template State ── */
// Per-language templates — populated on first load from WA_DEFAULT_HE / WA_DEFAULT_EN
let _waTemplates = { he: "", en: "" };

/* ── Green API Config ── */
// Instance credentials for the Green API WhatsApp bridge (https://green-api.com)
// Stored in localStorage; never sent anywhere except api.green-api.com
let _greenApiConfig = { instanceId: "", apiToken: "" };
