// =============================================================================
// Wedding Manager — Test Suite v1.12.0
// Run: node --test tests/wedding.test.mjs
// 291 tests — 192 core + 99 extended coverage
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(resolve(__dirname, '..', 'index.html'), 'utf8');
const SW = readFileSync(resolve(__dirname, '..', 'sw.js'), 'utf8');
const MANIFEST = JSON.parse(readFileSync(resolve(__dirname, '..', 'manifest.json'), 'utf8'));
const PKG = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));

// Read all CSS and JS source files
const CSS_DIR = resolve(__dirname, '..', 'css');
const JS_DIR = resolve(__dirname, '..', 'js');
const CSS = readdirSync(CSS_DIR).filter(function(f) { return f.endsWith('.css'); })
  .map(function(f) { return readFileSync(resolve(CSS_DIR, f), 'utf8'); }).join('\n');
const JS = readdirSync(JS_DIR).filter(function(f) { return f.endsWith('.js') && !f.startsWith('_'); })
  .map(function(f) { return readFileSync(resolve(JS_DIR, f), 'utf8'); }).join('\n');
// Combined sources for pattern matching (HTML + CSS + JS)
const SRC = HTML + '\n' + CSS + '\n' + JS;

// ── Version ──
describe('Version', function() {
  it("HTML contains v1.12.0", function () {
    assert.ok(SRC.includes("v1.12.0"));
  });

  it("SW cache name contains v1.12.0", function () {
    assert.ok(SW.includes("wedding-v1.12.0"));
  });

  it("package.json version is 1.12.0", function () {
    assert.equal(PKG.version, "1.12.0");
  });
});

// ── HTML Structure ──
describe('HTML Structure', function() {
  it('has DOCTYPE', function() {
    assert.ok(HTML.startsWith('<!DOCTYPE html>'));
  });

  it('has lang="he" and dir="rtl"', function() {
    assert.ok(SRC.includes('lang="he"'));
    assert.ok(SRC.includes('dir="rtl"'));
  });

  it('has viewport meta', function() {
    assert.ok(SRC.includes('name="viewport"'));
  });

  it('has charset meta', function() {
    assert.ok(SRC.includes('charset="UTF-8"'));
  });

  it('has title', function() {
    assert.ok(SRC.includes("<title>"));
  });

  it('links to manifest.json', function() {
    assert.ok(SRC.includes("manifest.json"));
  });

  it('links to icon.svg', function() {
    assert.ok(SRC.includes("icon.svg"));
  });
});

// ── Sections ──
describe('Sections', function() {
  const sections = ['dashboard', 'guests', 'tables', 'invitation', 'whatsapp', 'rsvp', 'settings'];
  sections.forEach(function(sec) {
    it('has section: ' + sec, function() {
      assert.ok(SRC.includes('id="sec-' + sec + '"'));
    });
  });

  it('has navigation tabs', function() {
    assert.ok(SRC.includes("nav-tabs"));
  });
});

// ── i18n ──
describe('i18n System', function() {
  it('has data-i18n attributes', function() {
    assert.ok(SRC.includes("data-i18n="));
  });

  it('has Hebrew translations object', function() {
    assert.ok(SRC.includes("he: {") || SRC.includes("he:{"));
  });

  it('has English translations object', function() {
    assert.ok(SRC.includes("en: {") || SRC.includes("en:{"));
  });

  it('has language toggle button', function() {
    assert.ok(SRC.includes("toggleLanguage"));
  });

  it('has t() function', function() {
    assert.ok(SRC.includes("function t("));
  });

  it('has applyLanguage function', function() {
    assert.ok(SRC.includes("function applyLanguage"));
  });
});

// ── Themes ──
describe('Themes', function() {
  it('has default theme (purple)', function() {
    assert.ok(SRC.includes("--accent: #d4a574"));
  });

  it('has rose gold theme', function() {
    assert.ok(SRC.includes("theme-rosegold"));
  });

  it('has classic gold theme', function() {
    assert.ok(SRC.includes("theme-gold"));
  });

  it('has emerald theme', function() {
    assert.ok(SRC.includes("theme-emerald"));
  });

  it('has royal blue theme', function() {
    assert.ok(SRC.includes("theme-royal"));
  });

  it('has cycleTheme function', function() {
    assert.ok(SRC.includes("function cycleTheme"));
  });
});

// ── Guest Management ──
describe('Guest Management', function() {
  it('has guest table', function() {
    assert.ok(SRC.includes('id="guestTableBody"'));
  });

  it('has add guest modal', function() {
    assert.ok(SRC.includes('id="guestModal"'));
  });

  it('has saveGuest function', function() {
    assert.ok(SRC.includes("function saveGuest"));
  });

  it('has deleteGuest function', function() {
    assert.ok(SRC.includes("function deleteGuest"));
  });

  it('has editGuest function', function() {
    assert.ok(SRC.includes("function editGuest"));
  });

  it('has search functionality', function() {
    assert.ok(SRC.includes('id="guestSearch"'));
  });

  it('has filter buttons', function() {
    assert.ok(SRC.includes("setFilter"));
  });

  it('has status badges (confirmed, pending, declined)', function() {
    assert.ok(SRC.includes("status-confirmed"));
    assert.ok(SRC.includes("status-pending"));
    assert.ok(SRC.includes("status-declined"));
  });

  it('has side filter (groom/bride/mutual)', function() {
    assert.ok(SRC.includes("setSideFilter"));
    assert.ok(SRC.includes("side-groom"));
    assert.ok(SRC.includes("side-bride"));
    assert.ok(SRC.includes("side-mutual"));
  });

  it('has meal preferences', function() {
    assert.ok(SRC.includes("meal_regular"));
    assert.ok(SRC.includes("meal_vegetarian"));
    assert.ok(SRC.includes("meal_vegan"));
  });

  it('has expanded guest model (firstName, lastName, side, meal, children)', function() {
    assert.ok(SRC.includes("guestFirstName"));
    assert.ok(SRC.includes("guestLastName"));
    assert.ok(SRC.includes("guestSide"));
    assert.ok(SRC.includes("guestMeal"));
    assert.ok(SRC.includes("guestChildren"));
    assert.ok(SRC.includes("guestAccessibility"));
  });

  it('has sortGuestsBy function', function() {
    assert.ok(SRC.includes("function sortGuestsBy"));
  });

  it('has data migration function', function() {
    assert.ok(SRC.includes("function migrateGuests"));
  });
});

// ── Table Seating ──
describe('Table Seating', function() {
  it('has seating floor', function() {
    assert.ok(SRC.includes('id="seatingFloor"'));
  });

  it('has table modal', function() {
    assert.ok(SRC.includes('id="tableModal"'));
  });

  it('has saveTable function', function() {
    assert.ok(SRC.includes("function saveTable"));
  });

  it('has deleteTable function', function() {
    assert.ok(SRC.includes("function deleteTable"));
  });

  it('supports round and rect shapes', function() {
    assert.ok(SRC.includes("shape_round"));
    assert.ok(SRC.includes("shape_rect"));
  });

  it('has drag-and-drop support', function() {
    assert.ok(SRC.includes("ondragstart"));
    assert.ok(SRC.includes("ondrop"));
    assert.ok(SRC.includes("ondragover"));
  });

  it('has unassigned guests section', function() {
    assert.ok(SRC.includes('id="unassignedGuests"'));
  });

  it('has printSeatingChart function', function() {
    assert.ok(SRC.includes('function printSeatingChart'));
  });

  it('seating chart uses Blob URL export (no document.write)', function() {
    assert.ok(JS.includes('new Blob([html]'));
    assert.ok(JS.includes('URL.createObjectURL'));
  });
});

// ── Budget & Gifts ──
describe('Budget & Gift Tracker', function() {
  it('has budget section in HTML', function() {
    assert.ok(HTML.includes('id="sec-budget"'));
  });

  it('has budget nav tab', function() {
    assert.ok(HTML.includes('data-tab="budget"'));
  });

  it('has budget JS module', function() {
    assert.ok(JS.includes('function renderBudget'));
  });

  it('has renderBudgetTable function', function() {
    assert.ok(JS.includes('function renderBudgetTable'));
  });

  it('has saveBudgetTarget function', function() {
    assert.ok(JS.includes('function saveBudgetTarget'));
  });

  it('has parseGiftAmount function', function() {
    assert.ok(JS.includes('function parseGiftAmount'));
  });

  it('giftBudget default in config', function() {
    assert.ok(JS.includes('giftBudget'));
  });

  it('budget uses gift field on guests', function() {
    assert.ok(JS.includes("g.gift"));
  });

  it('budget stats elements present in HTML', function() {
    assert.ok(HTML.includes('id="budgetStatGifts"'));
    assert.ok(HTML.includes('id="budgetStatTotal"'));
    assert.ok(HTML.includes('id="budgetStatPending"'));
  });
});

// ── Charts (v1.11.0) ──
describe('Dashboard Charts', function() {
  it('has charts card in dashboard HTML', function() {
    assert.ok(HTML.includes('id="sec-dashboard"'), 'dashboard section missing');
    assert.ok(HTML.includes('id="chartRsvp"'),   'chartRsvp canvas missing');
    assert.ok(HTML.includes('id="chartMeal"'),   'chartMeal canvas missing');
    assert.ok(HTML.includes('id="chartSide"'),   'chartSide canvas missing');
  });

  it('has chart legend containers', function() {
    assert.ok(HTML.includes('id="chartRsvpLegend"'), 'chartRsvpLegend missing');
    assert.ok(HTML.includes('id="chartMealLegend"'), 'chartMealLegend missing');
    assert.ok(HTML.includes('id="chartSideLegend"'), 'chartSideLegend missing');
  });

  it('has renderCharts function in dashboard.js', function() {
    assert.ok(JS.includes('function renderCharts'), 'renderCharts missing');
  });

  it('has _drawDonut helper function', function() {
    assert.ok(JS.includes('function _drawDonut'), '_drawDonut missing');
  });

  it('has _buildLegend helper function', function() {
    assert.ok(JS.includes('function _buildLegend'), '_buildLegend missing');
  });

  it('renderCharts is called from renderStats', function() {
    assert.ok(JS.includes('renderCharts()'), 'renderCharts() call missing');
  });

  it('chart i18n keys present in both languages', function() {
    assert.ok(JS.includes('charts_title'),    'charts_title key missing');
    assert.ok(JS.includes('chart_rsvp_title'),'chart_rsvp_title key missing');
    assert.ok(JS.includes('chart_meal_title'),'chart_meal_title key missing');
    assert.ok(JS.includes('chart_side_title'),'chart_side_title key missing');
    assert.ok(JS.includes('chart_total'),     'chart_total key missing');
    assert.ok(JS.includes('chart_guests'),    'chart_guests key missing');
  });

  it('chart CSS classes present in components.css', function() {
    assert.ok(CSS.includes('.charts-row'),        '.charts-row missing');
    assert.ok(CSS.includes('.chart-wrap'),         '.chart-wrap missing');
    assert.ok(CSS.includes('.chart-legend'),       '.chart-legend missing');
    assert.ok(CSS.includes('.chart-legend-item'),  '.chart-legend-item missing');
    assert.ok(CSS.includes('.chart-legend-dot'),   '.chart-legend-dot missing');
  });
});

// ── Analytics Section (v1.12.0) ──
describe('Analytics Section', function() {
  it('analytics.js has renderAnalytics function', function() {
    assert.ok(JS.includes('function renderAnalytics'), 'renderAnalytics missing');
  });

  it('analytics.js has SVG chart helpers', function() {
    assert.ok(JS.includes('function buildDonutSVG'), 'buildDonutSVG missing');
    assert.ok(JS.includes('function buildBarRow'),   'buildBarRow missing');
    assert.ok(JS.includes('function buildLegend'),   'buildLegend missing');
  });

  it('analytics section exists in HTML', function() {
    assert.ok(HTML.includes('id="sec-analytics"'), 'sec-analytics section missing');
  });

  it('analytics DOM IDs present in HTML', function() {
    assert.ok(HTML.includes('id="analyticsRsvpDonut"'),  'analyticsRsvpDonut missing');
    assert.ok(HTML.includes('id="analyticsSideChart"'),  'analyticsSideChart missing');
    assert.ok(HTML.includes('id="analyticsMealChart"'),  'analyticsMealChart missing');
    assert.ok(HTML.includes('id="analyticsSentChart"'),  'analyticsSentChart missing');
    assert.ok(HTML.includes('id="analyticsHeadAdults"'), 'analyticsHeadAdults missing');
    assert.ok(HTML.includes('id="analyticsHeadChildren"'), 'analyticsHeadChildren missing');
    assert.ok(HTML.includes('id="analyticsHeadTotal"'),  'analyticsHeadTotal missing');
    assert.ok(HTML.includes('id="analyticsHeadConfirmed"'), 'analyticsHeadConfirmed missing');
    assert.ok(HTML.includes('id="analyticsHeadAccess"'), 'analyticsHeadAccess missing');
  });

  it('analytics nav tab present in HTML', function() {
    assert.ok(HTML.includes('data-tab="analytics"'), 'analytics nav tab missing');
  });

  it('analytics.js is loaded as script in HTML', function() {
    assert.ok(HTML.includes('analytics.js'), 'analytics.js script tag missing');
  });

  it('renderAnalytics is called in nav.js showSection', function() {
    assert.ok(JS.includes("renderAnalytics()"), 'renderAnalytics() call missing in nav.js');
  });

  it('analytics is in adminOnly list in nav.js', function() {
    assert.ok(JS.includes("'analytics'"), "'analytics' not in adminOnly list");
  });

  it('analytics i18n keys present in both languages', function() {
    assert.ok(JS.includes('nav_analytics'),            'nav_analytics key missing');
    assert.ok(JS.includes('stat_maybe'),               'stat_maybe key missing');
    assert.ok(JS.includes('stat_guests'),              'stat_guests key missing');
    assert.ok(JS.includes('analytics_confirmed_heads'), 'analytics_confirmed_heads key missing');
    assert.ok(JS.includes('analytics_total_guests'),   'analytics_total_guests key missing');
    assert.ok(JS.includes('analytics_rsvp_title'),     'analytics_rsvp_title key missing');
    assert.ok(JS.includes('analytics_headcount_title'), 'analytics_headcount_title key missing');
  });

  it('analytics CSS classes present in components.css', function() {
    assert.ok(CSS.includes('.analytics-row'),              '.analytics-row missing');
    assert.ok(CSS.includes('.analytics-card'),             '.analytics-card missing');
    assert.ok(CSS.includes('.analytics-headcount-grid'),   '.analytics-headcount-grid missing');
    assert.ok(CSS.includes('.analytics-stat-box'),         '.analytics-stat-box missing');
    assert.ok(CSS.includes('.analytics-stat-num'),         '.analytics-stat-num missing');
    assert.ok(CSS.includes('.analytics-stat-lbl'),         '.analytics-stat-lbl missing');
    assert.ok(CSS.includes('.analytics-stat-highlight'),   '.analytics-stat-highlight missing');
  });
});

// ── WhatsApp ──
describe('WhatsApp Integration', function() {
  it('has WhatsApp template textarea', function() {
    assert.ok(SRC.includes('id="waTemplate"'));
  });

  it('has WhatsApp preview', function() {
    assert.ok(SRC.includes('id="waPreviewBubble"'));
  });

  it('has sendWhatsAppSingle function', function() {
    assert.ok(SRC.includes("function sendWhatsAppSingle"));
  });

  it('has sendWhatsAppAll function', function() {
    assert.ok(SRC.includes("function sendWhatsAppAll"));
  });

  it('uses wa.me deep link', function() {
    assert.ok(SRC.includes("wa.me/"));
  });

  it('has message placeholders', function() {
    assert.ok(SRC.includes("{name}"));
    assert.ok(SRC.includes("{groom}"));
    assert.ok(SRC.includes("{bride}"));
    assert.ok(SRC.includes("{date}"));
    assert.ok(SRC.includes("{venue}"));
  });

  it('opens in new tab with noopener', function() {
    assert.ok(SRC.includes("noopener"));
  });
});

// ── RSVP ──
describe('RSVP', function() {
  it('has RSVP first name field', function() {
    assert.ok(SRC.includes('id="rsvpFirstName"'));
  });

  it('has RSVP phone field', function() {
    assert.ok(SRC.includes('id="rsvpPhone"'));
  });

  it('has RSVP attendance field', function() {
    assert.ok(SRC.includes('id="rsvpAttending"'));
  });

  it('has submitRSVP function', function() {
    assert.ok(SRC.includes("function submitRSVP"));
  });

  it('has guest count input', function() {
    assert.ok(SRC.includes('id="rsvpGuests"'));
  });

  it('has dietary notes field', function() {
    assert.ok(SRC.includes('id="rsvpNotes"'));
  });

  it('has side selection (groom/bride/mutual)', function() {
    assert.ok(SRC.includes('id="rsvpSide"'));
  });

  it('has meal selection', function() {
    assert.ok(SRC.includes('id="rsvpMeal"'));
  });

  it('has children field', function() {
    assert.ok(SRC.includes('id="rsvpChildren"'));
  });

  it('has accessibility checkbox', function() {
    assert.ok(SRC.includes('id="rsvpAccessibility"'));
  });

  it('phone-first: rsvpPhone appears before rsvpFirstName in HTML', function() {
    assert.ok(HTML.indexOf('id="rsvpPhone"') < HTML.indexOf('id="rsvpFirstName"'),
      'rsvpPhone should come before rsvpFirstName');
  });

  it('phone-first: rsvpDetails div exists and starts hidden', function() {
    assert.ok(HTML.includes('id="rsvpDetails"'), 'rsvpDetails div missing');
    assert.ok(HTML.includes('id="rsvpDetails"') && HTML.includes('display:none'), 'rsvpDetails should start hidden');
  });

  it('phone-first: lookupRsvpByPhone function exists', function() {
    assert.ok(JS.includes('function lookupRsvpByPhone'), 'lookupRsvpByPhone missing');
  });

  it('phone-first: rsvpLookupStatus element exists', function() {
    assert.ok(HTML.includes('id="rsvpLookupStatus"'), 'rsvpLookupStatus missing');
  });

  it('phone-first: i18n keys present', function() {
    assert.ok(JS.includes('rsvp_phone_hint'),      'rsvp_phone_hint missing');
    assert.ok(JS.includes('rsvp_lookup_found'),    'rsvp_lookup_found missing');
    assert.ok(JS.includes('rsvp_lookup_new'),      'rsvp_lookup_new missing');
    assert.ok(JS.includes('rsvp_lookup_searching'),'rsvp_lookup_searching missing');
  });
});

// ── Invitation ──
describe('Invitation', function() {
  it('has invitation preview', function() {
    assert.ok(SRC.includes('id="invitationPreview"'));
  });

  it('has file upload', function() {
    assert.ok(SRC.includes('id="invitationFile"'));
  });

  it('has handleInvitationUpload function', function() {
    assert.ok(SRC.includes("function handleInvitationUpload"));
  });

  it('generates default SVG invitation', function() {
    assert.ok(SRC.includes("function renderDefaultInvitationSVG"));
  });

  it('validates file type', function() {
    assert.ok(SRC.includes("validTypes"));
  });

  it('validates file size', function() {
    assert.ok(SRC.includes("5 * 1024 * 1024"));
  });
});

// ── Wedding Details ──
describe('Wedding Details', function() {
  it('has groom name input', function() {
    assert.ok(SRC.includes('id="groomName"'));
  });

  it('has bride name input', function() {
    assert.ok(SRC.includes('id="brideName"'));
  });

  it('has wedding date input', function() {
    assert.ok(SRC.includes('id="weddingDate"'));
  });

  it('has venue input', function() {
    assert.ok(SRC.includes('id="venueName"'));
  });

  it('has countdown', function() {
    assert.ok(SRC.includes('id="countdown"'));
  });
});

// ── Data Persistence ──
describe('Data Persistence', function() {
  it('uses wedding_v1_ prefix', function() {
    assert.ok(SRC.includes("wedding_v1_"));
  });

  it('has save function', function() {
    assert.ok(SRC.includes("function save("));
  });

  it('has load function', function() {
    assert.ok(SRC.includes("function load("));
  });

  it('has saveAll function', function() {
    assert.ok(SRC.includes("function saveAll"));
  });

  it('has loadAll function', function() {
    assert.ok(SRC.includes("function loadAll"));
  });
});

// ── Export ──
describe('Export', function() {
  it('has CSV export', function() {
    assert.ok(SRC.includes("function exportGuestsCSV"));
  });

  it('includes UTF-8 BOM for Hebrew', function() {
    assert.ok(SRC.includes("\\uFEFF") || SRC.includes("BOM"));
  });

  it('has print function', function() {
    assert.ok(SRC.includes("function printGuests"));
  });

  it('has JSON backup export', function() {
    assert.ok(SRC.includes("function exportJSON"));
  });

  it('has JSON backup import', function() {
    assert.ok(SRC.includes("function importJSON"));
  });

  it('has CSV import', function() {
    assert.ok(SRC.includes("function importCSV"));
  });

  it('has CSV template download', function() {
    assert.ok(SRC.includes("function downloadCSVTemplate"));
  });

  it('has clearAllData function', function() {
    assert.ok(SRC.includes("function clearAllData"));
  });
});

// ── Security ──
describe('Security', function() {
  it('does not use eval()', function() {
    assert.ok(!SRC.includes("eval("));
  });

  it('does not use document.write()', function() {
    assert.ok(!SRC.includes("document.write("));
  });

  it('has escapeHtml function', function() {
    assert.ok(SRC.includes("function escapeHtml"));
  });

  it('uses textContent for safe rendering', function() {
    assert.ok(SRC.includes("textContent"));
  });

  it('has cleanPhone function', function() {
    assert.ok(SRC.includes("function cleanPhone"));
  });
});

// ── CSS ──
describe('CSS', function() {
  it('uses CSS custom properties', function() {
    assert.ok(SRC.includes(":root"));
    assert.ok(SRC.includes("var(--"));
  });

  it('has glassmorphism (backdrop-filter)', function() {
    assert.ok(SRC.includes("backdrop-filter: blur("));
  });

  it('has responsive breakpoints', function() {
    assert.ok(SRC.includes("768px"));
    assert.ok(SRC.includes("480px"));
  });

  it('has print stylesheet', function() {
    assert.ok(SRC.includes("@media print"));
  });

  it('respects prefers-reduced-motion', function() {
    assert.ok(SRC.includes("prefers-reduced-motion"));
  });

  it('has RTL-first layout styles', function() {
    assert.ok(SRC.includes('dir="rtl"'));
  });
});

// ── UI Components ──
describe('UI Components', function() {
  it('has toast notification system', function() {
    assert.ok(SRC.includes("function showToast"));
    assert.ok(SRC.includes('id="toastContainer"'));
  });

  it('has modals with close on escape', function() {
    assert.ok(SRC.includes("e.key === 'Escape'"));
  });

  it('has modals with close on overlay click', function() {
    assert.ok(SRC.includes("e.target === overlay"));
  });

  it('has progress bar', function() {
    assert.ok(SRC.includes('id="progressFill"'));
  });

  it('has empty states', function() {
    assert.ok(SRC.includes("empty-state"));
  });

  it('has floating particles', function() {
    assert.ok(SRC.includes("function initParticles"));
  });
});

// ── Service Worker ──
describe('Service Worker', function() {
  it('has cache name with version', function() {
    assert.ok(SW.includes('wedding-v1.12.0'));
  });

  it('pre-caches app shell', function() {
    assert.ok(SW.includes('APP_SHELL'));
    assert.ok(SW.includes('index.html'));
  });

  it('handles install event', function() {
    assert.ok(SW.includes("addEventListener('install'"));
  });

  it('handles activate event', function() {
    assert.ok(SW.includes("addEventListener('activate'"));
  });

  it('handles fetch event', function() {
    assert.ok(SW.includes("addEventListener('fetch'"));
  });

  it('cleans old caches on activate', function() {
    assert.ok(SW.includes('caches.delete'));
  });

  it('has offline fallback', function() {
    assert.ok(SW.includes('index.html'));
  });

  it('skip waiting only via message', function() {
    assert.ok(SW.includes('SKIP_WAITING'));
    assert.ok(!SW.includes('self.skipWaiting()') || SW.includes("'SKIP_WAITING'"));
  });
});

// ── Manifest ──
describe('Manifest', function() {
  it('has name', function() {
    assert.ok(MANIFEST.name);
  });

  it('has start_url', function() {
    assert.equal(MANIFEST.start_url, './index.html');
  });

  it('has icons', function() {
    assert.ok(MANIFEST.icons.length > 0);
  });

  it('has display mode', function() {
    assert.equal(MANIFEST.display, 'standalone');
  });

  it('has Hebrew language', function() {
    assert.equal(MANIFEST.lang, 'he');
  });

  it('has RTL direction', function() {
    assert.equal(MANIFEST.dir, 'rtl');
  });
});

// ── Package.json ──
describe('Package.json', function() {
  it('has test script', function() {
    assert.ok(PKG.scripts.test.includes('wedding.test.mjs'));
  });

  it('is private', function() {
    assert.equal(PKG.private, true);
  });

  it('is ESM module', function() {
    assert.equal(PKG.type, 'module');
  });
});

// ── Auth & User Access Management ──
describe('Auth & User Access Management', function() {
  it('has isApprovedAdmin function', function() {
    assert.ok(JS.includes('function isApprovedAdmin'));
  });

  it('has loadAuthConfig / saveAuthConfig', function() {
    assert.ok(JS.includes('function loadAuthConfig'));
    assert.ok(JS.includes('function saveAuthConfig'));
  });

  it('has submitEmailLogin function (email-allowlist sign-in)', function() {
    assert.ok(JS.includes('function submitEmailLogin'));
  });

  it('ADMIN_EMAILS contains yair.rajwan@gmail.com', function() {
    assert.ok(JS.includes('yair.rajwan@gmail.com'));
  });

  it('has addApprovedEmail / removeApprovedEmail', function() {
    assert.ok(JS.includes('function addApprovedEmail'));
    assert.ok(JS.includes('function removeApprovedEmail'));
  });

  it('has renderUserManager', function() {
    assert.ok(JS.includes('function renderUserManager'));
  });

  it('User Manager card present in settings HTML', function() {
    assert.ok(HTML.includes('id="cardUserManager"'));
    assert.ok(HTML.includes('id="approvedEmailsList"'));
    assert.ok(HTML.includes('id="newApproveEmail"'));
  });

  it('email sign-in modal present in HTML', function() {
    assert.ok(HTML.includes('id="adminLoginEmail"'));
    assert.ok(HTML.includes('submitEmailLogin'));
  });

  it('_approvedEmails declared in config', function() {
    assert.ok(JS.includes('_approvedEmails'));
  });

  it('has loginGuest and signOut functions', function() {
    assert.ok(JS.includes('function loginGuest'));
    assert.ok(JS.includes('function signOut'));
  });

  /* ── Google Sheets (v1.6.0) ── */
  it('config has SHEETS_CONFIG_TAB and SHEETS_SYNC_INTERVAL_MS', function() {
    assert.ok(JS.includes('SHEETS_CONFIG_TAB'));
    assert.ok(JS.includes('SHEETS_SYNC_INTERVAL_MS'));
  });

  it('sheets.js has sheetsGvizRead function', function() {
    assert.ok(JS.includes('function sheetsGvizRead'));
  });

  it('sheets.js has loadFromSheetsOnInit function', function() {
    assert.ok(JS.includes('function loadFromSheetsOnInit'));
  });

  it('sheets.js has syncConfigToSheets function', function() {
    assert.ok(JS.includes('function syncConfigToSheets'));
  });

  it('sheets.js has startSheetsAutoSync / stopSheetsAutoSync', function() {
    assert.ok(JS.includes('function startSheetsAutoSync'));
    assert.ok(JS.includes('function stopSheetsAutoSync'));
  });

  it('sheets.js has saveWebAppUrl / renderSheetsSettings', function() {
    assert.ok(JS.includes('function saveWebAppUrl'));
    assert.ok(JS.includes('function renderSheetsSettings'));
  });

  it('Sheets settings card has sheetsWebAppUrl input and open link', function() {
    assert.ok(HTML.includes('id="sheetsWebAppUrl"'));
    assert.ok(HTML.includes('docs.google.com/spreadsheets/d/'));
  });

  it('apps script supports replaceAll and ensureSheets', function() {
    const GS = readFileSync(resolve(__dirname, '..', '.github', 'scripts', 'sheets-webapp.gs'), 'utf8');
    assert.ok(GS.includes("action === 'replaceAll'"));
    assert.ok(GS.includes("action === 'ensureSheets'"));
    assert.ok(GS.includes("'Config'"));
  });
});

/* ── Security (v1.7.0 + v1.9.0) ── */
describe('Security hardening', function() {
  it('CSP meta tag present with required directives', function() {
    assert.ok(HTML.includes('Content-Security-Policy'), 'CSP meta tag missing');
    assert.ok(HTML.includes("object-src 'none'"), "object-src 'none' missing");
    assert.ok(HTML.includes("base-uri 'self'"), "base-uri 'self' missing");
    assert.ok(HTML.includes("frame-ancestors 'none'"), "frame-ancestors missing");
    assert.ok(HTML.includes("form-action 'self'"), "form-action missing");
  });

  it('framebusting inline script present in HTML', function() {
    assert.ok(HTML.includes('window.top!==window.self'), 'framebusting script missing');
  });

  it('referrer-policy meta tag present', function() {
    assert.ok(HTML.includes('strict-origin-when-cross-origin'), 'referrer-policy missing');
  });

  it('sanitizeInput and isValidHttpsUrl defined in utils.js', function() {
    assert.ok(JS.includes('function sanitizeInput'), 'sanitizeInput missing');
    assert.ok(JS.includes('function isValidHttpsUrl'), 'isValidHttpsUrl missing');
  });

  it('RSVP rate-limiting present in rsvp.js', function() {
    assert.ok(JS.includes('_RSVP_COOLDOWN_MS'), '_RSVP_COOLDOWN_MS missing');
    assert.ok(JS.includes('_rsvpCooldownOk'), '_rsvpCooldownOk missing');
    assert.ok(JS.includes("'lastRsvp'"), 'lastRsvp cooldown key missing');
  });

  it('invitation.js guards against non-image data URLs', function() {
    assert.ok(JS.includes("data:image/"), 'data:image/ guard missing in invitation.js');
  });

  it('wazeLink validated against HTTPS-only in settings.js', function() {
    assert.ok(JS.includes('isValidHttpsUrl'), 'isValidHttpsUrl not called in JS');
    assert.ok(JS.includes('toast_invalid_url'), 'invalid URL toast key missing');
  });

  it('all target=_blank links have both noopener and noreferrer', function() {
    const blankLinks = HTML.match(/target="_blank"[^>]*/g) || [];
    blankLinks.forEach(function(link) {
      assert.ok(
        link.includes('noopener') && link.includes('noreferrer'),
        'Missing noopener noreferrer on: ' + link
      );
    });
  });

  it('i18n keys toast_rsvp_cooldown and toast_invalid_url present in both languages', function() {
    assert.ok(JS.includes('toast_rsvp_cooldown'), 'toast_rsvp_cooldown key missing');
    assert.ok(JS.includes('toast_invalid_url'), 'toast_invalid_url key missing');
  });

  /* v1.9.0 additions */
  it('login attempt rate-limiting present in auth.js', function() {
    assert.ok(JS.includes('_MAX_LOGIN_ATTEMPTS'), '_MAX_LOGIN_ATTEMPTS missing');
    assert.ok(JS.includes('_LOGIN_LOCKOUT_MS'), '_LOGIN_LOCKOUT_MS missing');
    assert.ok(JS.includes('_loginAttemptOk'), '_loginAttemptOk function missing');
    assert.ok(JS.includes('_recordLoginFailure'), '_recordLoginFailure function missing');
  });

  it('admin session TTL enforced in auth.js', function() {
    assert.ok(JS.includes('_SESSION_TTL_MS'), '_SESSION_TTL_MS missing');
    assert.ok(JS.includes('expiresAt'), 'expiresAt field missing from session');
  });

  it('CSV injection guard (csvCell helper) present in settings.js', function() {
    assert.ok(JS.includes('csvCell'), 'csvCell helper missing in settings.js');
    assert.ok(JS.includes("'=+-@"), 'formula-injection character set missing');
  });

  it('admin guard on saveGuest in guests.js', function() {
    assert.ok(JS.includes('function saveGuest'), 'saveGuest missing');
    assert.ok(JS.includes('_authUser.isAdmin'), 'isAdmin guard missing');
  });

  it('admin guard on saveTable and deleteTable in tables.js', function() {
    assert.ok(JS.includes('function saveTable'), 'saveTable missing');
    assert.ok(JS.includes('function deleteTable'), 'deleteTable missing');
  });

  it('auth_login_locked i18n key present in both languages', function() {
    assert.ok(JS.includes('auth_login_locked'), 'auth_login_locked key missing');
  });
});

// =============================================================================
// Extended coverage — targeting ≥80% feature coverage
// =============================================================================

// ── Pure Utility Functions Helper ──
/**
 * Extract a named function declaration from combined JS source and return it
 * as a callable.  Only works for pure functions (no DOM / global side-effects).
 */
function _evalPureFn(src, fnName) {
  const marker = 'function ' + fnName + '(';
  const idx = src.indexOf(marker);
  if (idx === -1) throw new Error('_evalPureFn: ' + fnName + ' not found');
  let depth = 0, end = -1;
  for (let i = idx; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('_evalPureFn: could not find closing brace for ' + fnName);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + src.slice(idx, end + 1))();
}

const ESLINT_CFG = readFileSync(resolve(__dirname, '..', 'eslint.config.mjs'), 'utf8');

// ── Pure: cleanPhone ──
describe('Pure — cleanPhone', function() {
  const cleanPhone = _evalPureFn(JS, 'cleanPhone');

  it('converts Israeli 054 format', function() {
    assert.equal(cleanPhone('054-123-4567'), '972541234567');
  });

  it('strips spaces and parentheses', function() {
    assert.equal(cleanPhone('(054) 123 4567'), '972541234567');
  });

  it('keeps already-international 972 number unchanged', function() {
    assert.equal(cleanPhone('972541234567'), '972541234567');
  });

  it('strips leading + from +972 number', function() {
    assert.equal(cleanPhone('+972541234567'), '972541234567');
  });

  it('prepends 972 for numbers missing country code', function() {
    assert.equal(cleanPhone('541234567'), '972541234567');
  });
});

// ── Pure: sanitizeInput ──
describe('Pure — sanitizeInput', function() {
  const sanitizeInput = _evalPureFn(JS, 'sanitizeInput');

  it('trims leading and trailing whitespace', function() {
    assert.equal(sanitizeInput('  hello  '), 'hello');
  });

  it('clamps to max length', function() {
    assert.equal(sanitizeInput('abcde', 3), 'abc');
  });

  it('returns empty string for null', function() {
    assert.equal(sanitizeInput(null), '');
  });

  it('returns empty string for undefined', function() {
    assert.equal(sanitizeInput(undefined), '');
  });

  it('converts non-string to string', function() {
    assert.equal(sanitizeInput(42), '42');
  });
});

// ── Pure: isValidHttpsUrl ──
describe('Pure — isValidHttpsUrl', function() {
  const isValidHttpsUrl = _evalPureFn(JS, 'isValidHttpsUrl');

  it('empty string is valid (field is optional)', function() {
    assert.ok(isValidHttpsUrl(''));
  });

  it('null / undefined is valid', function() {
    assert.ok(isValidHttpsUrl(null));
    assert.ok(isValidHttpsUrl(undefined));
  });

  it('valid https URL returns true', function() {
    assert.ok(isValidHttpsUrl('https://example.com'));
  });

  it('http URL returns false', function() {
    assert.ok(!isValidHttpsUrl('http://example.com'));
  });

  it('non-URL string returns false', function() {
    assert.ok(!isValidHttpsUrl('not-a-url'));
  });
});

// ── Pure: guestFullName ──
describe('Pure — guestFullName', function() {
  const guestFullName = _evalPureFn(JS, 'guestFullName');

  it('returns firstName + space + lastName', function() {
    assert.equal(guestFullName({ firstName: 'John', lastName: 'Doe' }), 'John Doe');
  });

  it('returns firstName only when lastName is empty', function() {
    assert.equal(guestFullName({ firstName: 'John', lastName: '' }), 'John');
  });

  it('returns empty string when both names are empty', function() {
    assert.equal(guestFullName({ firstName: '', lastName: '' }), '');
  });
});

// ── Pure: parseGiftAmount ──
describe('Pure — parseGiftAmount', function() {
  const parseGiftAmount = _evalPureFn(JS, 'parseGiftAmount');

  it('parses plain integer string', function() {
    assert.equal(parseGiftAmount('500'), 500);
  });

  it('strips ₪ prefix', function() {
    assert.equal(parseGiftAmount('₪500'), 500);
  });

  it('strips NIS prefix', function() {
    assert.equal(parseGiftAmount('NIS 500'), 500);
  });

  it('strips NIS suffix', function() {
    assert.equal(parseGiftAmount('500 NIS'), 500);
  });

  it('strips comma thousands separators', function() {
    assert.equal(parseGiftAmount('1,500'), 1500);
  });

  it('returns 0 for non-numeric description', function() {
    assert.equal(parseGiftAmount('אישרו הגעה'), 0);
  });

  it('returns 0 for empty string', function() {
    assert.equal(parseGiftAmount(''), 0);
  });

  it('returns 0 for null', function() {
    assert.equal(parseGiftAmount(null), 0);
  });
});

// ── Pure: uid ──
describe('Pure — uid', function() {
  const uid = _evalPureFn(JS, 'uid');

  it('returns a non-empty string', function() {
    const id = uid();
    assert.ok(typeof id === 'string' && id.length > 0, 'uid should be non-empty string');
  });

  it('returns unique values on successive calls', function() {
    assert.notEqual(uid(), uid());
  });
});

// ── Config Completeness ──
describe('Config Completeness', function() {
  it('GUEST_COLS has 21 columns', function() {
    const match = JS.match(/const GUEST_COLS\s*=\s*\[([\s\S]*?)\]/);
    assert.ok(match, 'GUEST_COLS array not found');
    const cols = match[1].match(/"[^"]+"/g) || [];
    assert.equal(cols.length, 21, 'Expected 21 GUEST_COLS, got ' + cols.length);
  });

  it('TABLE_COLS has 4 columns', function() {
    const match = JS.match(/const TABLE_COLS\s*=\s*\[([\s\S]*?)\]/);
    assert.ok(match, 'TABLE_COLS array not found');
    const cols = match[1].match(/"[^"]+"/g) || [];
    assert.equal(cols.length, 4, 'Expected 4 TABLE_COLS, got ' + cols.length);
  });

  it('ADMIN_EMAILS contains ylipman@gmail.com', function() {
    assert.ok(JS.includes('ylipman@gmail.com'), 'ylipman@gmail.com missing from ADMIN_EMAILS');
  });

  it('ADMIN_EMAILS contains elior.rajwan@gmail.com', function() {
    assert.ok(JS.includes('elior.rajwan@gmail.com'), 'elior.rajwan@gmail.com missing from ADMIN_EMAILS');
  });

  it('SPREADSHEET_ID is set', function() {
    assert.ok(JS.includes('SPREADSHEET_ID') && !JS.includes('"YOUR_SPREADSHEET_ID"'),
      'SPREADSHEET_ID missing or still placeholder');
  });

  it('SHEETS_WEBAPP_URL is set', function() {
    assert.ok(JS.includes('script.google.com/macros'), 'SHEETS_WEBAPP_URL not configured');
  });

  it('SHEETS_GUESTS_TAB is Attendees', function() {
    assert.ok(JS.includes("'Attendees'") || JS.includes('"Attendees"'),
      'SHEETS_GUESTS_TAB should be Attendees');
  });

  it('SHEETS_TABLES_TAB is Tables', function() {
    assert.ok(JS.includes("SHEETS_TABLES_TAB"), 'SHEETS_TABLES_TAB missing');
  });
});

// ── i18n Key Completeness ──
describe('i18n Key Completeness', function() {
  it('side keys: groom, bride, mutual present in both languages', function() {
    assert.ok(JS.includes('side_groom'),  'side_groom key missing');
    assert.ok(JS.includes('side_bride'),  'side_bride key missing');
    assert.ok(JS.includes('side_mutual'), 'side_mutual key missing');
  });

  it('meal_kosher labelled Mehadrin in Hebrew', function() {
    assert.ok(JS.includes('\u05de\u05d4\u05d3\u05e8\u05d9\u05df'), 'Mehadrin Hebrew label missing');
  });

  it('meal_kosher labelled Mehadrin in English', function() {
    assert.ok(JS.includes('Mehadrin'), 'Mehadrin English label missing');
  });

  it('meal_gluten_free key present in both languages', function() {
    assert.ok(JS.includes('meal_gluten_free'), 'meal_gluten_free key missing');
  });

  it('budget_title key present in both languages', function() {
    assert.ok(JS.includes('budget_title'), 'budget_title key missing');
  });

  it('budget_gift_placeholder key present in both languages', function() {
    assert.ok(JS.includes('budget_gift_placeholder'), 'budget_gift_placeholder key missing');
  });

  it('group keys: family, friends, work present', function() {
    assert.ok(JS.includes('group_family'), 'group_family key missing');
    assert.ok(JS.includes('group_friends'), 'group_friends key missing');
    assert.ok(JS.includes('group_work'),   'group_work key missing');
  });

  it('toast_rsvp_submitted and toast_rsvp_updated present', function() {
    assert.ok(JS.includes('toast_rsvp_submitted'), 'toast_rsvp_submitted key missing');
    assert.ok(JS.includes('toast_rsvp_updated'),   'toast_rsvp_updated key missing');
  });

  it('toast_wa_opening key present', function() {
    assert.ok(JS.includes('toast_wa_opening'), 'toast_wa_opening key missing');
  });

  it('nav_budget key present', function() {
    assert.ok(JS.includes('nav_budget'), 'nav_budget key missing');
  });

  it('label_waze and label_ceremony_time keys present', function() {
    assert.ok(JS.includes('label_waze'),          'label_waze key missing');
    assert.ok(JS.includes('label_ceremony_time'), 'label_ceremony_time key missing');
  });

  it('label_hebrew_date key present in both languages', function() {
    assert.ok(JS.includes('label_hebrew_date'), 'label_hebrew_date key missing');
  });
});

// ── WhatsApp: fillTemplate ──
describe('WhatsApp: fillTemplate', function() {
  it('fillTemplate function exists', function() {
    assert.ok(JS.includes('function fillTemplate'), 'fillTemplate missing');
  });

  it('template supports {ceremony} placeholder', function() {
    assert.ok(JS.includes('{ceremony}'), '{ceremony} placeholder missing');
  });

  it('template supports {hebrew_date} placeholder', function() {
    assert.ok(JS.includes('{hebrew_date}'), '{hebrew_date} placeholder missing');
  });

  it('template supports {waze} placeholder', function() {
    assert.ok(JS.includes('{waze}'), '{waze} placeholder missing');
  });

  it('template supports {address} placeholder', function() {
    assert.ok(JS.includes('{address}'), '{address} placeholder missing');
  });
});

// ── Dashboard Constants ──
describe('Dashboard Constants', function() {
  it('STATUS_ICON covers all 4 statuses', function() {
    assert.ok(JS.includes('STATUS_ICON'), 'STATUS_ICON constant missing');
    assert.ok(JS.includes("confirmed:"), 'STATUS_ICON missing confirmed');
    assert.ok(JS.includes("pending:"),   'STATUS_ICON missing pending');
    assert.ok(JS.includes("declined:"),  'STATUS_ICON missing declined');
    assert.ok(JS.includes("maybe:"),     'STATUS_ICON missing maybe');
  });

  it('SIDE_ICON covers groom, bride, mutual', function() {
    assert.ok(JS.includes('SIDE_ICON'), 'SIDE_ICON constant missing');
    assert.ok(JS.includes("groom:"),   'SIDE_ICON missing groom');
    assert.ok(JS.includes("bride:"),   'SIDE_ICON missing bride');
    assert.ok(JS.includes("mutual:"),  'SIDE_ICON missing mutual');
  });

  it('MEAL_ICON covers kosher entry', function() {
    assert.ok(JS.includes('MEAL_ICON'), 'MEAL_ICON constant missing');
    assert.ok(JS.includes("kosher:"),  'MEAL_ICON missing kosher');
  });

  it('cdItem helper function exists', function() {
    assert.ok(JS.includes('function cdItem'), 'cdItem helper missing');
  });

  it('renderCountdown function exists', function() {
    assert.ok(JS.includes('function renderCountdown'), 'renderCountdown missing');
  });

  it('renderStats function exists', function() {
    assert.ok(JS.includes('function renderStats'), 'renderStats missing');
  });
});

// ── nav.js Admin Guard Completeness ──
describe('nav.js Admin Guard Completeness', function() {
  it('adminOnly list includes budget', function() {
    assert.ok(JS.includes("'budget'"), "adminOnly missing 'budget'");
  });

  it('adminOnly list includes settings', function() {
    assert.ok(JS.includes("'settings'"), "adminOnly missing 'settings'");
  });

  it('adminOnly list includes tables', function() {
    assert.ok(JS.includes("'tables'"), "adminOnly missing 'tables'");
  });

  it('showSection function includes analytics render call', function() {
    assert.ok(JS.includes("renderAnalytics()"), 'renderAnalytics() call missing in nav');
  });
});

// ── Budget Extra Coverage ──
describe('Budget Extra Coverage', function() {
  it('giftReceived function exists', function() {
    assert.ok(JS.includes('function giftReceived'), 'giftReceived missing');
  });

  it('saveBudgetTarget function exists', function() {
    assert.ok(JS.includes('function saveBudgetTarget'), 'saveBudgetTarget missing');
  });

  it('HTML has budgetTableBody', function() {
    assert.ok(HTML.includes('id="budgetTableBody"'), 'budgetTableBody missing');
  });

  it('HTML has budgetProgressBar', function() {
    assert.ok(HTML.includes('id="budgetProgressBar"'), 'budgetProgressBar missing');
  });

  it('HTML has budget stats: budgetStatBudget and budgetStatPct', function() {
    assert.ok(HTML.includes('id="budgetStatBudget"'), 'budgetStatBudget missing');
    assert.ok(HTML.includes('id="budgetStatPct"'),    'budgetStatPct missing');
  });
});

// ── Analytics Full Function Coverage ──
describe('Analytics Full Function Coverage', function() {
  it('polarToXY SVG helper exists', function() {
    assert.ok(JS.includes('function polarToXY'), 'polarToXY missing');
  });

  it('arcPath SVG helper exists', function() {
    assert.ok(JS.includes('function arcPath'), 'arcPath missing');
  });

  it('_renderRsvpDonut private function exists', function() {
    assert.ok(JS.includes('function _renderRsvpDonut'), '_renderRsvpDonut missing');
  });

  it('_renderSideChart private function exists', function() {
    assert.ok(JS.includes('function _renderSideChart'), '_renderSideChart missing');
  });

  it('_renderMealChart private function exists', function() {
    assert.ok(JS.includes('function _renderMealChart'), '_renderMealChart missing');
  });

  it('_renderHeadcountSummary private function exists', function() {
    assert.ok(JS.includes('function _renderHeadcountSummary'), '_renderHeadcountSummary missing');
  });
});

// ── Settings Functions ──
describe('Settings Functions', function() {
  it('updateWeddingDetails function exists', function() {
    assert.ok(JS.includes('function updateWeddingDetails'), 'updateWeddingDetails missing');
  });

  it('loadWeddingDetailsToForm function exists', function() {
    assert.ok(JS.includes('function loadWeddingDetailsToForm'), 'loadWeddingDetailsToForm missing');
  });

  it('renderDataSummary function exists', function() {
    assert.ok(JS.includes('function renderDataSummary'), 'renderDataSummary missing');
  });

  it('HTML has dataSummary element', function() {
    assert.ok(HTML.includes('id="dataSummary"'), 'dataSummary element missing');
  });
});

// ── Sheets Full Coverage ──
describe('Sheets Full Coverage', function() {
  it('sheetsAppendRsvp function exists', function() {
    assert.ok(JS.includes('function sheetsAppendRsvp'), 'sheetsAppendRsvp missing');
  });

  it('syncGuestsToSheets function exists', function() {
    assert.ok(JS.includes('function syncGuestsToSheets'), 'syncGuestsToSheets missing');
  });

  it('syncTablesToSheets function exists', function() {
    assert.ok(JS.includes('function syncTablesToSheets'), 'syncTablesToSheets missing');
  });

  it('_sheetsWebAppPost internal function exists', function() {
    assert.ok(JS.includes('function _sheetsWebAppPost'), '_sheetsWebAppPost missing');
  });

  it('guestToRow and rowToGuest converters exist', function() {
    assert.ok(JS.includes('function guestToRow'), 'guestToRow missing');
    assert.ok(JS.includes('function rowToGuest'), 'rowToGuest missing');
  });
});

// ── Data Migration Fields ──
describe('Data Migration Fields', function() {
  it('migrateGuests migrates old name field to firstName', function() {
    assert.ok(JS.includes('g.firstName = g.name'), 'firstName migration missing');
  });

  it('migrateGuests initialises side field', function() {
    assert.ok(
      JS.includes("g.side") && JS.includes("'mutual'"),
      'side field migration missing'
    );
  });

  it('migrateGuests initialises meal field', function() {
    assert.ok(
      JS.includes("g.meal") && JS.includes("'regular'"),
      'meal field migration missing'
    );
  });

  it('migrateGuests initialises gift field', function() {
    assert.ok(JS.includes("g.gift"), 'gift field migration missing');
  });

  it('migrateGuests initialises accessibility field', function() {
    assert.ok(JS.includes('g.accessibility'), 'accessibility field migration missing');
  });

  it('migrateGuests initialises rsvpDate field', function() {
    assert.ok(JS.includes('g.rsvpDate'), 'rsvpDate field migration missing');
  });
});

// ── HTML DOM IDs Extra ──
describe('HTML DOM IDs Extra', function() {
  it('has hebrewDateDisplay element', function() {
    assert.ok(HTML.includes('id="hebrewDateDisplay"'), 'hebrewDateDisplay missing');
  });

  it('has budget section nav tab', function() {
    assert.ok(HTML.includes('data-tab="budget"'), 'budget nav tab missing');
  });

  it('has weddingCeremonyTime input', function() {
    assert.ok(HTML.includes('id="weddingCeremonyTime"'), 'weddingCeremonyTime input missing');
  });

  it('has venueWaze input for navigation link', function() {
    assert.ok(HTML.includes('id="venueWaze"'), 'venueWaze input missing');
  });

  it('has budgetTargetInput for gift target', function() {
    assert.ok(HTML.includes('id="budgetTargetInput"'), 'budgetTargetInput missing');
  });
});

// ── ESLint Config ──
describe('ESLint Config', function() {
  it('varsIgnorePattern includes ^lookup', function() {
    assert.ok(ESLINT_CFG.includes('^lookup'), '^lookup missing from varsIgnorePattern');
  });

  it('OAuth SDK globals (FB, AppleID, google) declared readonly', function() {
    assert.ok(ESLINT_CFG.includes('FB:'), 'FB global missing');
    assert.ok(ESLINT_CFG.includes('AppleID:'), 'AppleID global missing');
    assert.ok(ESLINT_CFG.includes('google:'), 'google global missing');
  });

  it('analytics function globals declared (renderAnalytics, polarToXY)', function() {
    assert.ok(ESLINT_CFG.includes('renderAnalytics'), 'renderAnalytics global missing from ESLint');
    assert.ok(ESLINT_CFG.includes('polarToXY'), 'polarToXY global missing from ESLint');
  });
});

// ── Service Worker APP_SHELL Completeness ──
describe('Service Worker APP_SHELL Completeness', function() {
  it('analytics.js included in APP_SHELL cache list', function() {
    assert.ok(SW.includes('analytics.js'), 'analytics.js missing from APP_SHELL');
  });

  it('budget.js included in APP_SHELL cache list', function() {
    assert.ok(SW.includes('budget.js'), 'budget.js missing from APP_SHELL');
  });
});
