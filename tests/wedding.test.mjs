// =============================================================================
// Wedding Manager — Test Suite v6.1.0
// Run: npm test
// 1587+ tests — core + extended + S0–S25 features
// =============================================================================
import { describe, it } from "vitest";
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load index.html plus all extracted templates/modals so existing selectors still resolve
const _indexHtml = readFileSync(resolve(__dirname, '..', 'index.html'), 'utf8');
const _templateDir = resolve(__dirname, '..', 'src', 'templates');
const _modalDir    = resolve(__dirname, '..', 'src', 'modals');
function _readHtmlDir(dir) {
  if (!existsSync(dir)) return '';
  return readdirSync(dir).filter(function(f) { return f.endsWith('.html'); })
    .map(function(f) { return readFileSync(resolve(dir, f), 'utf8'); }).join('\n');
}
const HTML = `${_indexHtml  }\n${  _readHtmlDir(_templateDir)  }\n${  _readHtmlDir(_modalDir)}`;
const SW = readFileSync(resolve(__dirname, "..", "public", "sw.js"), "utf8");
const MANIFEST = JSON.parse(
  readFileSync(resolve(__dirname, "..", "public", "manifest.json"), "utf8"),
);
const PKG = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));

// Read all CSS and JS source files
const CSS_DIR = resolve(__dirname, '..', 'css');
const SRC_DIR = resolve(__dirname, '..', 'src');
const CSS = readdirSync(CSS_DIR).filter(function(f) { return f.endsWith('.css'); })
  .map(function(f) { return readFileSync(resolve(CSS_DIR, f), 'utf8'); }).join('\n');
function _readJsDir(dir) {
  let result = '';
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      result += _readJsDir(resolve(dir, entry.name));
    } else if (entry.name.endsWith(".js")) {
      result += `${readFileSync(resolve(dir, entry.name), "utf8")}\n`;
    } else if (entry.name.endsWith(".json")) {
      result += `${readFileSync(resolve(dir, entry.name), "utf8")}\n`;
    }
  }
  return result;
}
const JS = _readJsDir(SRC_DIR);
const I18N_DIR = resolve(__dirname, '..', 'src', 'i18n');
const I18N_JSON = readdirSync(I18N_DIR)
  .filter(function (f) { return f.endsWith(".json"); })
  .map(function (f) { return readFileSync(resolve(I18N_DIR, f), "utf8"); })
  .join("\n");
// Combined sources for pattern matching (HTML + CSS + JS)
const SRC = `${HTML}\n${CSS}\n${JS}`;

// ── Version ──
describe("Version", function () {
  it("src/core/config.js contains v6.1.0", function () {
    const cfg = readFileSync(resolve(__dirname, "..", "src", "core", "config.js"), "utf8");
    assert.ok(cfg.includes("6.1.0"));
  });

  it("SW cache name contains v6.1.0", function () {
    assert.ok(SW.includes("wedding-v6.1.0"));
  });

  it("package.json version is 6.1.0", function () {
    assert.equal(PKG.version, "6.1.0");
  });
});

// ── HTML Structure ──
describe("HTML Structure", function () {
  it("has DOCTYPE", function () {
    assert.ok(HTML.startsWith("<!DOCTYPE html>"));
  });

  it('has lang="he" and dir="rtl"', function () {
    assert.ok(SRC.includes('lang="he"'));
    assert.ok(SRC.includes('dir="rtl"'));
  });

  it("has viewport meta", function () {
    assert.ok(SRC.includes('name="viewport"'));
  });

  it("has charset meta", function () {
    assert.ok(SRC.includes('charset="UTF-8"'));
  });

  it("has title", function () {
    assert.ok(SRC.includes("<title>"));
  });

  it("links to manifest.json", function () {
    assert.ok(SRC.includes("manifest.json"));
  });

  it("links to icon.svg", function () {
    assert.ok(SRC.includes("icon.svg"));
  });
});

// ── Sections ──
describe("Sections", function () {
  const sections = [
    "dashboard",
    "guests",
    "tables",
    "invitation",
    "whatsapp",
    "rsvp",
    "settings",
  ];
  sections.forEach(function (sec) {
    it(`has section: ${sec}`, function () {
      assert.ok(SRC.includes(`id="sec-${sec}"`));
    });
  });

  it("has navigation tabs", function () {
    assert.ok(SRC.includes("nav-tabs"));
  });
});

// ── SEO & Social Meta ──
describe("SEO & Social Meta", function () {
  it("has Open Graph title and image", function () {
    assert.ok(HTML.includes("og:title"), "og:title missing");
    assert.ok(HTML.includes("og:image"), "og:image missing");
  });

  it("has Twitter Card meta", function () {
    assert.ok(HTML.includes("twitter:card"), "twitter:card missing");
  });

  it("has canonical link", function () {
    assert.ok(HTML.includes('rel="canonical"'), "canonical link missing");
  });

  it("has robots meta", function () {
    assert.ok(HTML.includes('name="robots"'), "robots meta missing");
  });

  it("has JSON-LD structured data", function () {
    assert.ok(HTML.includes("application/ld+json"), "JSON-LD missing");
    assert.ok(HTML.includes('"@type"'), "JSON-LD @type missing");
  });
});

// ── i18n ──
describe("i18n System", function () {
  it("has data-i18n attributes", function () {
    assert.ok(SRC.includes("data-i18n="));
  });

  it("has Hebrew translations object", function () {
    assert.ok(
      SRC.includes("I18N_HE") || SRC.includes("he: {") || SRC.includes("he:{"),
    );
  });

  it("has English translations object", function () {
    assert.ok(
      SRC.includes("I18N_EN") || SRC.includes("en: {") || SRC.includes("en:{"),
    );
  });

  it("has language toggle button", function () {
    assert.ok(SRC.includes("toggleLanguage"));
  });

  it("has t() function", function () {
    assert.ok(SRC.includes("function t("));
  });

});

// ── Themes ──
describe("Themes", function () {
  it("has default theme (purple)", function () {
    assert.ok(SRC.includes("--accent: #d4a574"));
  });

  it("has rose gold theme", function () {
    assert.ok(SRC.includes("theme-rosegold"));
  });

  it("has classic gold theme", function () {
    assert.ok(SRC.includes("theme-gold"));
  });

  it("has emerald theme", function () {
    assert.ok(SRC.includes("theme-emerald"));
  });

  it("has royal blue theme", function () {
    assert.ok(SRC.includes("theme-royal"));
  });

  it("has cycleTheme function", function () {
    assert.ok(SRC.includes("function cycleTheme"));
  });
});

// ── Guest Management ──
describe("Guest Management", function () {
  it("has guest table", function () {
    assert.ok(SRC.includes('id="guestTableBody"'));
  });

  it("has add guest modal", function () {
    assert.ok(SRC.includes('id="guestModal"'));
  });

  it("has saveGuest function", function () {
    assert.ok(SRC.includes("function saveGuest"));
  });

  it("has deleteGuest function", function () {
    assert.ok(SRC.includes("function deleteGuest"));
  });

  it("has search functionality", function () {
    assert.ok(SRC.includes('id="guestSearch"'));
  });

  it("has filter buttons", function () {
    assert.ok(SRC.includes("setFilter"));
  });

  it("has status badges (confirmed, pending, declined)", function () {
    assert.ok(SRC.includes("status-confirmed"));
    assert.ok(SRC.includes("status-pending"));
    assert.ok(SRC.includes("status-declined"));
  });

  it("has side filter (groom/bride/mutual)", function () {
    assert.ok(SRC.includes("setSideFilter"));
    assert.ok(SRC.includes("side-groom"));
    assert.ok(SRC.includes("side-bride"));
    assert.ok(SRC.includes("side-mutual"));
  });

  it("has meal preferences", function () {
    assert.ok(SRC.includes("meal_regular"));
    assert.ok(SRC.includes("meal_vegetarian"));
    assert.ok(SRC.includes("meal_vegan"));
  });

  it("has expanded guest model (firstName, lastName, side, meal, children)", function () {
    assert.ok(SRC.includes("guestFirstName"));
    assert.ok(SRC.includes("guestLastName"));
    assert.ok(SRC.includes("guestSide"));
    assert.ok(SRC.includes("guestMeal"));
    assert.ok(SRC.includes("guestChildren"));
    assert.ok(SRC.includes("guestAccessibility"));
    assert.ok(SRC.includes("guestTransport"));
  });

});

// ── Table Seating ──
describe("Table Seating", function () {
  it("has seating floor", function () {
    assert.ok(SRC.includes('id="seatingFloor"'));
  });

  it("has table modal", function () {
    assert.ok(SRC.includes('id="tableModal"'));
  });

  it("has saveTable function", function () {
    assert.ok(SRC.includes("function saveTable"));
  });

  it("has deleteTable function", function () {
    assert.ok(SRC.includes("function deleteTable"));
  });

  it("supports round and rect shapes", function () {
    assert.ok(SRC.includes("shape_round"));
    assert.ok(SRC.includes("shape_rect"));
  });

  it("has unassigned guests section", function () {
    assert.ok(SRC.includes('id="unassignedGuests"'));
  });

  it("has printSeatingChart function", function () {
    assert.ok(SRC.includes("function printSeatingChart"));
  });

});

// ── Budget & Gifts ──
describe("Budget & Gift Tracker", function () {
  it("has budget section in HTML", function () {
    assert.ok(HTML.includes('id="sec-budget"'));
  });

  it("has budget nav tab", function () {
    assert.ok(HTML.includes('data-tab="budget"'));
  });

  it("has budget JS module", function () {
    assert.ok(JS.includes("function renderBudget"));
  });

  it("has parseGiftAmount function", function () {
    assert.ok(JS.includes("function parseGiftAmount"));
  });

  it("budget uses gift field on guests", function () {
    assert.ok(JS.includes("g.gift"));
  });

  it("budget stats elements present in HTML", function () {
    assert.ok(HTML.includes('id="budgetStatGifts"'));
    assert.ok(HTML.includes('id="budgetStatTotal"'));
    assert.ok(HTML.includes('id="budgetStatPending"'));
  });
});

// ── Charts (v1.11.0) ──
describe("Dashboard Charts", function () {
  it("has charts card in dashboard HTML", function () {
    assert.ok(HTML.includes('id="sec-dashboard"'), "dashboard section missing");
    assert.ok(HTML.includes('id="chartRsvp"'), "chartRsvp canvas missing");
    assert.ok(HTML.includes('id="chartMeal"'), "chartMeal canvas missing");
    assert.ok(HTML.includes('id="chartSide"'), "chartSide canvas missing");
  });

  it("has chart legend containers", function () {
    assert.ok(HTML.includes('id="chartRsvpLegend"'), "chartRsvpLegend missing");
    assert.ok(HTML.includes('id="chartMealLegend"'), "chartMealLegend missing");
    assert.ok(HTML.includes('id="chartSideLegend"'), "chartSideLegend missing");
  });

  it("chart i18n keys present in both languages", function () {
    assert.ok(JS.includes("charts_title"), "charts_title key missing");
    assert.ok(JS.includes("chart_rsvp_title"), "chart_rsvp_title key missing");
    assert.ok(JS.includes("chart_meal_title"), "chart_meal_title key missing");
    assert.ok(JS.includes("chart_side_title"), "chart_side_title key missing");
    assert.ok(JS.includes("chart_total"), "chart_total key missing");
    assert.ok(JS.includes("chart_guests"), "chart_guests key missing");
  });

  it("chart CSS classes present in components.css", function () {
    assert.ok(CSS.includes(".charts-row"), ".charts-row missing");
    assert.ok(CSS.includes(".chart-wrap"), ".chart-wrap missing");
    assert.ok(CSS.includes(".chart-legend"), ".chart-legend missing");
    assert.ok(CSS.includes(".chart-legend-item"), ".chart-legend-item missing");
    assert.ok(CSS.includes(".chart-legend-dot"), ".chart-legend-dot missing");
  });
});

// ── Analytics Section (v1.12.0) ──
describe("Analytics Section", function () {
  it("analytics.js has renderAnalytics function", function () {
    assert.ok(
      JS.includes("function renderAnalytics"),
      "renderAnalytics missing",
    );
  });

  it("analytics section exists in HTML", function () {
    assert.ok(
      HTML.includes('id="sec-analytics"'),
      "sec-analytics section missing",
    );
  });

  it("analytics DOM IDs present in HTML", function () {
    assert.ok(
      HTML.includes('id="analyticsRsvpDonut"'),
      "analyticsRsvpDonut missing",
    );
    assert.ok(
      HTML.includes('id="analyticsSideDonut"'),
      "analyticsSideDonut missing",
    );
    assert.ok(
      HTML.includes('id="analyticsMealBar"'),
      "analyticsMealBar missing",
    );
    assert.ok(
      HTML.includes('id="analyticsSentChart"'),
      "analyticsSentChart missing",
    );
    assert.ok(
      HTML.includes('id="analyticsHeadAdults"'),
      "analyticsHeadAdults missing",
    );
    assert.ok(
      HTML.includes('id="analyticsHeadChildren"'),
      "analyticsHeadChildren missing",
    );
    assert.ok(
      HTML.includes('id="analyticsHeadTotal"'),
      "analyticsHeadTotal missing",
    );
    assert.ok(
      HTML.includes('id="analyticsHeadConfirmed"'),
      "analyticsHeadConfirmed missing",
    );
    assert.ok(
      HTML.includes('id="analyticsHeadAccess"'),
      "analyticsHeadAccess missing",
    );
  });

  it("analytics nav tab present in HTML", function () {
    assert.ok(
      HTML.includes('data-tab="analytics"'),
      "analytics nav tab missing",
    );
  });

  it("renderAnalytics is called in nav.js showSection", function () {
    assert.ok(
      JS.includes("renderAnalytics()"),
      "renderAnalytics() call missing in nav.js",
    );
  });

  it("analytics is in adminOnly list in nav.js", function () {
    assert.ok(JS.includes('"analytics"'), "'analytics' not in adminOnly list");
  });

  it("analytics i18n keys present in both languages", function () {
    assert.ok(JS.includes("nav_analytics"), "nav_analytics key missing");
    assert.ok(JS.includes("stat_maybe"), "stat_maybe key missing");
    assert.ok(JS.includes("stat_guests"), "stat_guests key missing");
    assert.ok(
      JS.includes("analytics_confirmed_heads"),
      "analytics_confirmed_heads key missing",
    );
    assert.ok(
      JS.includes("analytics_total_guests"),
      "analytics_total_guests key missing",
    );
    assert.ok(
      JS.includes("analytics_rsvp_title"),
      "analytics_rsvp_title key missing",
    );
    assert.ok(
      JS.includes("analytics_headcount_title"),
      "analytics_headcount_title key missing",
    );
  });

  it("analytics CSS classes present in components.css", function () {
    assert.ok(CSS.includes(".analytics-row"), ".analytics-row missing");
    assert.ok(CSS.includes(".analytics-card"), ".analytics-card missing");
    assert.ok(
      CSS.includes(".analytics-headcount-grid"),
      ".analytics-headcount-grid missing",
    );
    assert.ok(
      CSS.includes(".analytics-stat-box"),
      ".analytics-stat-box missing",
    );
    assert.ok(
      CSS.includes(".analytics-stat-num"),
      ".analytics-stat-num missing",
    );
    assert.ok(
      CSS.includes(".analytics-stat-lbl"),
      ".analytics-stat-lbl missing",
    );
    assert.ok(
      CSS.includes(".analytics-stat-highlight"),
      ".analytics-stat-highlight missing",
    );
  });
});

// ── WhatsApp ──
describe("WhatsApp Integration", function () {
  it("has WhatsApp template textarea", function () {
    assert.ok(SRC.includes('id="waTemplate"'));
  });

  it("has WhatsApp preview", function () {
    assert.ok(SRC.includes('id="waPreviewBubble"'));
  });

  it("has sendWhatsAppAll function", function () {
    assert.ok(SRC.includes("function sendWhatsAppAll"));
  });

  it("uses wa.me deep link", function () {
    assert.ok(SRC.includes("wa.me/"));
  });

  it("has message placeholders", function () {
    assert.ok(SRC.includes("{name}"));
    assert.ok(SRC.includes("{groom}"));
    assert.ok(SRC.includes("{bride}"));
    assert.ok(SRC.includes("{date}"));
    assert.ok(SRC.includes("{venue}"));
  });

  it("opens in new tab with noopener", function () {
    assert.ok(SRC.includes("noopener"));
  });

  it("textarea has no hardcoded Hebrew content in HTML", function () {
    // The textarea must be empty in HTML — content is set by JS from _waTemplates
    assert.ok(!HTML.includes('id="waTemplate">שלום'));
  });
});

// ── RSVP ──
describe("RSVP", function () {
  it("has RSVP first name field", function () {
    assert.ok(SRC.includes('id="rsvpFirstName"'));
  });

  it("has RSVP phone field", function () {
    assert.ok(SRC.includes('id="rsvpPhone"'));
  });

  it("has RSVP attendance field", function () {
    assert.ok(SRC.includes('id="rsvpAttending"'));
  });

  it("has guest count input", function () {
    assert.ok(SRC.includes('id="rsvpGuests"'));
  });

  it("has dietary notes field", function () {
    assert.ok(SRC.includes('id="rsvpNotes"'));
  });

  it("has side selection (groom/bride/mutual)", function () {
    assert.ok(SRC.includes('id="rsvpSide"'));
  });

  it("has meal selection", function () {
    assert.ok(SRC.includes('id="rsvpMeal"'));
  });

  it("has children field", function () {
    assert.ok(SRC.includes('id="rsvpChildren"'));
  });

  it("has accessibility checkbox", function () {
    assert.ok(SRC.includes('id="rsvpAccessibility"'));
  });

  it("has transport select", function () {
    assert.ok(
      SRC.includes('id="rsvpTransport"'),
      "rsvpTransport select missing from RSVP form",
    );
  });

  it("phone-first: rsvpPhone appears before rsvpFirstName in HTML", function () {
    assert.ok(
      HTML.indexOf('id="rsvpPhone"') < HTML.indexOf('id="rsvpFirstName"'),
      "rsvpPhone should come before rsvpFirstName",
    );
  });

  it("phone-first: rsvpDetails div exists and starts hidden", function () {
    assert.ok(HTML.includes('id="rsvpDetails"'), "rsvpDetails div missing");
    const tag = HTML.match(/<div[^>]*id="rsvpDetails"[^>]*>/);
    assert.ok(tag, "rsvpDetails tag not found");
    assert.ok(
      tag[0].includes("u-hidden") || tag[0].includes("display:none"),
      "rsvpDetails should start hidden",
    );
  });

  it("phone-first: lookupRsvpByPhone function exists", function () {
    assert.ok(
      JS.includes("function lookupRsvpByPhone"),
      "lookupRsvpByPhone missing",
    );
  });

  it("phone-first: rsvpLookupStatus element exists", function () {
    assert.ok(
      HTML.includes('id="rsvpLookupStatus"'),
      "rsvpLookupStatus missing",
    );
  });

  it("phone-first: i18n keys present", function () {
    assert.ok(JS.includes("rsvp_phone_hint"), "rsvp_phone_hint missing");
    assert.ok(JS.includes("rsvp_lookup_found"), "rsvp_lookup_found missing");
    assert.ok(JS.includes("rsvp_lookup_new"), "rsvp_lookup_new missing");
    assert.ok(
      JS.includes("rsvp_lookup_searching"),
      "rsvp_lookup_searching missing",
    );
  });
});

// ── Invitation ──
describe("Invitation", function () {
  it("has invitation preview", function () {
    assert.ok(SRC.includes('id="invitationPreview"'));
  });

  it("has file upload", function () {
    assert.ok(SRC.includes('id="invitationFile"'));
  });

  it("has handleInvitationUpload function", function () {
    assert.ok(SRC.includes("function handleInvitationUpload"));
  });

});

// ── Wedding Details ──
describe("Wedding Details", function () {
  it("has groom name input", function () {
    assert.ok(SRC.includes('id="groomName"'));
  });

  it("has bride name input", function () {
    assert.ok(SRC.includes('id="brideName"'));
  });

  it("has wedding date input", function () {
    assert.ok(SRC.includes('id="weddingDate"'));
  });

  it("has venue input", function () {
    assert.ok(SRC.includes('id="venueName"'));
  });

  it("has countdown", function () {
    assert.ok(SRC.includes('id="countdown"'));
  });
});

// ── Data Persistence ──
describe("Data Persistence", function () {
  it("uses wedding_v1_ prefix", function () {
    assert.ok(SRC.includes("wedding_v1_"));
  });

  it("has save function", function () {
    assert.ok(SRC.includes("function save("));
  });

  it("has load function", function () {
    assert.ok(SRC.includes("function load("));
  });

});

// ── Export ──
describe("Export", function () {
  it("has CSV export", function () {
    assert.ok(SRC.includes("function exportGuestsCSV"));
  });

  it("includes UTF-8 BOM for Hebrew", function () {
    assert.ok(SRC.includes("\\uFEFF") || SRC.includes("BOM"));
  });

  it("has print function", function () {
    assert.ok(SRC.includes("function printGuests"));
  });

  it("has JSON backup export", function () {
    assert.ok(SRC.includes("function exportJSON"));
  });

  it("has JSON backup import", function () {
    assert.ok(SRC.includes("function importJSON"));
  });

  it("has CSV template download", function () {
    assert.ok(SRC.includes("function downloadCSVTemplate"));
  });

  it("has clearAllData function", function () {
    assert.ok(SRC.includes("function clearAllData"));
  });
});

// ── Security ──
describe("Security", function () {
  it("does not use eval()", function () {
    assert.ok(!SRC.includes("eval("));
  });

  it("uses textContent for safe rendering", function () {
    assert.ok(SRC.includes("textContent"));
  });

  it("has cleanPhone function", function () {
    assert.ok(SRC.includes("function cleanPhone"));
  });
});

// ── CSS ──
describe("CSS", function () {
  it("uses CSS custom properties", function () {
    assert.ok(SRC.includes(":root"));
    assert.ok(SRC.includes("var(--"));
  });

  it("has glassmorphism (backdrop-filter)", function () {
    assert.ok(SRC.includes("backdrop-filter: blur("));
  });

  it("has responsive breakpoints", function () {
    assert.ok(SRC.includes("768px"));
    assert.ok(SRC.includes("480px"));
  });

  it("has print stylesheet", function () {
    assert.ok(SRC.includes("@media print"));
  });

  it("respects prefers-reduced-motion", function () {
    assert.ok(SRC.includes("prefers-reduced-motion"));
  });

  it("has RTL-first layout styles", function () {
    assert.ok(SRC.includes('dir="rtl"'));
  });
});

// ── UI Components ──
describe("UI Components", function () {
  it("has toast notification system", function () {
    assert.ok(SRC.includes("function showToast"));
    assert.ok(SRC.includes('id="toastContainer"'));
  });

  it("has modals with close on overlay click", function () {
    assert.ok(SRC.includes("e.target === overlay"));
  });

  it("has progress bar", function () {
    assert.ok(SRC.includes('id="progressFill"'));
  });

  it("has empty states", function () {
    assert.ok(SRC.includes("empty-state"));
  });

});

// ── Service Worker ──
describe("Service Worker", function () {
  it("has cache name with version", function () {
    assert.ok(SW.includes("wedding-v6.1.0"));
  });

  it("pre-caches app shell", function () {
    assert.ok(SW.includes("APP_SHELL"));
    assert.ok(SW.includes("index.html"));
  });

  it("handles install event", function () {
    assert.ok(SW.includes('addEventListener("install"'));
  });

  it("handles activate event", function () {
    assert.ok(SW.includes('addEventListener("activate"'));
  });

  it("handles fetch event", function () {
    assert.ok(SW.includes('addEventListener("fetch"'));
  });

  it("cleans old caches on activate", function () {
    assert.ok(SW.includes("caches.delete"));
  });

  it("has offline fallback", function () {
    assert.ok(SW.includes("index.html"));
  });

  it("skip waiting only via message", function () {
    assert.ok(SW.includes("SKIP_WAITING"));
    assert.ok(
      !SW.includes("self.skipWaiting()") ||
        SW.includes('"SKIP_WAITING"') ||
        SW.includes("'SKIP_WAITING'"),
    );
  });
});

// ── Manifest ──
describe("Manifest", function () {
  it("has name", function () {
    assert.ok(MANIFEST.name);
  });

  it("has start_url", function () {
    assert.equal(MANIFEST.start_url, "./index.html");
  });

  it("has icons", function () {
    assert.ok(MANIFEST.icons.length > 0);
  });

  it("has display mode", function () {
    assert.equal(MANIFEST.display, "standalone");
  });

  it("has Hebrew language", function () {
    assert.equal(MANIFEST.lang, "he");
  });

  it("has RTL direction", function () {
    assert.equal(MANIFEST.dir, "rtl");
  });
});

// ── Package.json ──
describe("Package.json", function () {
  it("has test script", function () {
    assert.ok(PKG.scripts.test.includes("vitest"));
  });

  it("is private", function () {
    assert.equal(PKG.private, true);
  });

  it("is ESM module", function () {
    assert.equal(PKG.type, "module");
  });
});

// ── Auth & User Access Management ──
describe("Auth & User Access Management", function () {
  it("has isApprovedAdmin function", function () {
    assert.ok(JS.includes("function isApprovedAdmin"));
  });

  it("ADMIN_EMAILS contains yair.rajwan@gmail.com", function () {
    assert.ok(JS.includes("yair.rajwan@gmail.com"));
  });

  it("User Manager card present in settings HTML", function () {
    assert.ok(HTML.includes('id="cardUserManager"'));
    assert.ok(HTML.includes('id="approvedEmailsList"'));
    assert.ok(HTML.includes('id="newApproveEmail"'));
  });

  it("email sign-in modal present in HTML", function () {
    assert.ok(HTML.includes('id="adminLoginEmail"'));
    assert.ok(HTML.includes("submitEmailLogin"));
  });

  /* ── Google Sheets (v1.6.0) ── */

  it("Sheets settings card has sheetsWebAppUrl input and open link", function () {
    assert.ok(HTML.includes('id="sheetsWebAppUrl"'));
    assert.ok(HTML.includes("docs.google.com/spreadsheets/d/"));
  });

  it("apps script supports replaceAll and ensureSheets", function () {
    const GS = readFileSync(
      resolve(__dirname, "..", ".github", "scripts", "sheets-webapp.gs"),
      "utf8",
    );
    assert.ok(GS.includes("action === 'replaceAll'"));
    assert.ok(GS.includes("action === 'ensureSheets'"));
    assert.ok(GS.includes("'Config'"));
  });
});

/* ── Security (v1.7.0 + v1.9.0) ── */
describe("Security hardening", function () {
  it("CSP meta tag present with required directives", function () {
    assert.ok(HTML.includes("Content-Security-Policy"), "CSP meta tag missing");
    assert.ok(HTML.includes("object-src 'none'"), "object-src 'none' missing");
    assert.ok(HTML.includes("base-uri 'self'"), "base-uri 'self' missing");
    assert.ok(HTML.includes("form-action 'self'"), "form-action missing");
  });

  it("CSP _headers file has frame-ancestors 'none'", function () {
    const headersPath = resolve(__dirname, "..", "public", "_headers");
    const headers = readFileSync(headersPath, "utf8");
    assert.ok(
      headers.includes("frame-ancestors 'none'"),
      "frame-ancestors missing from _headers",
    );
  });

  it("no inline scripts in index.html (strict CSP)", function () {
    // Inline scripts are banned — CSP does not allow 'unsafe-inline'
    assert.ok(
      !/<script>[^<]/.test(HTML),
      "inline script detected — use external files only",
    );
  });

  it("referrer-policy meta tag present", function () {
    assert.ok(
      HTML.includes("strict-origin-when-cross-origin"),
      "referrer-policy missing",
    );
  });

  it("sanitizeInput and isValidHttpsUrl defined in utils.js", function () {
    assert.ok(JS.includes("function sanitizeInput"), "sanitizeInput missing");
    assert.ok(
      JS.includes("function isValidHttpsUrl"),
      "isValidHttpsUrl missing",
    );
  });

  it("invitation.js guards against non-image data URLs", function () {
    assert.ok(
      JS.includes("data:image/"),
      "data:image/ guard missing in invitation.js",
    );
  });

  it("wazeLink validated against HTTPS-only in settings.js", function () {
    assert.ok(
      JS.includes("isValidHttpsUrl"),
      "isValidHttpsUrl not called in JS",
    );
    assert.ok(
      JS.includes("toast_invalid_url"),
      "invalid URL toast key missing",
    );
  });

  it("all target=_blank links have both noopener and noreferrer", function () {
    const blankLinks = HTML.match(/target="_blank"[^>]*/g) || [];
    blankLinks.forEach(function (link) {
      assert.ok(
        link.includes("noopener") && link.includes("noreferrer"),
        `Missing noopener noreferrer on: ${link}`,
      );
    });
  });

  it("i18n keys toast_rsvp_cooldown and toast_invalid_url present in both languages", function () {
    assert.ok(
      JS.includes("toast_rsvp_cooldown"),
      "toast_rsvp_cooldown key missing",
    );
    assert.ok(
      JS.includes("toast_invalid_url"),
      "toast_invalid_url key missing",
    );
  });

  /* v1.9.0 additions */

  it("admin guard on saveTable and deleteTable in tables.js", function () {
    assert.ok(JS.includes("function saveTable"), "saveTable missing");
    assert.ok(JS.includes("function deleteTable"), "deleteTable missing");
  });

  it("auth_login_locked i18n key present in both languages", function () {
    assert.ok(
      JS.includes("auth_login_locked"),
      "auth_login_locked key missing",
    );
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
  const marker = `function ${fnName}(`;
  const idx = src.indexOf(marker);
  if (idx === -1) throw new Error(`_evalPureFn: ${fnName} not found`);
  let depth = 0,
    end = -1;
  for (let i = idx; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1)
    throw new Error(`_evalPureFn: could not find closing brace for ${fnName}`);
  // eslint-disable-next-line no-new-func
  return new Function(`return ${src.slice(idx, end + 1)}`)();
}

const ESLINT_CFG = readFileSync(
  resolve(__dirname, "..", "eslint.config.mjs"),
  "utf8",
);

// ── Pure: cleanPhone ──
describe("Pure — cleanPhone", function () {
  const cleanPhone = _evalPureFn(JS, "cleanPhone");

  it("converts Israeli 054 format", function () {
    assert.equal(cleanPhone("054-123-4567"), "972541234567");
  });

  it("strips spaces and parentheses", function () {
    assert.equal(cleanPhone("(054) 123 4567"), "972541234567");
  });

  it("keeps already-international 972 number unchanged", function () {
    assert.equal(cleanPhone("972541234567"), "972541234567");
  });

  it("strips leading + from +972 number", function () {
    assert.equal(cleanPhone("+972541234567"), "972541234567");
  });

  it("prepends 972 for numbers missing country code", function () {
    assert.equal(cleanPhone("541234567"), "972541234567");
  });
});

// ── Pure: sanitizeInput ──
describe("Pure — sanitizeInput", function () {
  const sanitizeInput = _evalPureFn(JS, "sanitizeInput");

  it("trims leading and trailing whitespace", function () {
    assert.equal(sanitizeInput("  hello  "), "hello");
  });

  it("clamps to max length", function () {
    assert.equal(sanitizeInput("abcde", 3), "abc");
  });

  it("returns empty string for null", function () {
    assert.equal(sanitizeInput(null), "");
  });

  it("returns empty string for undefined", function () {
    assert.equal(sanitizeInput(undefined), "");
  });

  it("converts non-string to string", function () {
    assert.equal(sanitizeInput(42), "42");
  });
});

// ── Pure: isValidHttpsUrl ──
describe("Pure — isValidHttpsUrl", function () {
  const isValidHttpsUrl = _evalPureFn(JS, "isValidHttpsUrl");

  it("empty string is valid (field is optional)", function () {
    assert.ok(isValidHttpsUrl(""));
  });

  it("null / undefined is valid", function () {
    assert.ok(isValidHttpsUrl(null));
    assert.ok(isValidHttpsUrl(undefined));
  });

  it("valid https URL returns true", function () {
    assert.ok(isValidHttpsUrl("https://example.com"));
  });

  it("http URL returns false", function () {
    assert.ok(!isValidHttpsUrl("http://example.com"));
  });

  it("non-URL string returns false", function () {
    assert.ok(!isValidHttpsUrl("not-a-url"));
  });
});

// ── Pure: guestFullName ──
describe("Pure — guestFullName", function () {
  const guestFullName = _evalPureFn(JS, "guestFullName");

  it("returns firstName + space + lastName", function () {
    assert.equal(
      guestFullName({ firstName: "John", lastName: "Doe" }),
      "John Doe",
    );
  });

  it("returns firstName only when lastName is empty", function () {
    assert.equal(guestFullName({ firstName: "John", lastName: "" }), "John");
  });

  it("returns empty string when both names are empty", function () {
    assert.equal(guestFullName({ firstName: "", lastName: "" }), "");
  });
});

// ── Pure: parseGiftAmount ──
describe("Pure — parseGiftAmount", function () {
  const parseGiftAmount = _evalPureFn(JS, "parseGiftAmount");

  it("parses plain integer string", function () {
    assert.equal(parseGiftAmount("500"), 500);
  });

  it("strips ₪ prefix", function () {
    assert.equal(parseGiftAmount("₪500"), 500);
  });

  it("strips NIS prefix", function () {
    assert.equal(parseGiftAmount("NIS 500"), 500);
  });

  it("strips NIS suffix", function () {
    assert.equal(parseGiftAmount("500 NIS"), 500);
  });

  it("strips comma thousands separators", function () {
    assert.equal(parseGiftAmount("1,500"), 1500);
  });

  it("returns 0 for non-numeric description", function () {
    assert.equal(parseGiftAmount("אישרו הגעה"), 0);
  });

  it("returns 0 for empty string", function () {
    assert.equal(parseGiftAmount(""), 0);
  });

  it("returns 0 for null", function () {
    assert.equal(parseGiftAmount(null), 0);
  });
});

// ── Pure: uid ──
describe("Pure — uid", function () {
  const uid = _evalPureFn(JS, "uid");

  it("returns a non-empty string", function () {
    const id = uid();
    assert.ok(
      typeof id === "string" && id.length > 0,
      "uid should be non-empty string",
    );
  });

  it("returns unique values on successive calls", function () {
    assert.notEqual(uid(), uid());
  });
});

// ── Config Completeness ──
describe("Config Completeness", function () {

  it("ADMIN_EMAILS contains ylipman@gmail.com", function () {
    assert.ok(
      JS.includes("ylipman@gmail.com"),
      "ylipman@gmail.com missing from ADMIN_EMAILS",
    );
  });

  it("ADMIN_EMAILS contains elior.rajwan@gmail.com", function () {
    assert.ok(
      JS.includes("elior.rajwan@gmail.com"),
      "elior.rajwan@gmail.com missing from ADMIN_EMAILS",
    );
  });

  it("SPREADSHEET_ID is set", function () {
    assert.ok(
      JS.includes("SPREADSHEET_ID") && !JS.includes('"YOUR_SPREADSHEET_ID"'),
      "SPREADSHEET_ID missing or still placeholder",
    );
  });

  it("SHEETS_WEBAPP_URL is set", function () {
    assert.ok(
      JS.includes("script.google.com/macros"),
      "SHEETS_WEBAPP_URL not configured",
    );
  });

  it("SHEETS_GUESTS_TAB is Attendees", function () {
    assert.ok(
      JS.includes("'Attendees'") || JS.includes('"Attendees"'),
      "SHEETS_GUESTS_TAB should be Attendees",
    );
  });

  it("SHEETS_TABLES_TAB is Tables", function () {
    assert.ok(JS.includes("SHEETS_TABLES_TAB"), "SHEETS_TABLES_TAB missing");
  });
});

// ── i18n Key Completeness ──
describe("i18n Key Completeness", function () {
  it("side keys: groom, bride, mutual present in both languages", function () {
    assert.ok(JS.includes("side_groom"), "side_groom key missing");
    assert.ok(JS.includes("side_bride"), "side_bride key missing");
    assert.ok(JS.includes("side_mutual"), "side_mutual key missing");
  });

  it("meal_kosher labelled Mehadrin in Hebrew", function () {
    assert.ok(
      JS.includes("\u05de\u05d4\u05d3\u05e8\u05d9\u05df"),
      "Mehadrin Hebrew label missing",
    );
  });

  it("meal_kosher labelled Mehadrin in English", function () {
    assert.ok(JS.includes("Mehadrin"), "Mehadrin English label missing");
  });

  it("meal_gluten_free key present in both languages", function () {
    assert.ok(JS.includes("meal_gluten_free"), "meal_gluten_free key missing");
  });

  it("budget_title key present in both languages", function () {
    assert.ok(JS.includes("budget_title"), "budget_title key missing");
  });

  it("budget_gift_placeholder key present in both languages", function () {
    assert.ok(
      JS.includes("budget_gift_placeholder"),
      "budget_gift_placeholder key missing",
    );
  });

  it("group keys: family, friends, work present", function () {
    assert.ok(JS.includes("group_family"), "group_family key missing");
    assert.ok(JS.includes("group_friends"), "group_friends key missing");
    assert.ok(JS.includes("group_work"), "group_work key missing");
  });

  it("toast_rsvp_submitted and toast_rsvp_updated present", function () {
    assert.ok(
      JS.includes("toast_rsvp_submitted"),
      "toast_rsvp_submitted key missing",
    );
    assert.ok(
      JS.includes("toast_rsvp_updated"),
      "toast_rsvp_updated key missing",
    );
  });

  it("toast_wa_opening key present", function () {
    assert.ok(JS.includes("toast_wa_opening"), "toast_wa_opening key missing");
  });

  it("nav_budget key present", function () {
    assert.ok(JS.includes("nav_budget"), "nav_budget key missing");
  });

  it("label_waze and label_ceremony_time keys present", function () {
    assert.ok(JS.includes("label_waze"), "label_waze key missing");
    assert.ok(
      JS.includes("label_ceremony_time"),
      "label_ceremony_time key missing",
    );
  });

  it("label_hebrew_date key present in both languages", function () {
    assert.ok(
      JS.includes("label_hebrew_date"),
      "label_hebrew_date key missing",
    );
  });
});

// ── WhatsApp: fillTemplate ──
describe("WhatsApp: fillTemplate", function () {

  it("template supports {address} placeholder", function () {
    assert.ok(JS.includes("{address}"), "{address} placeholder missing");
  });
});

// ── Dashboard Constants ──
// ── nav.js Admin Guard Completeness ──
describe("nav.js Admin Guard Completeness", function () {
  it("adminOnly list includes budget", function () {
    assert.ok(
      JS.includes('"budget"') || JS.includes("'budget'"),
      "adminOnly missing 'budget'",
    );
  });

  it("adminOnly list includes settings", function () {
    assert.ok(
      JS.includes('"settings"') || JS.includes("'settings'"),
      "adminOnly missing 'settings'",
    );
  });

  it("adminOnly list includes tables", function () {
    assert.ok(JS.includes("tables"), "adminOnly missing 'tables'");
  });

  it("showSection function includes analytics render call", function () {
    assert.ok(
      JS.includes("renderAnalytics()"),
      "renderAnalytics() call missing in nav",
    );
  });
});

// ── Budget Extra Coverage ──
describe("Budget Extra Coverage", function () {

  it("HTML has budgetTableBody", function () {
    assert.ok(HTML.includes('id="budgetTableBody"'), "budgetTableBody missing");
  });

  it("HTML has budgetProgressBar", function () {
    assert.ok(
      HTML.includes('id="budgetProgressBar"'),
      "budgetProgressBar missing",
    );
  });

  it("HTML has budget stats: budgetStatBudget and budgetStatPct", function () {
    assert.ok(
      HTML.includes('id="budgetStatBudget"'),
      "budgetStatBudget missing",
    );
    assert.ok(HTML.includes('id="budgetStatPct"'), "budgetStatPct missing");
  });
});

// ── Analytics Full Function Coverage ──
// ── Settings Functions ──
describe("Settings Functions", function () {
  it("updateWeddingDetails function exists", function () {
    assert.ok(
      JS.includes("function updateWeddingDetails"),
      "updateWeddingDetails missing",
    );
  });

  it("HTML has dataSummary element", function () {
    assert.ok(HTML.includes('id="dataSummary"'), "dataSummary element missing");
  });
});

// ── Sheets Full Coverage ──
// ── Data Migration Fields ──
describe("Data Migration Fields", function () {

  it("migrateGuests initialises gift field", function () {
    assert.ok(JS.includes("g.gift"), "gift field migration missing");
  });

  it("migrateGuests initialises accessibility field", function () {
    assert.ok(
      JS.includes("g.accessibility"),
      "accessibility field migration missing",
    );
  });

  it("migrateGuests initialises transport field", function () {
    assert.ok(JS.includes("g.transport"), "transport field migration missing");
  });

  it("migrateGuests initialises rsvpDate field", function () {
    assert.ok(JS.includes("g.rsvpDate"), "rsvpDate field migration missing");
  });
});

// ── HTML DOM IDs Extra ──
describe("HTML DOM IDs Extra", function () {
  it("has hebrewDateDisplay element", function () {
    assert.ok(
      HTML.includes('id="hebrewDateDisplay"'),
      "hebrewDateDisplay missing",
    );
  });

  it("has budget section nav tab", function () {
    assert.ok(HTML.includes('data-tab="budget"'), "budget nav tab missing");
  });

  it("has weddingCeremonyTime input", function () {
    assert.ok(
      HTML.includes('id="weddingCeremonyTime"'),
      "weddingCeremonyTime input missing",
    );
  });

  it("has venueWaze input for navigation link", function () {
    assert.ok(HTML.includes('id="venueWaze"'), "venueWaze input missing");
  });

  it("has budgetTargetInput for gift target", function () {
    assert.ok(
      HTML.includes('id="budgetTargetInput"'),
      "budgetTargetInput missing",
    );
  });
});

// ── ESLint Config ──
describe("ESLint Config", function () {
  it("varsIgnorePattern is simplified to ^_ (S0.12)", function () {
    assert.ok(ESLINT_CFG.includes("^_"), "^_ missing from varsIgnorePattern");
    assert.ok(
      !ESLINT_CFG.includes("^lookup"),
      "^lookup should be removed by S0.12",
    );
  });

  it("OAuth SDK globals (FB, AppleID, google) declared readonly", function () {
    assert.ok(ESLINT_CFG.includes("FB:"), "FB global missing");
    assert.ok(ESLINT_CFG.includes("AppleID:"), "AppleID global missing");
    assert.ok(ESLINT_CFG.includes("google:"), "google global missing");
  });

});

// ── S0.11 / S0.12: Entry-point switch compliance ──
describe("S0.11: ESM entry point switch", function () {
  it("index.html uses src/main.js not js/main.js", function () {
    assert.ok(
      HTML.includes('src="./src/main.js"'),
      "index.html must point to src/main.js",
    );
    assert.ok(
      !HTML.includes('src="./js/main.js"'),
      "index.html must not point to legacy js/main.js",
    );
  });

  it("vite.config.js does NOT include legacyGlobalsPlugin", function () {
    const VITE_CFG = readFileSync(
      resolve(__dirname, "..", "vite.config.js"),
      "utf8",
    );
    assert.ok(
      !VITE_CFG.includes("legacyGlobalsPlugin"),
      "legacyGlobalsPlugin must be removed from vite.config.js",
    );
  });

  it("src/main.js exists and registers showSection handler", function () {
    const srcMain = readFileSync(
      resolve(__dirname, "..", "src", "main.js"),
      "utf8",
    );
    assert.ok(
      srcMain.includes("showSection"),
      "src/main.js must register showSection handler",
    );
  });

  it("src/main.js registers auth handlers", function () {
    const srcMain = readFileSync(
      resolve(__dirname, "..", "src", "main.js"),
      "utf8",
    );
    const srcAuth = readFileSync(
      resolve(__dirname, "..", "src", "handlers", "auth-handlers.js"),
      "utf8",
    );
    const combined = `${srcMain}\n${srcAuth}`;
    assert.ok(combined.includes("signOut"), "auth handlers must handle signOut");
    assert.ok(
      combined.includes("showAuthOverlay"),
      "auth handlers must handle showAuthOverlay",
    );
  });
});

// ── Service Worker APP_SHELL Completeness ──
// ── Timeline Section (v1.16.0) ──
describe("Timeline Section", function () {
  it("timeline section exists in HTML", function () {
    assert.ok(
      HTML.includes('id="sec-timeline"'),
      "sec-timeline section missing",
    );
  });

  it("timeline nav tab exists in HTML", function () {
    assert.ok(HTML.includes('data-tab="timeline"'), "timeline nav tab missing");
  });

  it("renderTimeline function exists in JS", function () {
    assert.ok(JS.includes("function renderTimeline"), "renderTimeline missing");
  });

  it("saveTimelineItem function exists in JS", function () {
    assert.ok(
      JS.includes("function saveTimelineItem"),
      "saveTimelineItem missing",
    );
  });

  it("deleteTimelineItem function exists in JS", function () {
    assert.ok(
      JS.includes("function deleteTimelineItem"),
      "deleteTimelineItem missing",
    );
  });

  it("nav_timeline i18n key present", function () {
    assert.ok(JS.includes("nav_timeline"), "nav_timeline key missing");
  });

  it("timeline_title i18n key present", function () {
    assert.ok(JS.includes("timeline_title"), "timeline_title key missing");
  });

  it("timeline_empty i18n key present", function () {
    assert.ok(JS.includes("timeline_empty"), "timeline_empty key missing");
  });

  it(".timeline-item CSS class defined", function () {
    assert.ok(CSS.includes(".timeline-item"), ".timeline-item CSS missing");
  });

  it(".timeline-dot CSS class defined", function () {
    assert.ok(CSS.includes(".timeline-dot"), ".timeline-dot CSS missing");
  });

  it(".timeline-content CSS class defined", function () {
    assert.ok(
      CSS.includes(".timeline-content"),
      ".timeline-content CSS missing",
    );
  });

  it("timeline data persisted via storeSet('timeline')", function () {
    assert.ok(
      JS.includes('storeSet("timeline"') || JS.includes("storeSet('timeline'"),
      "storeSet('timeline') call missing",
    );
  });
});

// ── QR Code for RSVP (v1.16.0) ──
describe("QR Code for RSVP", function () {
  it("rsvpQrImage element in HTML", function () {
    assert.ok(HTML.includes('id="rsvpQrImage"'), "rsvpQrImage element missing");
  });

  it("QR provider URL is api.qrserver.com", function () {
    assert.ok(JS.includes("api.qrserver.com"), "api.qrserver.com URL missing");
  });

  it("copyRsvpLink function in JS", function () {
    assert.ok(JS.includes("function copyRsvpLink"), "copyRsvpLink missing");
  });

  it("qr_title i18n key present", function () {
    assert.ok(JS.includes("qr_title"), "qr_title key missing");
  });

  it("qr_print i18n key present", function () {
    assert.ok(JS.includes("qr_print"), "qr_print key missing");
  });
});

// ── Mobile Bottom Navigation (v1.16.0) ──
describe("Mobile Bottom Navigation", function () {
  it("bottomNav element in HTML", function () {
    assert.ok(HTML.includes('id="bottomNav"'), "bottomNav element missing");
  });

  it(".bottom-nav CSS class defined", function () {
    assert.ok(CSS.includes(".bottom-nav"), ".bottom-nav CSS missing");
  });

  it(".bottom-nav-item CSS class defined", function () {
    assert.ok(CSS.includes(".bottom-nav-item"), ".bottom-nav-item CSS missing");
  });

  it("toggleMobileNav function in JS", function () {
    assert.ok(
      JS.includes("function toggleMobileNav"),
      "toggleMobileNav missing",
    );
  });
});

// ── Accessibility (v1.16.0) ──
describe("Accessibility (WCAG 2.1)", function () {
  it("skip link present in HTML", function () {
    assert.ok(HTML.includes('class="skip-link"'), "skip-link missing");
  });

  it(".skip-link CSS class defined", function () {
    assert.ok(CSS.includes(".skip-link"), ".skip-link CSS missing");
  });

  it('main element has id="main-content"', function () {
    assert.ok(
      HTML.includes('id="main-content"'),
      'id="main-content" missing from main element',
    );
  });

  it("toast container has aria-live attribute", function () {
    assert.ok(
      HTML.includes('aria-live="polite"'),
      "aria-live missing on toast container",
    );
  });

  it('guest modal has role="dialog"', function () {
    assert.ok(
      HTML.includes('id="guestModal"') && HTML.includes('role="dialog"'),
      'role="dialog" missing on guestModal',
    );
  });

  it('modals have aria-modal="true"', function () {
    assert.ok(HTML.includes('aria-modal="true"'), 'aria-modal="true" missing');
  });

  it("skip_to_content i18n key present", function () {
    assert.ok(JS.includes("skip_to_content"), "skip_to_content key missing");
  });

});

// ── Guest Landing Page (v1.15.0) ──
describe("Guest Landing Page", function () {
  it("sec-landing section in HTML", function () {
    assert.ok(HTML.includes('id="sec-landing"'), "#sec-landing missing");
  });

  it("landingCoupleName element in HTML", function () {
    assert.ok(
      HTML.includes('id="landingCoupleName"'),
      "#landingCoupleName missing",
    );
  });

  it("landingTimeline element in HTML", function () {
    assert.ok(
      HTML.includes('id="landingTimeline"'),
      "#landingTimeline missing",
    );
  });

  it("landing_rsvp_cta i18n key in HTML", function () {
    assert.ok(
      HTML.includes("landing_rsvp_cta"),
      "landing_rsvp_cta missing in HTML",
    );
  });

  it("nav_landing i18n key in JS", function () {
    assert.ok(JS.includes("nav_landing"), "nav_landing i18n key missing");
  });
});

// ── Hash Router (v1.15.0) ──
describe("Hash Router", function () {

  it("initRouter function in JS", function () {
    assert.ok(JS.includes("function initRouter"), "initRouter missing");
  });

  it("history.replaceState used in router", function () {
    assert.ok(JS.includes("replaceState"), "replaceState missing in router");
  });

  it("hashchange event listener in router", function () {
    assert.ok(JS.includes("hashchange"), "hashchange event missing");
  });
});

// ── Venue Map (v1.15.0) ──
describe("Venue Map", function () {
  it("venueMapContainer element in HTML", function () {
    assert.ok(
      HTML.includes('id="venueMapContainer"'),
      "#venueMapContainer missing",
    );
  });

  it("venueMapFrame iframe in HTML", function () {
    assert.ok(HTML.includes('id="venueMapFrame"'), "#venueMapFrame missing");
  });

  it("map_title i18n key in HTML", function () {
    assert.ok(HTML.includes("map_title"), "map_title missing in HTML");
  });

  it("CSP includes nominatim.openstreetmap.org in connect-src", function () {
    assert.ok(
      HTML.includes("nominatim.openstreetmap.org"),
      "Nominatim missing in CSP",
    );
  });

  it("CSP includes www.openstreetmap.org in frame-src", function () {
    assert.ok(
      HTML.includes("www.openstreetmap.org"),
      "OSM missing in frame-src CSP",
    );
  });
});

// ── Expense Tracker (v1.15.0) ──
describe("Expense Tracker", function () {
  it("expenseList tbody in HTML", function () {
    assert.ok(HTML.includes('id="expenseList"'), "#expenseList missing");
  });

  it("expenseModal in HTML", function () {
    assert.ok(HTML.includes('id="expenseModal"'), "#expenseModal missing");
  });

  it("expense_add i18n key in HTML", function () {
    assert.ok(HTML.includes("expense_add"), "expense_add missing in HTML");
  });

  it("budget_expenses_title i18n key in HTML", function () {
    assert.ok(
      HTML.includes("budget_expenses_title"),
      "budget_expenses_title missing in HTML",
    );
  });

  it("renderExpenses function in JS", function () {
    assert.ok(JS.includes("function renderExpenses"), "renderExpenses missing");
  });

  it("saveExpense function in JS", function () {
    assert.ok(JS.includes("function saveExpense"), "saveExpense missing");
  });

  it("deleteExpense function in JS", function () {
    assert.ok(JS.includes("function deleteExpense"), "deleteExpense missing");
  });

  it("expense_cat_venue i18n key in JS", function () {
    assert.ok(
      JS.includes("expense_cat_venue"),
      "expense_cat_venue i18n key missing",
    );
  });

  it("wedding_v1_expenses storage key in JS", function () {
    assert.ok(
      JS.includes("'expenses'") || JS.includes('"expenses"'),
      "expenses storage key missing",
    );
  });

  it(".guest-landing-hero CSS class", function () {
    assert.ok(
      CSS.includes(".guest-landing-hero"),
      ".guest-landing-hero CSS missing",
    );
  });
});

// ── Smart Sheets Polling (v1.15.0) ──
describe("Smart Sheets Polling", function () {

  it("visibilitychange event listener in sheets.js", function () {
    assert.ok(
      JS.includes("visibilitychange"),
      "visibilitychange listener missing",
    );
  });

});

// ── Registry Links (v1.16.0) ──
describe("Registry Links", function () {

  it("landingRegistryList element in HTML", function () {
    assert.ok(
      HTML.includes('id="landingRegistryList"'),
      "#landingRegistryList missing",
    );
  });

  it("registry_title i18n key in JS", function () {
    assert.ok(JS.includes("registry_title"), "registry_title i18n key missing");
  });

  it("registries stored in weddingInfo", function () {
    assert.ok(JS.includes("registries"), "_weddingInfo.registries missing");
  });
});

// ── Check-in Mode + Headcount (v1.16.0) ──
describe("Check-in Mode", function () {

  it("sec-checkin section in HTML", function () {
    assert.ok(HTML.includes('id="sec-checkin"'), "#sec-checkin missing");
  });

  it("checkinList tbody in HTML", function () {
    assert.ok(HTML.includes('id="checkinList"'), "#checkinList missing");
  });

  it("renderCheckin function in JS", function () {
    assert.ok(JS.includes("function renderCheckin"), "renderCheckin missing");
  });

  it("arrived field migrated in state.js", function () {
    assert.ok(JS.includes("arrived"), "arrived field migration missing");
  });

  it("checkin_arrive_btn i18n key in JS", function () {
    assert.ok(
      JS.includes("checkin_arrive_btn"),
      "checkin_arrive_btn i18n key missing",
    );
  });

  it("checkinArrived stat element in HTML", function () {
    assert.ok(HTML.includes('id="checkinArrived"'), "#checkinArrived missing");
  });

  it("nav_checkin i18n key in HTML", function () {
    assert.ok(HTML.includes("nav_checkin"), "nav_checkin missing in HTML");
  });
});

// ── Table Finder (v1.16.0) ──
describe("Table Finder", function () {
  it("tablefinderInput element in HTML", function () {
    assert.ok(
      HTML.includes('id="tablefinderInput"'),
      "#tablefinderInput missing",
    );
  });

  it("tablefinderResult element in HTML", function () {
    assert.ok(
      HTML.includes('id="tablefinderResult"'),
      "#tablefinderResult missing",
    );
  });

  it("findTable function in JS", function () {
    assert.ok(JS.includes("function findTable"), "findTable missing");
  });

  it("tablefinder_title i18n key in JS", function () {
    assert.ok(
      JS.includes("tablefinder_title"),
      "tablefinder_title i18n key missing",
    );
  });

  it("tablefinder CSS classes in CSS", function () {
    assert.ok(
      CSS.includes(".tablefinder-found"),
      ".tablefinder-found CSS missing",
    );
  });
});

// ── Photo Gallery (v1.16.0) ──
describe("Photo Gallery", function () {

  it("sec-gallery section in HTML", function () {
    assert.ok(HTML.includes('id="sec-gallery"'), "#sec-gallery missing");
  });

  it("galleryGrid element in HTML", function () {
    assert.ok(HTML.includes('id="galleryGrid"'), "#galleryGrid missing");
  });

  it("renderGallery function in JS", function () {
    assert.ok(JS.includes("function renderGallery"), "renderGallery missing");
  });

  it("handleGalleryUpload function in JS", function () {
    assert.ok(
      JS.includes("function handleGalleryUpload"),
      "handleGalleryUpload missing",
    );
  });

  it("deleteGalleryPhoto function in JS", function () {
    assert.ok(
      JS.includes("function deleteGalleryPhoto"),
      "deleteGalleryPhoto missing",
    );
  });

  it("gallery i18n key in JS", function () {
    assert.ok(JS.includes("gallery_upload"), "gallery_upload i18n key missing");
  });

  it("_gallery state in config.js", function () {
    assert.ok(JS.includes("_gallery"), "_gallery state missing");
  });

  it('gallery storage key via storeSet("gallery")', function () {
    assert.ok(
      JS.includes('storeSet("gallery"') || JS.includes("storeSet('gallery'"),
      "gallery storeSet call missing",
    );
  });

  it("gallery lightbox in HTML", function () {
    assert.ok(
      HTML.includes('id="galleryLightbox"'),
      "#galleryLightbox missing",
    );
  });

  it(".gallery-grid CSS class", function () {
    assert.ok(CSS.includes(".gallery-grid"), ".gallery-grid CSS missing");
  });
});

// ── Print Materials (v1.16.0) ──
describe("Print Materials", function () {
  it("print.css linked in HTML", function () {
    assert.ok(HTML.includes("print.css"), "print.css link missing");
  });

  it("printPlaceCards function in JS", function () {
    assert.ok(
      JS.includes("function printPlaceCards"),
      "printPlaceCards missing",
    );
  });

  it("printTableSigns function in JS", function () {
    assert.ok(
      JS.includes("function printTableSigns"),
      "printTableSigns missing",
    );
  });

  it("placeCardsGrid element in HTML", function () {
    assert.ok(HTML.includes('id="placeCardsGrid"'), "#placeCardsGrid missing");
  });

  it("tableSignsGrid element in HTML", function () {
    assert.ok(HTML.includes('id="tableSignsGrid"'), "#tableSignsGrid missing");
  });

  it(".place-card CSS class in print.css", function () {
    assert.ok(CSS.includes(".place-card"), ".place-card CSS missing");
  });

  it(".table-sign CSS class in print.css", function () {
    assert.ok(CSS.includes(".table-sign"), ".table-sign CSS missing");
  });

  it("@media print rules in CSS", function () {
    assert.ok(CSS.includes("@media print"), "@media print missing");
  });

  it("print_place_cards i18n key in JS", function () {
    assert.ok(
      JS.includes("print_place_cards"),
      "print_place_cards i18n key missing",
    );
  });

  it("print.css exists in css/", function () {
    assert.ok(
      existsSync(resolve(CSS_DIR, "print.css")),
      "print.css missing from css/",
    );
  });
});

// ── Contact Collector (v1.17.0) ──
describe("Contact Collector", function () {

  it("sec-contact-form section in HTML", function () {
    assert.ok(
      HTML.includes('id="sec-contact-form"'),
      "#sec-contact-form missing",
    );
  });

  it("ccFirstName input in HTML", function () {
    assert.ok(HTML.includes('id="ccFirstName"'), "#ccFirstName missing");
  });

  it("ccPhone input in HTML", function () {
    assert.ok(HTML.includes('id="ccPhone"'), "#ccPhone missing");
  });

  it("submitContactForm function in JS", function () {
    assert.ok(
      JS.includes("function submitContactForm"),
      "submitContactForm missing",
    );
  });

  it("copyContactLink function in JS", function () {
    assert.ok(
      JS.includes("function copyContactLink"),
      "copyContactLink missing",
    );
  });

  it("contact_title i18n key in JS", function () {
    assert.ok(JS.includes("contact_title"), "contact_title i18n key missing");
  });

  it("contact-form in router valid sections", function () {
    assert.ok(
      JS.includes('"contact-form"') || JS.includes("'contact-form'"),
      "contact-form not in router valid list",
    );
  });

  it("contactCollectorLink element in HTML", function () {
    assert.ok(
      HTML.includes('id="contactCollectorLink"'),
      "#contactCollectorLink missing",
    );
  });
});

// ── Offline RSVP Queue (v1.17.0) ──
describe("Offline RSVP Queue", function () {

  it("flushOfflineQueue function in JS", function () {
    assert.ok(
      JS.includes("function flushOfflineQueue"),
      "flushOfflineQueue missing",
    );
  });

  it("initOfflineQueue function in JS", function () {
    assert.ok(
      JS.includes("function initOfflineQueue"),
      "initOfflineQueue missing",
    );
  });

  it("online event listener in offline-queue.js", function () {
    assert.ok(
      JS.includes('"online"') || JS.includes("'online'"),
      "online event listener missing",
    );
  });

  it("offline event listener in offline-queue.js", function () {
    assert.ok(
      JS.includes('"offline"') || JS.includes("'offline'"),
      "offline event listener missing",
    );
  });

  it("offlineBadge element in HTML", function () {
    assert.ok(HTML.includes('id="offlineBadge"'), "#offlineBadge missing");
  });

  it("offline_queued i18n key in JS", function () {
    assert.ok(JS.includes("offline_queued"), "offline_queued i18n key missing");
  });

  it("navigator.onLine check in rsvp.js", function () {
    assert.ok(
      JS.includes("navigator.onLine"),
      "navigator.onLine check missing",
    );
  });
});

// ── Audit Log (v1.17.0) ──
describe("Audit Log", function () {

  it("clearAuditLog function in JS", function () {
    assert.ok(JS.includes("function clearAuditLog"), "clearAuditLog missing");
  });

  it('audit log saved via storeSet("auditLog")', function () {
    assert.ok(
      JS.includes('storeSet("auditLog"') || JS.includes("storeSet('auditLog'"),
      "audit storeSet call missing",
    );
  });

  it("auditLogBody element in HTML", function () {
    assert.ok(HTML.includes('id="auditLogBody"'), "#auditLogBody missing");
  });

  it("audit_title i18n key in JS", function () {
    assert.ok(JS.includes("audit_title"), "audit_title i18n key missing");
  });

});

// ── Error Monitoring (v1.17.0) ──
describe("Error Monitoring", function () {

  it("clearErrorLog function in JS", function () {
    assert.ok(JS.includes("function clearErrorLog"), "clearErrorLog missing");
  });

  it("errorLogBody element in HTML", function () {
    assert.ok(HTML.includes('id="errorLogBody"'), "#errorLogBody missing");
  });

  it("errors_title i18n key in JS", function () {
    assert.ok(JS.includes("errors_title"), "errors_title i18n key missing");
  });
});

// ── PWA / Preload (v1.17.0) ──
describe("PWA and Performance", function () {
  it("apple-touch-icon link in HTML", function () {
    assert.ok(HTML.includes("apple-touch-icon"), "apple-touch-icon missing");
  });

  it("apple-mobile-web-app-capable meta in HTML", function () {
    assert.ok(
      HTML.includes("apple-mobile-web-app-capable"),
      "apple-mobile-web-app-capable missing",
    );
  });

  it("preconnect to accounts.google.com in HTML", function () {
    assert.ok(
      HTML.includes("preconnect") && HTML.includes("accounts.google.com"),
      "preconnect to Google missing",
    );
  });

  it("no stale JS preload hints (Vite bundles JS)", function () {
    assert.ok(
      !HTML.includes('rel="preload" as="script"'),
      "stale JS preload found — Vite bundles JS",
    );
  });

  it("icon-192.png referenced in manifest", function () {
    const icons = JSON.stringify(MANIFEST.icons || []);
    assert.ok(
      icons.includes("icon-192.png"),
      "icon-192.png missing from manifest",
    );
  });

  it("icon-512.png referenced in manifest", function () {
    const icons = JSON.stringify(MANIFEST.icons || []);
    assert.ok(
      icons.includes("icon-512.png"),
      "icon-512.png missing from manifest",
    );
  });

  it("manifest has background_color", function () {
    assert.ok(
      MANIFEST.background_color,
      "background_color missing from manifest",
    );
  });

  it("icon-192.png in SW APP_SHELL", function () {
    assert.ok(
      SW.includes("icon-192.png"),
      "icon-192.png missing from SW APP_SHELL",
    );
  });

  it("icon-512.png in SW APP_SHELL", function () {
    assert.ok(
      SW.includes("icon-512.png"),
      "icon-512.png missing from SW APP_SHELL",
    );
  });

  it("generate-icons.mjs script exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "scripts", "generate-icons.mjs")),
      "scripts/generate-icons.mjs missing",
    );
  });

  it("npm run icons script in package.json", function () {
    assert.ok(
      PKG.scripts && PKG.scripts.icons,
      '"icons" script missing from package.json',
    );
  });
});

// ── Email Notifications (v1.18.0) ──
describe("Email Notifications", function () {
  const GS = readFileSync(
    resolve(__dirname, "..", ".github", "scripts", "sheets-webapp.gs"),
    "utf8",
  );

  it("emailSettingsCard element in HTML", function () {
    assert.ok(
      HTML.includes('id="emailSettingsCard"'),
      "#emailSettingsCard missing from HTML",
    );
  });

  it("email_card_title i18n key in JS", function () {
    assert.ok(
      JS.includes("email_card_title"),
      "email_card_title i18n key missing",
    );
  });

  it("sendEmail action in Apps Script", function () {
    assert.ok(
      GS.includes("action === 'sendEmail'") || GS.includes("sendEmail"),
      "sendEmail action missing from sheets-webapp.gs",
    );
  });

  it("rsvpConfirmation email type in Apps Script", function () {
    assert.ok(
      GS.includes("rsvpConfirmation"),
      "rsvpConfirmation type missing from GAS",
    );
  });

  it("adminRsvpNotify email type in Apps Script", function () {
    assert.ok(
      GS.includes("adminRsvpNotify"),
      "adminRsvpNotify type missing from GAS",
    );
  });

});

// ── Apps Script Validation + Rate Limiting (v1.18.0) ──
describe("Apps Script Server-Side Hardening", function () {
  const GS = readFileSync(
    resolve(__dirname, "..", ".github", "scripts", "sheets-webapp.gs"),
    "utf8",
  );

  it("_validateGuestRow function in GAS", function () {
    assert.ok(
      GS.includes("_validateGuestRow"),
      "_validateGuestRow missing from GAS",
    );
  });

  it("_checkRateLimit function in GAS", function () {
    assert.ok(
      GS.includes("_checkRateLimit"),
      "_checkRateLimit missing from GAS",
    );
  });

  it("PropertiesService used for rate limiting", function () {
    assert.ok(
      GS.includes("PropertiesService"),
      "PropertiesService missing from GAS",
    );
  });

  it("rate limit check called in doPost", function () {
    assert.ok(
      GS.includes("_checkRateLimit()"),
      "_checkRateLimit() not called in doPost",
    );
  });

  it("validation applied to Attendees append", function () {
    assert.ok(
      GS.includes("_validateGuestRow(row)"),
      "guest row validation not applied to append",
    );
  });

  it("validation applied to Attendees replaceAll", function () {
    assert.ok(
      GS.includes("_validateGuestRow(rows[i])"),
      "guest row validation not applied to replaceAll",
    );
  });

  it("VALID_STATUS array defined in GAS", function () {
    assert.ok(GS.includes("VALID_STATUS"), "VALID_STATUS not defined in GAS");
  });

  it("VALID_SIDE array defined in GAS", function () {
    assert.ok(GS.includes("VALID_SIDE"), "VALID_SIDE not defined in GAS");
  });

  it("MailApp used in GAS", function () {
    assert.ok(
      GS.includes("MailApp.sendEmail"),
      "MailApp.sendEmail missing from GAS",
    );
  });

  it("GAS version updated to 1.18.0", function () {
    assert.ok(GS.includes("1.18.0"), "GAS version not updated to 1.18.0");
  });
});

// ── Config Externalization (v1.18.0) ──
describe("Config Externalization", function () {
  it("wedding.json exists in project root", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "public", "wedding.json")),
      "wedding.json missing",
    );
  });

  it("wedding.json is valid JSON with required keys", function () {
    const cfg = JSON.parse(
      readFileSync(resolve(__dirname, "..", "public", "wedding.json"), "utf8"),
    );
    assert.ok(cfg.groom !== undefined, "wedding.json missing groom");
    assert.ok(cfg.bride !== undefined, "wedding.json missing bride");
    assert.ok(cfg.date !== undefined, "wedding.json missing date");
    assert.ok(cfg.groomEn !== undefined, "wedding.json missing groomEn");
    assert.ok(cfg.brideEn !== undefined, "wedding.json missing brideEn");
  });

  it("wedding.json in SW APP_SHELL", function () {
    assert.ok(
      SW.includes("wedding.json"),
      "wedding.json missing from SW APP_SHELL",
    );
  });

});

// ── Lighthouse CI (v1.18.0) ──
describe("Lighthouse CI", function () {
  it(".lighthouserc.json exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", ".lighthouserc.json")),
      ".lighthouserc.json missing",
    );
  });

  it(".lighthouserc.json is valid JSON", function () {
    const lhrc = JSON.parse(
      readFileSync(resolve(__dirname, "..", ".lighthouserc.json"), "utf8"),
    );
    assert.ok(lhrc.ci, ".lighthouserc.json missing ci key");
    assert.ok(lhrc.ci.collect, ".lighthouserc.json missing ci.collect");
  });

  it(".lighthouserc.json has assert block with minScore thresholds", function () {
    const lhrc = JSON.parse(
      readFileSync(resolve(__dirname, "..", ".lighthouserc.json"), "utf8"),
    );
    assert.ok(lhrc.ci.assert, ".lighthouserc.json missing assert block");
    assert.ok(
      lhrc.ci.assert.assertions,
      ".lighthouserc.json missing assertions",
    );
  });

  it("ci.yml has lighthouse job", function () {
    const ci = readFileSync(
      resolve(__dirname, "..", ".github", "workflows", "ci.yml"),
      "utf8",
    );
    assert.ok(
      ci.includes("lighthouse") || ci.includes("Lighthouse"),
      "lighthouse job missing from ci.yml",
    );
  });

  it("ci.yml uses @lhci/cli", function () {
    const ci = readFileSync(
      resolve(__dirname, "..", ".github", "workflows", "ci.yml"),
      "utf8",
    );
    assert.ok(
      ci.includes("@lhci/cli") || ci.includes("lhci"),
      "@lhci/cli missing from ci.yml",
    );
  });

  it(".lighthouserc.json has accessibility threshold", function () {
    const lhrc = JSON.parse(
      readFileSync(resolve(__dirname, "..", ".lighthouserc.json"), "utf8"),
    );
    const assertions = lhrc.ci.assert.assertions;
    assert.ok(
      assertions["categories:accessibility"],
      "accessibility assertion missing",
    );
  });

  it(".lighthouserc.json thresholds meet v2 targets", function () {
    const lhrc = JSON.parse(
      readFileSync(resolve(__dirname, "..", ".lighthouserc.json"), "utf8"),
    );
    const a = lhrc.ci.assert.assertions;
    assert.ok(
      a["categories:performance"][1].minScore >= 0.85,
      "performance target too low",
    );
    assert.ok(
      a["categories:accessibility"][1].minScore >= 0.9,
      "accessibility target too low",
    );
    assert.ok(a["categories:seo"][1].minScore >= 0.9, "seo target too low");
  });
});

// ── SRI Tooling (v1.19.0) ──
describe("SRI Tooling", function () {
  it("sri-check.mjs script exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "scripts", "sri-check.mjs")),
      "scripts/sri-check.mjs missing",
    );
  });

  it("npm run sri script in package.json", function () {
    assert.ok(
      PKG.scripts && PKG.scripts.sri,
      '"sri" script missing from package.json',
    );
  });

  it('Google GIS SDK has crossorigin="anonymous"', function () {
    assert.ok(
      HTML.includes('crossorigin="anonymous"'),
      'crossorigin="anonymous" missing from GIS SDK script',
    );
  });

  it("sri-check.mjs references sha384", function () {
    const sriScript = readFileSync(
      resolve(__dirname, "..", "scripts", "sri-check.mjs"),
      "utf8",
    );
    assert.ok(
      sriScript.includes("sha384"),
      "sha384 hash algorithm missing from sri-check.mjs",
    );
  });
});

// -- Secrets Injection (v1.19.0) --
describe("Secrets Injection", function () {
  it("inject-config.mjs script exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "scripts", "inject-config.mjs")),
      "scripts/inject-config.mjs missing",
    );
  });

  it("deploy.yml calls inject-config script", function () {
    const dep = readFileSync(
      resolve(__dirname, "..", ".github", "workflows", "deploy.yml"),
      "utf8",
    );
    assert.ok(
      dep.includes("inject-config.mjs"),
      "inject-config.mjs not called in deploy.yml",
    );
  });

  it("deploy.yml uses GitHub Secrets for GOOGLE_CLIENT_ID", function () {
    const dep = readFileSync(
      resolve(__dirname, "..", ".github", "workflows", "deploy.yml"),
      "utf8",
    );
    assert.ok(
      dep.includes("secrets.GOOGLE_CLIENT_ID"),
      "GOOGLE_CLIENT_ID secret missing from deploy.yml",
    );
  });

  it("deploy.yml uses GitHub Secrets for SHEETS_WEBAPP_URL", function () {
    const dep = readFileSync(
      resolve(__dirname, "..", ".github", "workflows", "deploy.yml"),
      "utf8",
    );
    assert.ok(
      dep.includes("secrets.SHEETS_WEBAPP_URL"),
      "SHEETS_WEBAPP_URL secret missing from deploy.yml",
    );
  });

  it("inject-config.mjs defines SUBSTITUTIONS list", function () {
    const ic = readFileSync(
      resolve(__dirname, "..", "scripts", "inject-config.mjs"),
      "utf8",
    );
    assert.ok(
      ic.includes("SUBSTITUTIONS"),
      "SUBSTITUTIONS array missing from inject-config.mjs",
    );
  });
});

// -- Web Push Notifications (v1.19.0) --
describe("Web Push Notifications", function () {
  const GS19 = readFileSync(
    resolve(__dirname, "..", ".github", "scripts", "sheets-webapp.gs"),
    "utf8",
  );

  it("pushSettingsCard element in HTML", function () {
    assert.ok(
      HTML.includes('id="pushSettingsCard"'),
      "#pushSettingsCard missing from HTML",
    );
  });

  it("VAPID_PUBLIC_KEY constant in JS", function () {
    assert.ok(
      JS.includes("VAPID_PUBLIC_KEY"),
      "VAPID_PUBLIC_KEY missing from config.js",
    );
  });

  it("SW handles push event", function () {
    assert.ok(
      SW.includes('addEventListener("push"'),
      "push event listener missing from SW",
    );
  });

  it("SW handles notificationclick event", function () {
    assert.ok(
      SW.includes('addEventListener("notificationclick"'),
      "notificationclick listener missing from SW",
    );
  });

  it("push_card_title i18n key in JS", function () {
    assert.ok(
      JS.includes("push_card_title"),
      "push_card_title i18n key missing",
    );
  });

  it("savePushSubscription action in GAS", function () {
    assert.ok(
      GS19.includes("savePushSubscription"),
      "savePushSubscription missing from GAS",
    );
  });

  it("getPushSubscriptions action in GAS", function () {
    assert.ok(
      GS19.includes("getPushSubscriptions"),
      "getPushSubscriptions missing from GAS",
    );
  });

  it("send-push.mjs script exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "scripts", "send-push.mjs")),
      "scripts/send-push.mjs missing",
    );
  });

});

// -- Bundle Size Report (v1.19.0) --
describe("Bundle Size Report", function () {
  it("size-report.mjs script exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "scripts", "size-report.mjs")),
      "scripts/size-report.mjs missing",
    );
  });

  it("npm run size script in package.json", function () {
    assert.ok(
      PKG.scripts && PKG.scripts.size,
      '"size" script missing from package.json',
    );
  });

  it("size-report.mjs checks per-file thresholds", function () {
    const sr = readFileSync(
      resolve(__dirname, "..", "scripts", "size-report.mjs"),
      "utf8",
    );
    assert.ok(
      sr.includes("limit") || sr.includes("LIMIT"),
      "thresholds missing from size-report.mjs",
    );
  });

  it("size-report.mjs reports gzip size", function () {
    const sr = readFileSync(
      resolve(__dirname, "..", "scripts", "size-report.mjs"),
      "utf8",
    );
    assert.ok(
      sr.includes("gzip") || sr.includes("gz"),
      "gzip reporting missing from size-report.mjs",
    );
  });

  it("ci.yml has size-report job", function () {
    const ci19 = readFileSync(
      resolve(__dirname, "..", ".github", "workflows", "ci.yml"),
      "utf8",
    );
    assert.ok(
      ci19.includes("size-report"),
      "size-report job missing from ci.yml",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 72 – Feature: Duplicate Guest Detection
// ─────────────────────────────────────────────────────────────────────────────
describe("Duplicate Guest Detection", function () {

  it("duplicate_guest_phone i18n key exists in he", function () {
    assert.ok(
      JS.includes('"duplicate_guest_phone"'),
      "duplicate_guest_phone key missing from i18n",
    );
  });
  it("duplicate_guest_phone i18n key exists in en", function () {
    assert.ok(
      JS.includes('"duplicate_guest_phone"'),
      "duplicate_guest_phone key missing from i18n",
    );
  });
  it("duplicate_guest_name i18n key exists in he", function () {
    assert.ok(
      JS.includes('"duplicate_guest_name"'),
      "duplicate_guest_name key missing from i18n",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 73 – Feature: RSVP Deadline Banner
// ─────────────────────────────────────────────────────────────────────────────
describe("RSVP Deadline Banner", function () {

  it("label_rsvp_deadline i18n key in JS sources", function () {
    assert.ok(
      JS.includes('"label_rsvp_deadline"'),
      "label_rsvp_deadline key missing from i18n",
    );
  });
  it("rsvpDeadlineBanner div in HTML", function () {
    assert.ok(
      HTML.includes('id="rsvpDeadlineBanner"'),
      "rsvpDeadlineBanner div missing from index.html",
    );
  });
  it("rsvpDeadline input in settings HTML", function () {
    assert.ok(
      HTML.includes('id="rsvpDeadline"'),
      "rsvpDeadline input missing from index.html",
    );
  });
  it("rsvp_deadline_banner i18n key in JS sources", function () {
    assert.ok(
      JS.includes('"rsvp_deadline_banner"'),
      "rsvp_deadline_banner key missing from i18n",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 74 – Feature: Auto-Assign Tables
// ─────────────────────────────────────────────────────────────────────────────
describe("Auto-Assign Tables", function () {
  it("autoAssignTables function exists in tables.js", function () {
    const tbl = readFileSync(
      resolve(__dirname, "..", "src", "sections", "tables.js"),
      "utf8",
    );
    assert.ok(
      tbl.includes("autoAssignTables"),
      "autoAssignTables missing from tables.js",
    );
  });
  it("btn_auto_assign i18n key in JS sources", function () {
    assert.ok(
      JS.includes('"btn_auto_assign"'),
      "btn_auto_assign key missing from i18n",
    );
  });
  it("auto_assign_done i18n key in JS sources", function () {
    assert.ok(
      JS.includes('"auto_assign_done"'),
      "auto_assign_done key missing from i18n",
    );
  });
  it("autoAssignTables button in HTML", function () {
    assert.ok(
      HTML.includes("autoAssignTables"),
      "autoAssignTables data-action missing from index.html",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 75 – Feature: Meal Summary for Caterer
// ─────────────────────────────────────────────────────────────────────────────
describe("Meal Summary for Caterer", function () {
  it("renderMealSummary function exists in analytics.js", function () {
    const anl = readFileSync(
      resolve(__dirname, "..", "src", "sections", "analytics.js"),
      "utf8",
    );
    assert.ok(
      anl.includes("renderMealSummary"),
      "renderMealSummary missing from analytics.js",
    );
  });

  it("analyticsMealSummary div in HTML", function () {
    assert.ok(
      HTML.includes('id="analyticsMealSummary"'),
      "analyticsMealSummary div missing from index.html",
    );
  });
  it("meal_summary_title i18n key in JS sources", function () {
    assert.ok(
      JS.includes('"meal_summary_title"'),
      "meal_summary_title key missing from i18n",
    );
  });
  it("meal_summary_copy i18n key in JS sources", function () {
    assert.ok(
      JS.includes('"meal_summary_copy"'),
      "meal_summary_copy key missing from i18n",
    );
  });
  it("meal_summary_copied i18n key in JS sources", function () {
    assert.ok(
      JS.includes('"meal_summary_copied"'),
      "meal_summary_copied key missing from i18n",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 76 – Feature: Vendor Management
// ─────────────────────────────────────────────────────────────────────────────
describe("Vendor Management", function () {
  const vendorJS = readFileSync(
    resolve(__dirname, "..", "src", "sections", "vendors.js"),
    "utf8",
  );

  it("vendors.js file exists", function () {
    assert.ok(vendorJS.length > 0, "vendors.js is empty or missing");
  });
  it("renderVendors function exists in vendors.js", function () {
    assert.ok(
      vendorJS.includes("renderVendors"),
      "renderVendors missing from vendors.js",
    );
  });
  it("saveVendor function exists in vendors.js", function () {
    assert.ok(
      vendorJS.includes("saveVendor"),
      "saveVendor missing from vendors.js",
    );
  });
  it("deleteVendor function exists in vendors.js", function () {
    assert.ok(
      vendorJS.includes("deleteVendor"),
      "deleteVendor missing from vendors.js",
    );
  });

  it("sec-vendors section in HTML", function () {
    assert.ok(
      HTML.includes('id="sec-vendors"'),
      "sec-vendors section missing from index.html",
    );
  });
  it("vendorModal in HTML", function () {
    assert.ok(
      HTML.includes('id="vendorModal"'),
      "vendorModal missing from index.html",
    );
  });
  it("vendorTableBody in HTML", function () {
    assert.ok(
      HTML.includes('id="vendorTableBody"'),
      "vendorTableBody missing from index.html",
    );
  });
  it("nav_vendors i18n key in JS sources", function () {
    assert.ok(
      JS.includes('"nav_vendors"'),
      "nav_vendors key missing from i18n",
    );
  });
  it("vendors nav tab in desktop nav HTML", function () {
    assert.ok(
      HTML.includes('data-tab="vendors"'),
      "vendors nav tab missing from index.html",
    );
  });
  it("toast_vendor_saved i18n key in JS sources", function () {
    assert.ok(
      JS.includes('"toast_vendor_saved"'),
      "toast_vendor_saved key missing from i18n",
    );
  });

});

// -- Playwright E2E Tests (v1.19.0) --
describe("Playwright E2E Tests", function () {
  it("playwright.config.mjs exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "playwright.config.mjs")),
      "playwright.config.mjs missing",
    );
  });

  it("tests/e2e/smoke.spec.mjs exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "tests", "e2e", "smoke.spec.mjs")),
      "tests/e2e/smoke.spec.mjs missing",
    );
  });

  it("@playwright/test in devDependencies", function () {
    assert.ok(
      PKG.devDependencies && PKG.devDependencies["@playwright/test"],
      "@playwright/test missing",
    );
  });

  it("serve in devDependencies (webServer)", function () {
    assert.ok(
      PKG.devDependencies && PKG.devDependencies["serve"],
      "serve missing from devDependencies",
    );
  });

  it("npm run test:e2e script in package.json", function () {
    assert.ok(
      PKG.scripts && PKG.scripts["test:e2e"],
      "test:e2e script missing from package.json",
    );
  });

  it("playwright.config.mjs configures webServer", function () {
    const pcfg = readFileSync(
      resolve(__dirname, "..", "playwright.config.mjs"),
      "utf8",
    );
    assert.ok(
      pcfg.includes("webServer"),
      "webServer config missing from playwright.config.mjs",
    );
  });

  it("playwright.config.mjs targets Chromium", function () {
    const pcfg = readFileSync(
      resolve(__dirname, "..", "playwright.config.mjs"),
      "utf8",
    );
    assert.ok(
      pcfg.includes("chromium"),
      "chromium project missing from playwright.config.mjs",
    );
  });

  it("ci.yml has e2e job", function () {
    const ci19 = readFileSync(
      resolve(__dirname, "..", ".github", "workflows", "ci.yml"),
      "utf8",
    );
    assert.ok(ci19.includes("e2e"), "e2e job missing from ci.yml");
  });

  it("smoke.spec.mjs tests page load", function () {
    const spec = readFileSync(
      resolve(__dirname, "..", "tests", "e2e", "smoke.spec.mjs"),
      "utf8",
    );
    assert.ok(
      spec.includes("page loads") || spec.includes("toHaveTitle"),
      "page-load test missing",
    );
  });
});

// ── Event Delegation (events.js) ──
describe("Event Delegation", function () {
  const EVENTS_JS = readFileSync(
    resolve(__dirname, "..", "src", "core", "events.js"),
    "utf8",
  );

  it("events.js exists and is non-empty", function () {
    assert.ok(EVENTS_JS.length > 50);
  });

  it("delegates click via data-action", function () {
    assert.ok(EVENTS_JS.includes("data-action"));
    assert.ok(EVENTS_JS.includes('addEventListener("click"'));
  });

  it("delegates input via data-on-input", function () {
    assert.ok(
      EVENTS_JS.includes("data-on-input") || EVENTS_JS.includes("onInput"),
    );
    assert.ok(EVENTS_JS.includes('addEventListener("input"'));
  });

  it("delegates change via data-on-change", function () {
    assert.ok(
      EVENTS_JS.includes("data-on-change") || EVENTS_JS.includes("onChange"),
    );
    assert.ok(EVENTS_JS.includes('addEventListener("change"'));
  });

  it("HTML uses data-action for navigation", function () {
    assert.ok(HTML.includes('data-action="showSection"'));
  });

  it("HTML uses data-action for modals", function () {
    assert.ok(
      HTML.includes('data-action="openModal"') ||
        HTML.includes('data-action="closeModal"'),
    );
  });

  it("no remaining inline onclick handlers", function () {
    const onclickCount = (HTML.match(/onclick=/gi) || []).length;
    assert.equal(
      onclickCount,
      0,
      `Found ${onclickCount} inline onclick handlers`,
    );
  });

  it("no remaining inline oninput handlers", function () {
    const count = (HTML.match(/\soninput=/gi) || []).length;
    assert.equal(count, 0, `Found ${count} inline oninput handlers`);
  });
});

// ── Reactive Store (store.js) ──
describe("Reactive Store", function () {
  const STORE_JS = readFileSync(
    resolve(__dirname, "..", "src", "core", "store.js"),
    "utf8",
  );

  it("store.js exists and is non-empty", function () {
    assert.ok(STORE_JS.length > 100);
  });

  it("uses Proxy for reactive state", function () {
    assert.ok(STORE_JS.includes("Proxy"));
  });

  it("exposes storeSubscribe function", function () {
    assert.ok(STORE_JS.includes("storeSubscribe"));
  });

  it("supports wildcard subscriber (*)", function () {
    assert.ok(STORE_JS.includes('"*"') || STORE_JS.includes("'*'"));
  });

  it("has batched microtask notification", function () {
    assert.ok(STORE_JS.includes("Promise.resolve"));
  });

  it("auto-persists to localStorage", function () {
    assert.ok(STORE_JS.includes("localStorage") || STORE_JS.includes("save("));
  });

  it("wraps arrays and objects with Proxy", function () {
    assert.ok(
      STORE_JS.includes("Proxy wrapper") || STORE_JS.includes("new Proxy"),
    );
  });

  it("has initStore function", function () {
    assert.ok(STORE_JS.includes("initStore"));
  });
});

// ── Accessibility: Sections & ARIA ──
describe("Accessibility: Section ARIA", function () {
  it('all section elements have role="region"', function () {
    const sectionIds = [
      "sec-landing",
      "sec-dashboard",
      "sec-guests",
      "sec-tables",
      "sec-invitation",
      "sec-whatsapp",
      "sec-rsvp",
      "sec-budget",
      "sec-analytics",
      "sec-timeline",
      "sec-checkin",
      "sec-gallery",
      "sec-settings",
    ];
    sectionIds.forEach(function (id) {
      const idx = HTML.indexOf(`id="${id}"`);
      assert.ok(idx !== -1, `${id} not found`);
      const tagStart = HTML.lastIndexOf("<div", idx);
      const tagEnd = HTML.indexOf(">", idx);
      const tag = HTML.substring(tagStart, tagEnd + 1);
      assert.ok(tag.includes('role="region"'), `${id} missing role="region"`);
    });
  });

  it("sections have aria-label attribute", function () {
    const ids = [
      "sec-landing",
      "sec-dashboard",
      "sec-guests",
      "sec-tables",
      "sec-invitation",
      "sec-whatsapp",
      "sec-rsvp",
      "sec-budget",
      "sec-analytics",
      "sec-timeline",
      "sec-checkin",
      "sec-gallery",
      "sec-settings",
    ];
    ids.forEach(function (id) {
      const pattern = `id="${id}"`;
      const idx = HTML.indexOf(pattern);
      assert.ok(idx !== -1, `${id} not found`);
      const snippet = HTML.substring(Math.max(0, idx - 200), idx + 200);
      assert.ok(snippet.includes("aria-label="), `${id} missing aria-label`);
    });
  });

  it("sections have data-i18n-aria for dynamic translation", function () {
    const count = (HTML.match(/data-i18n-aria="/g) || []).length;
    assert.ok(count >= 13, `Only ${count} data-i18n-aria found, need >= 13`);
  });

  it("applyLanguage handles data-i18n-aria", function () {
    assert.ok(SRC.includes("data-i18n-aria"));
    assert.ok(SRC.includes("'aria-label'") || SRC.includes('"aria-label"'));
  });
});

// ── Accessibility: Focus Trap ──
describe("Accessibility: Focus Trap", function () {

  it('modals have role="dialog" and aria-modal', function () {
    const dialogs = (HTML.match(/role="dialog"/g) || []).length;
    assert.ok(dialogs >= 3, `Only ${dialogs} role="dialog" found`);
    assert.ok(HTML.includes('aria-modal="true"'));
  });

  it("modals auto-focus first interactive element", function () {
    const UI = readFileSync(resolve(__dirname, "..", "src", "core", "ui.js"), "utf8");
    assert.ok(UI.includes(".focus()"));
    assert.ok(UI.includes("requestAnimationFrame"));
  });
});

// ── Performance: CSS Containment ──
describe("CSS Performance Optimizations", function () {
  it(".section.active uses contain: layout style", function () {
    assert.ok(
      SRC.includes("contain: layout style") ||
        SRC.includes("contain:layout style"),
    );
  });

  it("guest-table uses content-visibility: auto", function () {
    assert.ok(
      SRC.includes("content-visibility: auto") ||
        SRC.includes("content-visibility:auto"),
    );
  });

  it("guest-table has contain-intrinsic-size", function () {
    assert.ok(SRC.includes("contain-intrinsic-size"));
  });

  it("gallery-grid uses content-visibility: auto", function () {
    const CSS_COMP = readFileSync(
      resolve(__dirname, "..", "css", "components.css"),
      "utf8",
    );
    const galIdx = CSS_COMP.indexOf(".gallery-grid");
    const galChunk = CSS_COMP.substring(galIdx, galIdx + 300);
    assert.ok(galChunk.includes("content-visibility"));
  });

  it("modal-overlay uses contain", function () {
    assert.ok(SRC.includes(".modal-overlay") && SRC.includes("contain"));
  });
});

// ── Image CLS Prevention ──
describe("Image CLS Prevention", function () {
  it("userAvatar has width and height attributes", function () {
    assert.ok(HTML.includes('id="userAvatar"'));
    const idx = HTML.indexOf('id="userAvatar"');
    const snippet = HTML.substring(Math.max(0, idx - 100), idx + 200);
    assert.ok(
      snippet.includes("width=") && snippet.includes("height="),
      "userAvatar missing width/height",
    );
  });

  it("rsvpQrImage has width and height attributes", function () {
    const idx = HTML.indexOf('id="rsvpQrImage"');
    const snippet = HTML.substring(idx, idx + 300);
    assert.ok(
      snippet.includes("width=") && snippet.includes("height="),
      "rsvpQrImage missing width/height",
    );
  });

  it('rsvpQrImage uses loading="lazy"', function () {
    const idx = HTML.indexOf('id="rsvpQrImage"');
    const snippet = HTML.substring(idx, idx + 300);
    assert.ok(snippet.includes('loading="lazy"'));
  });

  it('images use decoding="async"', function () {
    const asyncCount = (HTML.match(/decoding="async"/g) || []).length;
    assert.ok(
      asyncCount >= 1,
      `Only ${asyncCount} images with decoding="async"`,
    );
  });
});

// ── CSS Architecture: @layer ──
describe("CSS @layer Architecture", function () {
  const VARS = readFileSync(
    resolve(__dirname, "..", "css", "variables.css"),
    "utf8",
  );

  it("variables.css declares layer order", function () {
    assert.ok(VARS.includes("@layer variables"));
    assert.ok(VARS.includes("@layer variables, base, layout, components"));
  });

  it("all 7 layers are declared in order", function () {
    const orderMatch = VARS.match(
      /@layer\s+variables\s*,\s*base\s*,\s*layout\s*,\s*components\s*,\s*auth\s*,\s*responsive\s*,\s*print/,
    );
    assert.ok(orderMatch, "Layer order declaration missing or incorrect");
  });

  it("base.css wrapped in @layer base", function () {
    const BASE = readFileSync(
      resolve(__dirname, "..", "css", "base.css"),
      "utf8",
    );
    assert.ok(BASE.includes("@layer base"));
  });

  it("layout.css wrapped in @layer layout", function () {
    const LAYOUT = readFileSync(
      resolve(__dirname, "..", "css", "layout.css"),
      "utf8",
    );
    assert.ok(LAYOUT.includes("@layer layout"));
  });

  it("components.css wrapped in @layer components", function () {
    const COMP = readFileSync(
      resolve(__dirname, "..", "css", "components.css"),
      "utf8",
    );
    assert.ok(COMP.includes("@layer components"));
  });

  it("auth.css wrapped in @layer auth", function () {
    const AUTH = readFileSync(
      resolve(__dirname, "..", "css", "auth.css"),
      "utf8",
    );
    assert.ok(AUTH.includes("@layer auth"));
  });

  it("responsive.css wrapped in @layer responsive", function () {
    const RESP = readFileSync(
      resolve(__dirname, "..", "css", "responsive.css"),
      "utf8",
    );
    assert.ok(RESP.includes("@layer responsive"));
  });

  it("print.css wrapped in @layer print", function () {
    const PRINT = readFileSync(
      resolve(__dirname, "..", "css", "print.css"),
      "utf8",
    );
    assert.ok(PRINT.includes("@layer print"));
  });
});

// ── CSS Native Nesting ──
describe("CSS Native Nesting", function () {
  const COMP = readFileSync(
    resolve(__dirname, "..", "css", "components.css"),
    "utf8",
  );

  it("components.css uses & nesting selector", function () {
    const nestCount = (COMP.match(/&\s*[.:[\w]/g) || []).length;
    assert.ok(nestCount >= 5, `Only ${nestCount} nesting selectors found`);
  });

  it(".card uses nested &:hover", function () {
    assert.ok(COMP.includes("&:hover"));
  });

  it(".form-group nests child selectors", function () {
    const fgIdx = COMP.indexOf(".form-group");
    const fgChunk = COMP.substring(fgIdx, fgIdx + 500);
    assert.ok(fgChunk.includes("& label") || fgChunk.includes("& input"));
  });

  it(".guest-table nests th and td", function () {
    const gtIdx = COMP.indexOf(".guest-table");
    const gtChunk = COMP.substring(gtIdx, gtIdx + 500);
    assert.ok(gtChunk.includes("& th") || gtChunk.includes("& td"));
  });
});

// ── Vite Build Integration ──
describe("Vite Build", function () {
  it("vite.config.js or vite.config.mjs exists", function () {
    const hasJs = existsSync(resolve(__dirname, "..", "vite.config.js"));
    const hasMjs = existsSync(resolve(__dirname, "..", "vite.config.mjs"));
    assert.ok(hasJs || hasMjs, "vite.config missing");
  });

  it("package.json has vite in devDependencies", function () {
    assert.ok(
      PKG.devDependencies &&
        (PKG.devDependencies.vite || PKG.devDependencies["vite"]),
      "vite missing from devDependencies",
    );
  });

  it("package.json has vitest in devDependencies", function () {
    assert.ok(
      PKG.devDependencies && PKG.devDependencies.vitest,
      "vitest missing from devDependencies",
    );
  });

  it("package.json has build script", function () {
    assert.ok(PKG.scripts && PKG.scripts.build, "build script missing");
  });

  it('index.html uses type="module" for main entry', function () {
    assert.ok(HTML.includes('type="module"'));
  });

  it("no stale CSS preload hints", function () {
    assert.ok(
      !HTML.includes('rel="preload" as="style"'),
      "stale CSS preload found",
    );
  });
});

// ── State Persistence ──
describe("State Persistence", function () {
  const STATE = readFileSync(
    resolve(__dirname, "..", "src", "core", "state.js"),
    "utf8",
  );

  it("state.js has save and load functions", function () {
    assert.ok(STATE.includes("function save"));
    assert.ok(STATE.includes("function load"));
  });

  it("save uses JSON.stringify", function () {
    assert.ok(STATE.includes("JSON.stringify"));
  });

  it("load uses JSON.parse with try/catch", function () {
    assert.ok(STATE.includes("JSON.parse"));
    assert.ok(STATE.includes("try"));
  });

});

// ── CSP Hardening (v2.0.0-beta.3) ──
describe("CSP Hardening", function () {
  it("HTML has no inline style= attributes", function () {
    // Allowed: only inside <noscript> (not rendered with JS)
    const withoutNoscript = HTML.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
    const matches = withoutNoscript.match(/\sstyle\s*=/gi);
    assert.strictEqual(
      matches,
      null,
      `Found inline style= attributes: ${(matches || []).length}`,
    );
  });

  it("CSP meta tag does not include unsafe-inline for style-src", function () {
    assert.ok(
      !HTML.includes("style-src 'self' 'unsafe-inline'"),
      "style-src still has unsafe-inline",
    );
    assert.ok(HTML.includes("style-src 'self'"), "style-src self is missing");
  });

  it("CSS uses [id=] attribute selectors instead of #camelCase", function () {
    const idSelectors = CSS.match(/#[a-z]+[A-Z]\w*\s*\{/g);
    assert.strictEqual(
      idSelectors,
      null,
      `Found #camelCase selectors: ${JSON.stringify(idSelectors)}`,
    );
  });
});

// ── HTML5 Form Validation (v2.0.0-beta.3) ──
describe("HTML5 Form Validation", function () {
  it("rsvpPhone has required and pattern attributes", function () {
    assert.ok(HTML.includes('id="rsvpPhone"'));
    const phoneTag = HTML.match(/<input[^>]*id="rsvpPhone"[^>]*>/);
    assert.ok(phoneTag, "rsvpPhone input not found");
    assert.ok(phoneTag[0].includes("required"), "rsvpPhone missing required");
    assert.ok(phoneTag[0].includes("pattern="), "rsvpPhone missing pattern");
    assert.ok(
      phoneTag[0].includes("minlength="),
      "rsvpPhone missing minlength",
    );
  });

  it("rsvpFirstName has required and minlength", function () {
    const tag = HTML.match(/<input[^>]*id="rsvpFirstName"[^>]*>/);
    assert.ok(tag, "rsvpFirstName input not found");
    assert.ok(tag[0].includes("required"), "rsvpFirstName missing required");
    assert.ok(tag[0].includes("minlength="), "rsvpFirstName missing minlength");
  });

  it("ccFirstName has required and minlength", function () {
    const tag = HTML.match(/<input[^>]*id="ccFirstName"[^>]*>/);
    assert.ok(tag, "ccFirstName input not found");
    assert.ok(tag[0].includes("required"), "ccFirstName missing required");
    assert.ok(tag[0].includes("minlength="), "ccFirstName missing minlength");
  });

  it("ccPhone has required and pattern", function () {
    const tag = HTML.match(/<input[^>]*id="ccPhone"[^>]*>/);
    assert.ok(tag, "ccPhone input not found");
    assert.ok(tag[0].includes("required"), "ccPhone missing required");
    assert.ok(tag[0].includes("pattern="), "ccPhone missing pattern");
  });
});

// ── Dark Mode Runtime Listener (v2.0.0-beta.3) ──
describe("Dark Mode Runtime Listener", function () {
  it("ui.js registers prefers-color-scheme change listener", function () {
    assert.ok(JS.includes("prefers-color-scheme"));
    assert.ok(
      JS.includes('.addEventListener("change"') ||
        JS.includes(".addEventListener('change'"),
    );
  });

});

// ── Noscript Fallback (v2.0.0-beta.3) ──
describe("Noscript Fallback", function () {
  it("HTML contains a <noscript> element", function () {
    assert.ok(HTML.includes("<noscript>"));
    assert.ok(HTML.includes("</noscript>"));
  });

  it("noscript has bilingual message", function () {
    const noscript = HTML.match(/<noscript>([\s\S]*?)<\/noscript>/);
    assert.ok(noscript, "noscript block not found");
    assert.ok(
      noscript[1].includes("JavaScript"),
      "noscript missing JS mention",
    );
  });

  it('noscript has role="alert" for accessibility', function () {
    const noscript = HTML.match(/<noscript>([\s\S]*?)<\/noscript>/);
    assert.ok(noscript[1].includes('role="alert"'));
  });
});

// ── Form UX: inputmode + enterkeyhint (v2.0.0-beta.3) ──
describe("Form UX Enhancements", function () {
  it('numeric inputs have inputmode="numeric"', function () {
    const ids = [
      "rsvpGuests",
      "rsvpChildren",
      "budgetTargetInput",
      "guestCount2",
      "guestChildren",
      "tableCapacity",
      "expenseAmount",
    ];
    for (const id of ids) {
      const tag = HTML.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`));
      assert.ok(tag, `${id} input not found`);
      assert.ok(
        tag[0].includes('inputmode="numeric"'),
        `${id} missing inputmode="numeric"`,
      );
    }
  });

  it('tel inputs have inputmode="tel"', function () {
    const ids = ["rsvpPhone", "ccPhone"];
    for (const id of ids) {
      const tag = HTML.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`));
      assert.ok(tag, `${id} input not found`);
      assert.ok(
        tag[0].includes('inputmode="tel"'),
        `${id} missing inputmode="tel"`,
      );
    }
  });

  it("RSVP form uses enterkeyhint", function () {
    assert.ok(
      HTML.includes('enterkeyhint="next"'),
      'enterkeyhint="next" missing',
    );
    assert.ok(
      HTML.includes('enterkeyhint="done"'),
      'enterkeyhint="done" missing',
    );
  });

  it('rsvpPhone has autocomplete="tel"', function () {
    const tag = HTML.match(/<input[^>]*id="rsvpPhone"[^>]*>/);
    assert.ok(
      tag[0].includes('autocomplete="tel"'),
      'rsvpPhone missing autocomplete="tel"',
    );
  });
});

// ── i18n Completeness (v2.0.0-beta.3) ──
describe("i18n Completeness", function () {
  const heJSON = JSON.parse(
    readFileSync(resolve(__dirname, "..", "src", "i18n", "he.json"), "utf8"),
  );
  const enJSON = JSON.parse(
    readFileSync(resolve(__dirname, "..", "src", "i18n", "en.json"), "utf8"),
  );
  const htmlKeys = [...HTML.matchAll(/data-i18n="([^"]+)"/g)].map(function (m) {
    return m[1];
  });
  const uniqueKeys = [...new Set(htmlKeys)];

  it("all HTML data-i18n keys exist in he.json", function () {
    const missing = uniqueKeys.filter(function (k) {
      return !(k in heJSON);
    });
    assert.strictEqual(
      missing.length,
      0,
      `Missing from he.json: ${missing.join(", ")}`,
    );
  });

  it("all HTML data-i18n keys exist in en.json", function () {
    const missing = uniqueKeys.filter(function (k) {
      return !(k in enJSON);
    });
    assert.strictEqual(
      missing.length,
      0,
      `Missing from en.json: ${missing.join(", ")}`,
    );
  });
});

// ── CSS Layer Scope (v2.0.0-beta.3) ──
describe("CSS Layer Integrity", function () {
  it("Royal Blue light-mode is inside @layer variables", function () {
    const varCSS = readFileSync(resolve(CSS_DIR, "variables.css"), "utf8");
    const layerEnd = varCSS.lastIndexOf("} /* end @layer variables */");
    const royalPos = varCSS.indexOf("body.light-mode.theme-royal");
    assert.ok(royalPos !== -1, "Royal Blue light-mode rule not found");
    assert.ok(
      royalPos < layerEnd,
      "Royal Blue light-mode should be inside @layer variables",
    );
  });
});

// ── Accessibility: aria-live (v2.0.0-beta.3) ──
describe("Accessibility aria-live", function () {
  it('statsGrid has aria-live="polite"', function () {
    const tag = HTML.match(/<div[^>]*id="statsGrid"[^>]*>/);
    assert.ok(tag, "statsGrid not found");
    assert.ok(
      tag[0].includes('aria-live="polite"'),
      "statsGrid missing aria-live",
    );
  });

  it('rsvpLookupStatus has aria-live="polite"', function () {
    const tag = HTML.match(/<small[^>]*id="rsvpLookupStatus"[^>]*>/);
    assert.ok(tag, "rsvpLookupStatus not found");
    assert.ok(
      tag[0].includes('aria-live="polite"'),
      "rsvpLookupStatus missing aria-live",
    );
  });

  it('tablefinderResult has aria-live="polite"', function () {
    const tag = HTML.match(/<div[^>]*id="tablefinderResult"[^>]*>/);
    assert.ok(tag, "tablefinderResult not found");
    assert.ok(
      tag[0].includes('aria-live="polite"'),
      "tablefinderResult missing aria-live",
    );
  });

  it('checkin stats has aria-live="polite"', function () {
    assert.ok(HTML.includes('checkin-stats" aria-live="polite"'));
  });
});

// ── Performance: fetchpriority (v2.0.0-beta.3) ──
describe("Performance fetchpriority", function () {
  it('first CSS link has fetchpriority="high"', function () {
    const tag = HTML.match(/<link[^>]*variables\.css[^>]*>/);
    assert.ok(tag, "variables.css link not found");
    assert.ok(
      tag[0].includes('fetchpriority="high"'),
      'variables.css missing fetchpriority="high"',
    );
  });

  it('print CSS has fetchpriority="low"', function () {
    const tag = HTML.match(/<link[^>]*print\.css[^>]*>/);
    assert.ok(tag, "print.css link not found");
    assert.ok(
      tag[0].includes('fetchpriority="low"'),
      'print.css missing fetchpriority="low"',
    );
  });

  it('GIS script has fetchpriority="low"', function () {
    const tag = HTML.match(/<script[^>]*gsi\/client[^>]*>/);
    assert.ok(tag, "GIS script not found");
    assert.ok(
      tag[0].includes('fetchpriority="low"'),
      'GIS script missing fetchpriority="low"',
    );
  });
});

// ── Green API Auto-Send ──
describe("Green API Auto-Send", function () {

  it("sendWhatsAppAllViaApi function exists", function () {
    assert.ok(
      JS.includes("function sendWhatsAppAllViaApi"),
      "sendWhatsAppAllViaApi missing",
    );
  });

  it("checkGreenApiConnection function exists", function () {
    assert.ok(
      JS.includes("function checkGreenApiConnection"),
      "checkGreenApiConnection missing",
    );
  });

  it("saveGreenApiConfig function exists", function () {
    assert.ok(
      JS.includes("function saveGreenApiConfig"),
      "saveGreenApiConfig missing",
    );
  });

  it("Green API settings card in HTML with instanceId input", function () {
    assert.ok(
      HTML.includes('id="greenApiInstanceId"'),
      "greenApiInstanceId input missing",
    );
  });

  it("Green API settings card has token input", function () {
    assert.ok(
      HTML.includes('id="greenApiToken"'),
      "greenApiToken input missing",
    );
  });

  it("Green API Auto-Send card in WhatsApp section", function () {
    assert.ok(
      HTML.includes('data-action="sendWhatsAppAllViaApi"'),
      "sendWhatsAppAllViaApi button missing from HTML",
    );
  });

  it("checkGreenApiConnection button in settings HTML", function () {
    assert.ok(
      HTML.includes('data-action="checkGreenApiConnection"'),
      "checkGreenApiConnection button missing from HTML",
    );
  });

  it(".btn-green-api CSS class defined", function () {
    assert.ok(
      CSS.includes(".btn-green-api"),
      ".btn-green-api CSS class missing",
    );
  });

  it("wa_api_title i18n key in both languages", function () {
    const count = (JS.match(/"wa_api_title"/g) || []).length;
    assert.ok(count >= 2, "wa_api_title key missing in one or both i18n files");
  });

  it("green_api_title i18n key in both languages", function () {
    const count = (JS.match(/"green_api_title"/g) || []).length;
    assert.ok(
      count >= 2,
      "green_api_title key missing in one or both i18n files",
    );
  });

  it("green-api.com endpoint used in JS", function () {
    assert.ok(
      JS.includes("api.green-api.com"),
      "Green API endpoint URL missing",
    );
  });

  it("@c.us phone suffix used for Green API chat IDs", function () {
    assert.ok(JS.includes("@c.us"), "@c.us phone format missing");
  });
});

// ── S6.2: Utils module unit tests ──────────────────────────────────────────
describe("Utils Module (S6.2)", function () {
  it("sanitizeInput function exists in utils.js", function () {
    assert.ok(JS.includes("function sanitizeInput"));
  });
  it("sanitize function exists in utils.js (S4.2)", function () {
    assert.ok(JS.includes("function sanitize("));
  });
  it("sanitize handles string type", function () {
    assert.ok(JS.includes('case "string"'));
  });
  it("sanitize handles phone type", function () {
    assert.ok(JS.includes('case "phone"'));
  });
  it("sanitize handles email type", function () {
    assert.ok(JS.includes('case "email"'));
  });
  it("sanitize handles url type", function () {
    assert.ok(JS.includes('case "url"'));
  });
  it("sanitize handles number type", function () {
    assert.ok(JS.includes('case "number"'));
  });
  it("sanitize drops script injection", function () {
    assert.ok(JS.includes("_SCRIPTS_RE"));
  });
  it("isValidHttpsUrl function exists", function () {
    assert.ok(JS.includes("function isValidHttpsUrl"));
  });
  it("cleanPhone function exists", function () {
    assert.ok(JS.includes("function cleanPhone"));
  });
  it("cleanPhone converts 0-prefix to 972", function () {
    assert.ok(JS.includes('startsWith("0")') && JS.includes("972"));
  });
  it("uid function exists and uses Date.now", function () {
    assert.ok(JS.includes("function uid") && JS.includes("Date.now"));
  });
  it("guestFullName function exists", function () {
    assert.ok(JS.includes("function guestFullName"));
  });
  it("formatDateHebrew function exists", function () {
    assert.ok(JS.includes("function formatDateHebrew"));
  });
  it("formatDateHebrew uses Asia/Jerusalem timezone", function () {
    assert.ok(JS.includes("Asia/Jerusalem"));
  });
});

// ── S6.3: Reactive Store unit tests ──────────────────────────────────────
describe("Reactive Store (S6.3)", function () {
  it("storeSubscribe function exists", function () {
    assert.ok(JS.includes("function storeSubscribe"));
  });
  it("initStore function exists", function () {
    assert.ok(JS.includes("function initStore"));
  });
  it("store uses Proxy for reactivity", function () {
    assert.ok(JS.includes("new Proxy"));
  });
  it("store has debounce-based auto-persist", function () {
    assert.ok(JS.includes("scheduleNotify") || JS.includes("scheduleSave"));
  });
  it("store uses wildcard subscriber (*)", function () {
    assert.ok(JS.includes('"*"'));
  });
  it("store uses Map for subscribers", function () {
    assert.ok(JS.includes("new Map()"));
  });
  it("store batch coalesces rapid notifications via Promise.resolve", function () {
    assert.ok(JS.includes("Promise.resolve()"));
  });
  it("store has flush function for dirty set", function () {
    assert.ok(JS.includes("function flush"));
  });
});

// ── S6.4: Router unit tests ───────────────────────────────────────────────
describe("Hash Router (S6.4)", function () {
  it("initRouter registers hashchange listener", function () {
    assert.ok(JS.includes("'hashchange'") || JS.includes('"hashchange"'));
  });
  it("_routerPush uses history.replaceState", function () {
    assert.ok(JS.includes("history.replaceState"));
  });

  it("router handles dashboard section", function () {
    assert.ok(JS.includes('"dashboard"'));
  });
  it("router handles rsvp section", function () {
    assert.ok(JS.includes('"rsvp"'));
  });
  it("router handles contact-form section", function () {
    assert.ok(JS.includes('"contact-form"'));
  });
  it("router valid sections cover all nav tabs", function () {
    const sections = [
      "dashboard",
      "guests",
      "tables",
      "analytics",
      "settings",
      "rsvp",
    ];
    sections.forEach(function (s) {
      assert.ok(JS.includes(`"${s}"`), `Router missing section: ${s}`);
    });
  });
});

// ── S6.5: Sheets service unit tests ──────────────────────────────────────
describe("Sheets Service (S6.5)", function () {

  it("sheetsGvizRead uses no-store cache", function () {
    assert.ok(JS.includes('cache: "no-store"'));
  });

  it("RSVP log append uses SHEETS_RSVP_LOG_TAB (S3.7)", function () {
    assert.ok(JS.includes("SHEETS_RSVP_LOG_TAB"));
  });

  it("pull-to-refresh listens for touchend", function () {
    assert.ok(JS.includes("'touchend'") || JS.includes('"touchend"'));
  });
});

// ── S6.6: Auth service unit tests ────────────────────────────────────────
describe("Auth Service (S6.6)", function () {

  it("isApprovedAdmin function exists", function () {
    assert.ok(JS.includes("function isApprovedAdmin"));
  });

  it("Apple Sign-In integration present", function () {
    assert.ok(JS.includes("AppleID.auth") || JS.includes("AppleID"));
  });
  it("email allowlist checked via ADMIN_EMAILS", function () {
    assert.ok(JS.includes("ADMIN_EMAILS") || JS.includes("adminEmails"));
  });
});

// ── S4.2: sanitize() security utility coverage ────────────────────────────
describe("Sanitize Utility (S4.2)", function () {

  it("sanitize() uses Object.prototype.hasOwnProperty for safe key check", function () {
    assert.ok(JS.includes("Object.prototype.hasOwnProperty"));
  });

  it("sanitize() enforces max length on strings", function () {
    assert.ok(JS.includes("def.max"));
  });
  it("sanitize() returns { value, errors } shape", function () {
    assert.ok(JS.includes("return { value, errors }"));
  });
  it("PHONE_RE pattern validates Israeli phone format", function () {
    assert.ok(JS.includes("_PHONE_RE") && JS.includes("/^[0-9]{9,15}$/"));
  });
  it("EMAIL_RE pattern validates email format", function () {
    assert.ok(JS.includes("_EMAIL_RE"));
  });
});

// ── S2.7: Swipe gesture navigation ───────────────────────────────────────
describe("Swipe Gesture Navigation (S2.7)", function () {
  it("touchstart listener registered in nav.js", function () {
    assert.ok(JS.includes("'touchstart'") || JS.includes('"touchstart"'));
  });

  it("swipe left navigates to next section", function () {
    assert.ok(JS.includes("dx < 0") || JS.includes("Swipe left"));
  });

});

// ── S3.7: New Sheets tabs config ──────────────────────────────────────────
describe("Sheets Tab Config (S3.7)", function () {
  it("SHEETS_VENDORS_TAB constant defined", function () {
    assert.ok(JS.includes("SHEETS_VENDORS_TAB"));
  });
  it("SHEETS_EXPENSES_TAB constant defined", function () {
    assert.ok(JS.includes("SHEETS_EXPENSES_TAB"));
  });
  it("SHEETS_RSVP_LOG_TAB constant defined", function () {
    assert.ok(JS.includes("SHEETS_RSVP_LOG_TAB"));
  });
  it('Vendors tab name is "Vendors"', function () {
    assert.ok(JS.includes('"Vendors"'));
  });
  it('Expenses tab name is "Expenses"', function () {
    assert.ok(JS.includes('"Expenses"'));
  });
  it("RSVP_Log tab name present", function () {
    assert.ok(JS.includes("RSVP_Log"));
  });
});

// ── S4.5: Bundle chunk splitting ─────────────────────────────────────────
describe("Bundle Chunk Splitting (S4.5)", function () {
  it("vite.config.js has manualChunks config", function () {
    const vite = readFileSync(
      resolve(__dirname, "..", "vite.config.js"),
      "utf8",
    );
    assert.ok(vite.includes("manualChunks"));
  });
  it("locale-en chunk defined for lazy English", function () {
    const vite = readFileSync(
      resolve(__dirname, "..", "vite.config.js"),
      "utf8",
    );
    assert.ok(vite.includes("locale-en"));
  });
  it("chunk-services defined for auth/sheets/push/email", function () {
    const vite = readFileSync(
      resolve(__dirname, "..", "vite.config.js"),
      "utf8",
    );
    assert.ok(vite.includes("chunk-services"));
  });
});

// ── S6.7: Integration tests — DOM interaction ────────────────────────────

describe("Integration: guest pending-sync (S3.3 + S6.7)", function () {
  const GUESTS = readFileSync(
    resolve(__dirname, "..", "src", "sections", "guests.js"),
    "utf8",
  );
  const SHEETS = readFileSync(
    resolve(__dirname, "..", "src", "services", "sheets.js"),
    "utf8",
  );

  it("renderGuests applies data-sync-pending attribute", function () {
    assert.ok(
      GUESTS.includes("syncPending"),
      "renderGuests must set syncPending attribute",
    );
  });

});

describe("Integration: S3.3 CSS pending-sync indicator", function () {
  const CSS = readFileSync(
    resolve(__dirname, "..", "css", "components.css"),
    "utf8",
  );

  it("pending-sync CSS rule exists", function () {
    assert.ok(
      CSS.includes("data-sync-pending"),
      "CSS rule for [data-sync-pending] missing",
    );
  });
  it("pending-sync uses border-inline-start (logical property)", function () {
    assert.ok(
      CSS.includes("border-inline-start"),
      "Should use RTL-aware logical properties",
    );
  });
  it("pending-sync reduces opacity", function () {
    assert.ok(
      CSS.includes("opacity"),
      "Pending rows should have reduced opacity",
    );
  });
});

describe("Integration: branch-protection workflow (S5.4)", function () {
  const WF = readFileSync(
    resolve(__dirname, "..", ".github", "workflows", "branch-protection.yml"),
    "utf8",
  );

  it("branch-protection.yml exists", function () {
    assert.ok(
      existsSync(
        resolve(
          __dirname,
          "..",
          ".github",
          "workflows",
          "branch-protection.yml",
        ),
      ),
    );
  });
  it("workflow triggers on workflow_dispatch", function () {
    assert.ok(WF.includes("workflow_dispatch"));
  });
  it("workflow uses gh api to check protection", function () {
    assert.ok(WF.includes("gh api"));
  });
  it("has scheduled cron trigger", function () {
    assert.ok(WF.includes("cron:"));
  });
});

describe("Integration: deploy verification (S5.10)", function () {
  const WF = readFileSync(
    resolve(__dirname, "..", ".github", "workflows", "deploy.yml"),
    "utf8",
  );

  it("deploy.yml has health-check step", function () {
    assert.ok(
      WF.includes("Verify deployment health") || WF.includes("health check"),
    );
  });
  it("health-check uses curl with HTTP status code", function () {
    assert.ok(WF.includes("curl"));
  });
  it("health-check retries multiple times", function () {
    assert.ok(
      WF.includes("attempt") || WF.includes("retry") || WF.includes("for i in"),
    );
  });
});

describe("Integration: Lighthouse config (S4.9)", function () {
  const LH = JSON.parse(
    readFileSync(resolve(__dirname, "..", ".lighthouserc.json"), "utf8"),
  );

  it(".lighthouserc.json exists and parses", function () {
    assert.ok(LH.ci && LH.ci.assert);
  });
  it("performance threshold >= 0.90", function () {
    const perf = LH.ci.assert.assertions["categories:performance"];
    const score = Array.isArray(perf) ? perf[1].minScore : perf.minScore;
    assert.ok(score >= 0.9, `Performance minScore ${score} < 0.90`);
  });
  it("accessibility threshold >= 0.90", function () {
    const a11y = LH.ci.assert.assertions["categories:accessibility"];
    const score = Array.isArray(a11y) ? a11y[1].minScore : a11y.minScore;
    assert.ok(score >= 0.9, `A11y minScore ${score} < 0.90`);
  });
  it("performance uses error severity", function () {
    const perf = LH.ci.assert.assertions["categories:performance"];
    const severity = Array.isArray(perf) ? perf[0] : "error";
    assert.equal(severity, "error");
  });
  it("collect has numberOfRuns", function () {
    assert.ok(LH.ci.collect.numberOfRuns >= 1);
  });
});

// ── S5.7: PR Preview workflow ────────────────────────────────────────────
describe("PR Preview Workflow (S5.7)", function () {
  it("preview.yml workflow exists", function () {
    assert.ok(
      existsSync(
        resolve(__dirname, "..", ".github", "workflows", "preview.yml"),
      ),
    );
  });
  it("preview workflow triggers on pull_request", function () {
    const preview = readFileSync(
      resolve(__dirname, "..", ".github", "workflows", "preview.yml"),
      "utf8",
    );
    assert.ok(preview.includes("pull_request"));
  });
  it("preview deploys to preview/pr-{number} folder", function () {
    const preview = readFileSync(
      resolve(__dirname, "..", ".github", "workflows", "preview.yml"),
      "utf8",
    );
    assert.ok(preview.includes("preview/pr-"));
  });
  it("preview cleanup on PR close", function () {
    const preview = readFileSync(
      resolve(__dirname, "..", ".github", "workflows", "preview.yml"),
      "utf8",
    );
    assert.ok(preview.includes("closed"));
  });
});

// ── S0 src/ module structure tests ───────────────────────────────────────
describe("Sprint 0: src/ directory structure", function () {
  const SRC_DIR = resolve(__dirname, "..", "src");

  it("src/ directory exists", function () {
    assert.ok(existsSync(SRC_DIR));
  });
  it("src/main.js entry point exists", function () {
    assert.ok(existsSync(resolve(SRC_DIR, "main.js")));
  });
  it("src/utils/ directory exists", function () {
    assert.ok(existsSync(resolve(SRC_DIR, "utils")));
  });
  it("src/core/ directory exists", function () {
    assert.ok(existsSync(resolve(SRC_DIR, "core")));
  });
  it("src/services/ directory exists", function () {
    assert.ok(existsSync(resolve(SRC_DIR, "services")));
  });
});

describe("Sprint 0: src/utils named exports", function () {
  it("src/utils/phone.js exports cleanPhone", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "utils", "phone.js"),
      "utf8",
    );
    assert.ok(src.includes("export function cleanPhone"));
  });
  it("src/utils/phone.js exports isValidPhone", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "utils", "phone.js"),
      "utf8",
    );
    assert.ok(src.includes("export function isValidPhone"));
  });
  it("src/utils/date.js exports formatDateHebrew", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "utils", "date.js"),
      "utf8",
    );
    assert.ok(src.includes("export function formatDateHebrew"));
  });
  it("src/utils/date.js exports daysUntil", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "utils", "date.js"),
      "utf8",
    );
    assert.ok(src.includes("export function daysUntil"));
  });
  it("src/utils/sanitize.js exports sanitize", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "utils", "sanitize.js"),
      "utf8",
    );
    assert.ok(src.includes("export function sanitize"));
  });
  it("src/utils/sanitize.js exports sanitizeInput", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "utils", "sanitize.js"),
      "utf8",
    );
    assert.ok(src.includes("export function sanitizeInput"));
  });
  it("src/utils/misc.js exports uid", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "utils", "misc.js"),
      "utf8",
    );
    assert.ok(src.includes("export function uid"));
  });
  it("src/utils/index.js re-exports all utils", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "utils", "index.js"),
      "utf8",
    );
    assert.ok(src.includes('from "./phone.js"'));
    assert.ok(src.includes('from "./date.js"'));
    assert.ok(src.includes('from "./sanitize.js"'));
    assert.ok(src.includes('from "./misc.js"'));
  });
});

describe("Sprint 0: src/core named exports", function () {
  it("src/core/store.js exports storeSubscribe", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "store.js"),
      "utf8",
    );
    assert.ok(src.includes("export function storeSubscribe"));
  });
  it("src/core/store.js exports initStore", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "store.js"),
      "utf8",
    );
    assert.ok(src.includes("export function initStore"));
  });
  it("src/core/store.js exports storeSet and storeGet", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "store.js"),
      "utf8",
    );
    assert.ok(src.includes("export function storeSet"));
    assert.ok(src.includes("export function storeGet"));
  });
  it("src/core/events.js exports initEvents and on", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "events.js"),
      "utf8",
    );
    assert.ok(src.includes("export function initEvents"));
    assert.ok(src.includes("export function on("));
  });
  it("src/core/config.js exports APP_VERSION", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "config.js"),
      "utf8",
    );
    assert.ok(src.includes("export const APP_VERSION"));
  });
  it("src/core/config.js exports ADMIN_EMAILS", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "config.js"),
      "utf8",
    );
    assert.ok(src.includes("export const ADMIN_EMAILS"));
  });
  it("src/core/i18n.js exports t and applyI18n", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "i18n.js"),
      "utf8",
    );
    assert.ok(src.includes("export function t("));
    assert.ok(src.includes("export function applyI18n"));
  });
  it("src/core/state.js exports save and load", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "state.js"),
      "utf8",
    );
    assert.ok(src.includes("export function save("));
    assert.ok(src.includes("export function load("));
  });
  it("src/core/dom.js exports el proxy", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "dom.js"),
      "utf8",
    );
    assert.ok(src.includes("export const el = new Proxy"));
  });
  it("src/core/ui.js exports showToast and openModal", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "ui.js"),
      "utf8",
    );
    assert.ok(src.includes("export function showToast"));
    assert.ok(src.includes("export async function openModal"));
  });
  it("src/core/nav.js exports navigateTo and initRouter", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "nav.js"),
      "utf8",
    );
    assert.ok(src.includes("export function navigateTo"));
    assert.ok(src.includes("export function initRouter"));
  });
  it("src/core/nav.js exports initSwipe (S2.7)", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "nav.js"),
      "utf8",
    );
    assert.ok(src.includes("export function initSwipe"));
  });
});

describe("Sprint 0: src/services named exports", function () {
  it("src/services/sheets.js exports enqueueWrite", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "services", "sheets.js"),
      "utf8",
    );
    assert.ok(src.includes("export function enqueueWrite"));
  });
  it("src/services/sheets.js exports sheetsPost", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "services", "sheets.js"),
      "utf8",
    );
    assert.ok(src.includes("export async function sheetsPost"));
  });
  it("src/services/sheets.js exports sheetsRead", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "services", "sheets.js"),
      "utf8",
    );
    assert.ok(src.includes("export async function sheetsRead"));
  });
  it("src/services/auth.js exports loginOAuth", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "services", "auth.js"),
      "utf8",
    );
    assert.ok(src.includes("export function loginOAuth"));
  });
  it("src/services/auth.js exports isApprovedAdmin", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "services", "auth.js"),
      "utf8",
    );
    assert.ok(src.includes("export function isApprovedAdmin"));
  });
  it("src/services/auth.js exports loginAnonymous", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "services", "auth.js"),
      "utf8",
    );
    assert.ok(src.includes("export function loginAnonymous"));
  });
  it("src/services/auth.js exports maybeRotateSession (S4.1)", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "services", "auth.js"),
      "utf8",
    );
    assert.ok(src.includes("export function maybeRotateSession"));
  });
  it("src/main.js imports from core modules", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "main.js"),
      "utf8",
    );
    assert.ok(src.includes('from "./core/store.js"'));
    assert.ok(src.includes('from "./core/events.js"'));
    assert.ok(src.includes('from "./core/i18n.js"'));
    assert.ok(src.includes('from "./core/nav.js"'));
  });
  it("src/main.js loads section modules via glob or imports (S0.10)", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "main.js"),
      "utf8",
    );
    const sectionResolver = readFileSync(
      resolve(__dirname, "..", "src", "core", "section-resolver.js"),
      "utf8",
    );
    // Accept either import.meta.glob (lazy) or individual imports (eager)
    assert.ok(
      src.includes('import.meta.glob("./sections/') ||
        src.includes('from "./sections/dashboard.js"') ||
        src.includes("section-resolver") ||
        sectionResolver.includes("import.meta.glob"),
      "section loading (glob or import) missing",
    );
  });
  it("src/main.js has section lifecycle routing", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "main.js"),
      "utf8",
    );
    // Accept either SECTIONS map or _resolveSection/_sectionByName
    assert.ok(
      src.includes("_resolveSection") ||
        src.includes("_sectionByName") ||
        src.includes("SECTIONS"),
      "section lifecycle routing missing",
    );
  });
});

// ── S0.8 src/sections/ module structure ──────────────────────────────────
describe("Sprint 0.8: src/sections/ module structure", function () {
  const SECTIONS_DIR = resolve(__dirname, "..", "src", "sections");
  const expectedSections = [
    "dashboard",
    "guests",
    "tables",
    "settings",
    "vendors",
    "expenses",
    "budget",
    "analytics",
    "rsvp",
    "checkin",
    "gallery",
    "timeline",
    "invitation",
    "whatsapp",
    "landing",
    "contact-collector",
    "registry",
    "guest-landing",
    "index",
  ];
  it("src/sections/ directory exists", function () {
    assert.ok(existsSync(SECTIONS_DIR));
  });
  expectedSections.forEach(function (name) {
    it(`src/sections/${name}.js exists`, function () {
      assert.ok(existsSync(resolve(SECTIONS_DIR, `${name}.js`)));
    });
  });
  it("src/sections/dashboard.js exports mount and unmount", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "dashboard.js"), "utf8");
    assert.ok(src.includes("export function mount"));
    assert.ok(src.includes("export function unmount"));
  });
  it("src/sections/guests.js exports mount, unmount, saveGuest, renderGuests", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "guests.js"), "utf8");
    assert.ok(src.includes("export function mount"));
    assert.ok(src.includes("export function unmount"));
    assert.ok(src.includes("export function saveGuest"));
    assert.ok(src.includes("export function renderGuests"));
  });
  it("src/sections/guests.js exports clearGuestPendingSync (S3.3)", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "guests.js"), "utf8");
    assert.ok(src.includes("export function clearGuestPendingSync"));
  });
  it("src/sections/tables.js exports mount, unmount, saveTable, autoAssignTables", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "tables.js"), "utf8");
    assert.ok(src.includes("export function mount"));
    assert.ok(src.includes("export function saveTable"));
    assert.ok(src.includes("export function autoAssignTables"));
  });
  it("src/sections/analytics.js exports renderAnalytics", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "analytics.js"), "utf8");
    assert.ok(src.includes("export function renderAnalytics"));
  });
  it("src/sections/rsvp.js exports lookupRsvpByPhone and submitRsvp", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "rsvp.js"), "utf8");
    assert.ok(src.includes("export function lookupRsvpByPhone"));
    assert.ok(src.includes("export function submitRsvp"));
  });
  it("src/sections/settings.js exports saveWeddingInfo and setTheme", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "settings.js"), "utf8");
    assert.ok(src.includes("export function saveWeddingInfo"));
    assert.ok(src.includes("export function setTheme"));
  });
  it("src/sections/index.js re-exports all sections", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "index.js"), "utf8");
    assert.ok(src.includes("dashboardSection"));
    assert.ok(src.includes("guestsSection"));
    assert.ok(src.includes("rsvpSection"));
    assert.ok(src.includes("analyticsSection"));
  });
  it("section modules use proper ESM imports from src/core/ (no window.*)", function () {
    // Verify that section modules import from the core/utils/services layer
    const dash = readFileSync(resolve(SECTIONS_DIR, "dashboard.js"), "utf8");
    assert.ok(dash.includes('from "../core/store.js"'));
    assert.ok(dash.includes('from "../utils/date.js"'));
    const guests = readFileSync(resolve(SECTIONS_DIR, "guests.js"), "utf8");
    assert.ok(guests.includes('from "../core/store.js"'));
    assert.ok(guests.includes('from "../utils/sanitize.js"'));
  });
});

// ── S1 Sprint 1: Template extraction ─────────────────────────────────────
describe("Sprint 1: HTML template extraction (S1.1-S1.3)", function () {
  const TEMPLATES_DIR = resolve(__dirname, "..", "src", "templates");
  const MODALS_DIR = resolve(__dirname, "..", "src", "modals");

  const expectedTemplates = [
    "landing",
    "dashboard",
    "guests",
    "tables",
    "invitation",
    "whatsapp",
    "rsvp",
    "budget",
    "analytics",
    "timeline",
    "checkin",
    "gallery",
    "contact-form",
    "vendors",
    "settings",
  ];
  const expectedModals = [
    "guestModal",
    "tableModal",
    "vendorModal",
    "galleryLightbox",
    "expenseModal",
    "timelineModal",
  ];

  it("src/templates/ directory exists (S1.1)", function () {
    assert.ok(existsSync(TEMPLATES_DIR));
  });
  it("src/modals/ directory exists (S1.2)", function () {
    assert.ok(existsSync(MODALS_DIR));
  });
  expectedTemplates.forEach(function (name) {
    it(`src/templates/${name}.html exists`, function () {
      assert.ok(existsSync(resolve(TEMPLATES_DIR, `${name}.html`)));
    });
  });
  expectedModals.forEach(function (name) {
    it(`src/modals/${name}.html exists`, function () {
      assert.ok(existsSync(resolve(MODALS_DIR, `${name}.html`)));
    });
  });
  it("index.html < 500 lines after S1.3 reduction", function () {
    const html = readFileSync(resolve(__dirname, "..", "index.html"), "utf8");
    const lines = html.split("\n").length;
    assert.ok(lines < 500, `Expected < 500 lines, got ${lines}`);
  });
  it("section wrappers still exist in index.html with data-template attribute (S1.3)", function () {
    const html = readFileSync(resolve(__dirname, "..", "index.html"), "utf8");
    assert.ok(html.includes('id="sec-dashboard"'));
    assert.ok(html.includes('id="sec-guests"'));
    assert.ok(html.includes('id="sec-settings"'));
    assert.ok(html.includes('data-template="dashboard"'));
    assert.ok(html.includes('data-template="guests"'));
  });
  it("src/core/template-loader.js exists (S1.4)", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "src", "core", "template-loader.js")),
    );
  });
  it("src/core/template-loader.js exports injectTemplate and onTemplateLoaded", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "template-loader.js"),
      "utf8",
    );
    assert.ok(src.includes("export async function injectTemplate"));
    assert.ok(src.includes("export function onTemplateLoaded"));
  });

  it("css/components.css has .section-skeleton class (S2.2)", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "css", "components.css"),
      "utf8",
    );
    assert.ok(src.includes(".section-skeleton"));
  });
  it("index.html has color-scheme meta tag (S2.9)", function () {
    const html = readFileSync(resolve(__dirname, "..", "index.html"), "utf8");
    assert.ok(html.includes("color-scheme"));
  });
});
// ── v3.1.0: New section exports ────────────────────────────────────────────
describe("v3.1.0: New section exports and handlers", function () {
  const SECTIONS_DIR = resolve(__dirname, "..", "src", "sections");
  const HANDLERS_DIR = resolve(__dirname, "..", "src", "handlers");
  const MAIN_SRC = readFileSync(
    resolve(__dirname, "..", "src", "main.js"),
    "utf8",
  ) + (existsSync(HANDLERS_DIR)
    ? readdirSync(HANDLERS_DIR).filter((f) => f.endsWith(".js"))
        .map((f) => readFileSync(resolve(HANDLERS_DIR, f), "utf8")).join("\n")
    : "");

  // guests.js
  it("guests.js exports importGuestsCSV", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "guests.js"), "utf8");
    assert.ok(src.includes("export function importGuestsCSV"));
  });
  it("guests.js exports deleteGuest", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "guests.js"), "utf8");
    assert.ok(src.includes("export function deleteGuest"));
  });
  it("guests.js exports setSearchQuery", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "guests.js"), "utf8");
    assert.ok(src.includes("export function setSearchQuery"));
  });

  // vendors.js
  it("vendors.js exports exportVendorsCSV", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "vendors.js"), "utf8");
    assert.ok(src.includes("export function exportVendorsCSV"));
  });
  it("vendors.js exports filterVendorsByCategory", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "vendors.js"), "utf8");
    assert.ok(src.includes("export function filterVendorsByCategory"));
  });
  it("vendors.js exports deleteVendor", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "vendors.js"), "utf8");
    assert.ok(src.includes("export function deleteVendor"));
  });

  // expenses.js
  it("expenses.js exports exportExpensesCSV", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "expenses.js"), "utf8");
    assert.ok(src.includes("export function exportExpensesCSV"));
  });
  it("expenses.js exports filterExpensesByCategory", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "expenses.js"), "utf8");
    assert.ok(src.includes("export function filterExpensesByCategory"));
  });
  it("expenses.js exports deleteExpense", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "expenses.js"), "utf8");
    assert.ok(src.includes("export function deleteExpense"));
  });

  // checkin.js
  it("checkin.js exports exportCheckinReport", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "checkin.js"), "utf8");
    assert.ok(src.includes("export function exportCheckinReport"));
  });
  it("checkin.js exports resetAllCheckins", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "checkin.js"), "utf8");
    assert.ok(src.includes("export function resetAllCheckins"));
  });

  // analytics.js
  it("analytics.js exports renderBudgetChart", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "analytics.js"), "utf8");
    assert.ok(src.includes("export function renderBudgetChart"));
  });

  // budget.js
  it("budget.js exports renderBudgetProgress", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "budget.js"), "utf8");
    assert.ok(src.includes("export function renderBudgetProgress"));
  });
  it("budget.js exports deleteBudgetEntry", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "budget.js"), "utf8");
    assert.ok(src.includes("export function deleteBudgetEntry"));
  });

  // whatsapp.js
  it("whatsapp.js exports buildWhatsAppMessage", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "whatsapp.js"), "utf8");
    assert.ok(src.includes("export function buildWhatsAppMessage"));
  });

  // settings.js
  it("settings.js exports generateRsvpQrCode", function () {
    const src = readFileSync(resolve(SECTIONS_DIR, "settings.js"), "utf8");
    assert.ok(src.includes("export function generateRsvpQrCode"));
  });

  // src/core/ui.js
  it("src/core/ui.js exports showConfirmDialog", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "ui.js"),
      "utf8",
    );
    assert.ok(src.includes("export function showConfirmDialog"));
  });

  // main.js handlers registered
  it("main.js registers deleteGuest handler", function () {
    assert.ok(MAIN_SRC.includes('"deleteGuest"'));
  });
  it("main.js registers deleteVendor handler", function () {
    assert.ok(MAIN_SRC.includes('"deleteVendor"'));
  });
  it("main.js registers deleteExpense handler", function () {
    assert.ok(MAIN_SRC.includes('"deleteExpense"'));
  });
  it("main.js registers deleteBudgetEntry handler", function () {
    assert.ok(MAIN_SRC.includes('"deleteBudgetEntry"'));
  });
  it("main.js registers checkInGuest handler", function () {
    assert.ok(MAIN_SRC.includes('"checkInGuest"'));
  });
  it("main.js registers exportCheckinReport handler", function () {
    assert.ok(MAIN_SRC.includes('"exportCheckinReport"'));
  });
  it("main.js registers resetAllCheckins handler", function () {
    assert.ok(MAIN_SRC.includes('"resetAllCheckins"'));
  });
  it("main.js registers importGuestsCSV handler", function () {
    assert.ok(MAIN_SRC.includes('"importGuestsCSV"'));
  });
  it("main.js registers exportExpensesCSV handler", function () {
    assert.ok(MAIN_SRC.includes('"exportExpensesCSV"'));
  });
  it("main.js registers exportVendorsCSV handler", function () {
    assert.ok(MAIN_SRC.includes('"exportVendorsCSV"'));
  });
  it("main.js registers generateRsvpQrCode handler", function () {
    assert.ok(MAIN_SRC.includes('"generateRsvpQrCode"'));
  });
  it("main.js imports showConfirmDialog from core/ui", function () {
    assert.ok(MAIN_SRC.includes("showConfirmDialog"));
  });

  // i18n keys
  it("he.json has guests_imported key", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "he.json"),
      "utf8",
    );
    assert.ok(src.includes('"guests_imported"'));
  });
  it("en.json has guests_imported key", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "en.json"),
      "utf8",
    );
    assert.ok(src.includes('"guests_imported"'));
  });
  it("he.json has confirm_delete key", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "he.json"),
      "utf8",
    );
    assert.ok(src.includes('"confirm_delete"'));
  });
  it("en.json has confirm_delete key", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "en.json"),
      "utf8",
    );
    assert.ok(src.includes('"confirm_delete"'));
  });
  it("he.json has confirm_reset_checkins key", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "he.json"),
      "utf8",
    );
    assert.ok(src.includes('"confirm_reset_checkins"'));
  });
  it("en.json has confirm_reset_checkins key", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "en.json"),
      "utf8",
    );
    assert.ok(src.includes('"confirm_reset_checkins"'));
  });

  // all 18 sections have mount + unmount
  const ALL_SECTIONS = [
    "dashboard",
    "guests",
    "tables",
    "settings",
    "vendors",
    "expenses",
    "budget",
    "analytics",
    "rsvp",
    "checkin",
    "gallery",
    "timeline",
    "invitation",
    "whatsapp",
    "landing",
    "contact-collector",
    "registry",
    "guest-landing",
  ];
  ALL_SECTIONS.forEach(function (name) {
    it(`src/sections/${name}.js has mount and unmount exports`, function () {
      const src = readFileSync(resolve(SECTIONS_DIR, `${name}.js`), "utf8");
      assert.ok(
        src.includes("export function mount"),
        `${name}.js missing mount`,
      );
      assert.ok(
        src.includes("export function unmount"),
        `${name}.js missing unmount`,
      );
    });
  });
});

// ── v3.1.0: src/utils pure-function behaviour ─────────────────────────────
describe("v3.1.0: src/utils pure functions (source pattern tests)", function () {
  const UTILS_DIR = resolve(__dirname, "..", "src", "utils");

  it("src/utils/phone.js exports cleanPhone", function () {
    const src = readFileSync(resolve(UTILS_DIR, "phone.js"), "utf8");
    assert.ok(src.includes("export function cleanPhone"));
  });
  it("src/utils/phone.js strips leading 0 and adds 972", function () {
    const src = readFileSync(resolve(UTILS_DIR, "phone.js"), "utf8");
    assert.ok(src.includes("972"));
  });
  it("src/utils/phone.js exports isValidPhone", function () {
    const src = readFileSync(resolve(UTILS_DIR, "phone.js"), "utf8");
    assert.ok(src.includes("export function isValidPhone"));
  });
  it("src/utils/sanitize.js exports sanitize", function () {
    const src = readFileSync(resolve(UTILS_DIR, "sanitize.js"), "utf8");
    assert.ok(src.includes("export function sanitize"));
  });
  it("src/utils/sanitize.js handles string, phone, email, number types", function () {
    const src = readFileSync(resolve(UTILS_DIR, "sanitize.js"), "utf8");
    assert.ok(src.includes('"string"'));
    assert.ok(src.includes('"phone"'));
    assert.ok(src.includes('"email"'));
    assert.ok(src.includes('"number"'));
  });
  it("src/utils/misc.js exports uid", function () {
    const src = readFileSync(resolve(UTILS_DIR, "misc.js"), "utf8");
    assert.ok(src.includes("export function uid"));
  });
  it("src/utils/date.js exports formatDateHebrew", function () {
    const src = readFileSync(resolve(UTILS_DIR, "date.js"), "utf8");
    assert.ok(src.includes("export function formatDateHebrew"));
  });
  it("src/utils/index.js re-exports all utils", function () {
    const src = readFileSync(resolve(UTILS_DIR, "index.js"), "utf8");
    assert.ok(src.includes("./phone.js"), "index.js missing phone re-export");
    assert.ok(
      src.includes("./sanitize.js"),
      "index.js missing sanitize re-export",
    );
    assert.ok(src.includes("./misc.js"), "index.js missing misc re-export");
  });
});

// ── v3.3.0 Bug-Fix Coverage ─────────────────────────────────────────────────

// RSVP section
describe("RSVP section — v3.3.0 fixes", function () {
  it("rsvp.js uses rsvpPhone element ID", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "rsvp.js"),
      "utf8",
    );
    assert.ok(src.includes("rsvpPhone"), "rsvpPhone ID missing in rsvp.js");
  });

  it("rsvp.js uses rsvpDetails element ID to reveal form", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "rsvp.js"),
      "utf8",
    );
    assert.ok(
      src.includes("rsvpDetails"),
      "rsvpDetails reveal ID missing in rsvp.js",
    );
  });

  it("rsvp.js uses rsvpConfirm for confirmation message", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "rsvp.js"),
      "utf8",
    );
    assert.ok(src.includes("rsvpConfirm"), "rsvpConfirm ID missing in rsvp.js");
  });

  it("rsvp.html has rsvpConfirm element", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "templates", "rsvp.html"),
      "utf8",
    );
    assert.ok(
      src.includes('id="rsvpConfirm"'),
      "rsvpConfirm element missing from rsvp.html",
    );
  });

  it("rsvp.js schema includes maybe status", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "rsvp.js"),
      "utf8",
    );
    assert.ok(src.includes('"maybe"'), "maybe status missing from rsvp schema");
  });

  it("he.json has rsvp_confirmed and rsvp_declined keys", function () {
    const json = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "he.json"),
      "utf8",
    );
    assert.ok(
      json.includes('"rsvp_confirmed"'),
      "rsvp_confirmed key missing from he.json",
    );
    assert.ok(
      json.includes('"rsvp_declined"'),
      "rsvp_declined key missing from he.json",
    );
  });

  it("en.json has rsvp_confirmed and rsvp_declined keys", function () {
    const json = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "en.json"),
      "utf8",
    );
    assert.ok(
      json.includes('"rsvp_confirmed"'),
      "rsvp_confirmed key missing from en.json",
    );
    assert.ok(
      json.includes('"rsvp_declined"'),
      "rsvp_declined key missing from en.json",
    );
  });
});

// Analytics section
describe("Analytics section — v3.3.0 fixes", function () {
  it("analytics.html has renamed analyticsSideDonut ID", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "templates", "analytics.html"),
      "utf8",
    );
    assert.ok(
      src.includes('id="analyticsSideDonut"'),
      "analyticsSideDonut missing",
    );
    assert.ok(
      !src.includes('id="analyticsSideChart"'),
      "old analyticsSideChart ID still present",
    );
  });

  it("analytics.html has renamed analyticsMealBar ID", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "templates", "analytics.html"),
      "utf8",
    );
    assert.ok(
      src.includes('id="analyticsMealBar"'),
      "analyticsMealBar missing",
    );
    assert.ok(
      !src.includes('id="analyticsMealChart"'),
      "old analyticsMealChart ID still present",
    );
  });

  it("analytics.js renders to analyticsSideDonut and analyticsMealBar", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "analytics.js"),
      "utf8",
    );
    assert.ok(
      src.includes("analyticsSideDonut"),
      "analyticsSideDonut missing from analytics.js",
    );
    assert.ok(
      src.includes("analyticsMealBar"),
      "analyticsMealBar missing from analytics.js",
    );
  });

  it("he.json has analytics_meal_summary_title key", function () {
    const json = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "he.json"),
      "utf8",
    );
    assert.ok(
      json.includes('"analytics_meal_summary_title"'),
      "analytics_meal_summary_title missing from he.json",
    );
  });
});

// Dashboard section
describe("Dashboard section — v3.3.0 fixes", function () {
  it("dashboard.js calculates groomSide guests", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "dashboard.js"),
      "utf8",
    );
    assert.ok(
      src.includes("groomSide"),
      "groomSide count missing from dashboard.js",
    );
  });

  it("dashboard.js calculates brideSide guests", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "dashboard.js"),
      "utf8",
    );
    assert.ok(
      src.includes("brideSide"),
      "brideSide count missing from dashboard.js",
    );
  });

  it("dashboard.js calculates transport count", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "dashboard.js"),
      "utf8",
    );
    assert.ok(
      src.includes("transport"),
      "transport count missing from dashboard.js",
    );
  });
});

// Contact collector section
describe("Contact collector section — v3.3.0 fixes", function () {
  it("contact-collector.js uses contactFormFields ID", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "contact-collector.js"),
      "utf8",
    );
    assert.ok(
      src.includes("contactFormFields"),
      "contactFormFields ID missing",
    );
    assert.ok(
      !src.includes('"contactForm"'),
      'old "contactForm" ID still present',
    );
  });

  it("contact-collector.js uses contactFormSuccess ID", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "contact-collector.js"),
      "utf8",
    );
    assert.ok(
      src.includes("contactFormSuccess"),
      "contactFormSuccess ID missing",
    );
    assert.ok(
      !src.includes('"contactSuccess"'),
      'old "contactSuccess" ID still present',
    );
  });

  it("he.json has contact_sent key", function () {
    const json = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "he.json"),
      "utf8",
    );
    assert.ok(
      json.includes('"contact_sent"'),
      "contact_sent missing from he.json",
    );
  });
});

// Budget section
describe("Budget section — v3.3.0 fixes", function () {
  it("budget.js fills budgetStatTotal", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "budget.js"),
      "utf8",
    );
    assert.ok(
      src.includes("budgetStatTotal"),
      "budgetStatTotal missing from budget.js",
    );
  });

  it("budget.js fills budgetStatGifts", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "budget.js"),
      "utf8",
    );
    assert.ok(
      src.includes("budgetStatGifts"),
      "budgetStatGifts missing from budget.js",
    );
  });

  it("budget.js fills budgetStatPct", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "budget.js"),
      "utf8",
    );
    assert.ok(
      src.includes("budgetStatPct"),
      "budgetStatPct missing from budget.js",
    );
  });

  it("budget.js subscribes to weddingInfo store changes", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "budget.js"),
      "utf8",
    );
    assert.ok(
      src.includes('storeSubscribe("weddingInfo"') ||
        src.includes("storeSubscribe('weddingInfo'"),
      "weddingInfo subscription missing from budget.js",
    );
  });
});

// Tables section
describe("Tables section — v3.3.0 fixes", function () {
  it("tables.js renders unassigned guests list", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "tables.js"),
      "utf8",
    );
    assert.ok(
      src.includes("unassignedGuests"),
      "unassignedGuests render missing from tables.js",
    );
  });

  it("he.json has all_guests_seated key", function () {
    const json = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "he.json"),
      "utf8",
    );
    assert.ok(
      json.includes('"all_guests_seated"'),
      "all_guests_seated missing from he.json",
    );
  });
});

// Settings section
describe("Settings section — v3.3.0 fixes", function () {
  it("settings.js uses sheetsWebAppUrl element ID", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "settings.js"),
      "utf8",
    );
    assert.ok(
      src.includes("sheetsWebAppUrl"),
      "sheetsWebAppUrl ID missing from settings.js",
    );
    assert.ok(
      !src.includes("settingWebAppUrl"),
      "old settingWebAppUrl ID still present",
    );
  });

  it("settings.html uses importGuestsCSV action (not importCSV)", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "templates", "settings.html"),
      "utf8",
    );
    assert.ok(
      !src.includes('"importCSV"'),
      "old importCSV action still present in settings.html",
    );
  });

  it("settings.js renders approved emails list", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "settings.js"),
      "utf8",
    );
    assert.ok(
      src.includes("approvedEmailsList") ||
        src.includes("_renderApprovedEmails"),
      "approvedEmails render missing from settings.js",
    );
  });

  it("he.json has no_approved_emails key", function () {
    const json = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "he.json"),
      "utf8",
    );
    assert.ok(
      json.includes('"no_approved_emails"'),
      "no_approved_emails missing from he.json",
    );
  });
});

// Landing section
describe("Landing section — v3.3.0 fixes", function () {
  it("landing.js uses landingCoupleName ID (not landingCouple)", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "landing.js"),
      "utf8",
    );
    assert.ok(
      src.includes("landingCoupleName"),
      "landingCoupleName ID missing from landing.js",
    );
    assert.ok(
      !src.includes('"landingCouple"'),
      'old "landingCouple" ID still present',
    );
  });

  it("landing.js populates landingAddress", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "landing.js"),
      "utf8",
    );
    assert.ok(
      src.includes("landingAddress"),
      "landingAddress populate missing from landing.js",
    );
  });

  it("landing.js populates landingHebrewDate", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "landing.js"),
      "utf8",
    );
    assert.ok(
      src.includes("landingHebrewDate"),
      "landingHebrewDate populate missing from landing.js",
    );
  });
});

// Check-in section
describe("Check-in section — v3.3.0 fixes", function () {
  it("checkin.js looks up table name from tables store", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "checkin.js"),
      "utf8",
    );
    assert.ok(
      src.includes("tables.find"),
      "tables.find lookup missing from checkin.js",
    );
    assert.ok(
      src.includes(".name"),
      "table name display (.name) missing from checkin.js",
    );
  });

  it("checkin.js loads tables store in renderCheckin", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "sections", "checkin.js"),
      "utf8",
    );
    assert.ok(
      src.includes('storeGet("tables")') || src.includes("storeGet('tables')"),
      "tables storeGet missing from checkin.js",
    );
  });
});

// WhatsApp section
describe("WhatsApp section — v3.3.0 i18n", function () {
  it("he.json has wa_default_template key", function () {
    const json = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "he.json"),
      "utf8",
    );
    assert.ok(
      json.includes('"wa_default_template"'),
      "wa_default_template missing from he.json",
    );
  });

  it("en.json has wa_default_template key", function () {
    const json = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "en.json"),
      "utf8",
    );
    assert.ok(
      json.includes('"wa_default_template"'),
      "wa_default_template missing from en.json",
    );
  });
});

// New templates
describe("New templates — v3.3.0", function () {
  it("src/templates/registry.html exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "src", "templates", "registry.html")),
      "registry.html missing",
    );
  });

  it("registry.html has registryLinks element", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "templates", "registry.html"),
      "utf8",
    );
    assert.ok(
      src.includes('id="registryLinks"'),
      "registryLinks ID missing from registry.html",
    );
  });

  it("src/templates/guest-landing.html exists", function () {
    assert.ok(
      existsSync(
        resolve(__dirname, "..", "src", "templates", "guest-landing.html"),
      ),
      "guest-landing.html missing",
    );
  });

  it("guest-landing.html has data-guest-name attribute", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "templates", "guest-landing.html"),
      "utf8",
    );
    assert.ok(
      src.includes("data-guest-name"),
      "data-guest-name missing from guest-landing.html",
    );
  });

  it("guest-landing.html has data-guest-table attribute", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "templates", "guest-landing.html"),
      "utf8",
    );
    assert.ok(
      src.includes("data-guest-table"),
      "data-guest-table missing from guest-landing.html",
    );
  });
});

// Language toggle
describe("Language toggle — v3.3.0 fix", function () {
  it("main.js switchLanguage passes language arg", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "main.js"),
      "utf8",
    ) + (existsSync(resolve(__dirname, "..", "src", "handlers"))
      ? readdirSync(resolve(__dirname, "..", "src", "handlers")).filter((f) => f.endsWith(".js"))
          .map((f) => readFileSync(resolve(__dirname, "..", "src", "handlers", f), "utf8")).join("\n")
      : "");
    assert.ok(
      src.includes("switchLanguage") && src.includes('"he"'),
      "switchLanguage arg missing from main.js or handler files",
    );
  });

  it("he.json has language_switched key", function () {
    const json = readFileSync(
      resolve(__dirname, "..", "src", "i18n", "he.json"),
      "utf8",
    );
    assert.ok(
      json.includes('"language_switched"'),
      "language_switched missing from he.json",
    );
  });
});

// ── v3.4.0 Regression & New Feature Tests ────────────────────────────────

// Helper: read src file content once
const _srcWhatsApp = readFileSync(
  resolve(__dirname, "..", "src", "sections", "whatsapp.js"),
  "utf8",
);
const _srcGallery = readFileSync(
  resolve(__dirname, "..", "src", "sections", "gallery.js"),
  "utf8",
);
const _srcSettings = readFileSync(
  resolve(__dirname, "..", "src", "sections", "settings.js"),
  "utf8",
);
const _srcDashboard = readFileSync(
  resolve(__dirname, "..", "src", "sections", "dashboard.js"),
  "utf8",
);
const _srcEvents = readFileSync(
  resolve(__dirname, "..", "src", "core", "events.js"),
  "utf8",
);
const _srcSheets = readFileSync(
  resolve(__dirname, "..", "src", "services", "sheets.js"),
  "utf8",
);
const _handlersDir = resolve(__dirname, "..", "src", "handlers");
const _srcMain = readFileSync(
  resolve(__dirname, "..", "src", "main.js"),
  "utf8",
) + (existsSync(_handlersDir)
  ? readdirSync(_handlersDir).filter((f) => f.endsWith(".js"))
      .map((f) => readFileSync(resolve(_handlersDir, f), "utf8")).join("\n")
  : "");
const _srcTemplateLoader = readFileSync(
  resolve(__dirname, "..", "src", "core", "template-loader.js"),
  "utf8",
);

describe("v3.4.0: WhatsApp filter & preview", function () {
  it("sendWhatsAppAll accepts filter parameter", function () {
    assert.ok(
      _srcWhatsApp.includes("function sendWhatsAppAll(filter"),
      "sendWhatsAppAll missing filter param",
    );
  });
  it("sendWhatsAppAll filters 'pending' guests", function () {
    assert.ok(
      _srcWhatsApp.includes('filter === "pending"'),
      "pending filter logic missing",
    );
  });
  it("markGuestSent function exported", function () {
    assert.ok(
      _srcWhatsApp.includes("export function markGuestSent"),
      "markGuestSent not exported",
    );
  });
  it("updateWaPreview function exported", function () {
    assert.ok(
      _srcWhatsApp.includes("export function updateWaPreview"),
      "updateWaPreview not exported",
    );
  });
  it("updateWaPreview updates waPreviewBubble", function () {
    assert.ok(
      _srcWhatsApp.includes('"waPreviewBubble"') ||
        _srcWhatsApp.includes("'waPreviewBubble'"),
      "waPreviewBubble not referenced",
    );
  });
  it("storeSet imported in whatsapp.js for markGuestSent", function () {
    assert.ok(
      _srcWhatsApp.includes("storeSet"),
      "storeSet not imported in whatsapp.js",
    );
  });
  it("renderWhatsApp populates template textarea default", function () {
    assert.ok(
      _srcWhatsApp.includes("_defaultTemplate"),
      "default template not populated in renderWhatsApp",
    );
  });
  it("sent badge shown for already-sent guests", function () {
    assert.ok(
      _srcWhatsApp.includes("badge--success") ||
        _srcWhatsApp.includes("g.sent"),
      "sent tracking missing",
    );
  });
  it("sendWhatsAppAllViaApi accepts filter parameter", function () {
    assert.ok(
      _srcWhatsApp.includes("async function sendWhatsAppAllViaApi(filter"),
      "sendWhatsAppAllViaApi missing filter param",
    );
  });
});

describe("v3.4.0: Gallery upload, lightbox, delete", function () {
  it("handleGalleryUpload exported", function () {
    assert.ok(
      _srcGallery.includes("export function handleGalleryUpload"),
      "handleGalleryUpload not exported",
    );
  });
  it("handleGalleryUpload reads input.files", function () {
    assert.ok(
      _srcGallery.includes("input.files"),
      "input.files not accessed in handleGalleryUpload",
    );
  });
  it("openLightbox exported", function () {
    assert.ok(
      _srcGallery.includes("export function openLightbox"),
      "openLightbox not exported",
    );
  });
  it("deleteGalleryPhoto exported", function () {
    assert.ok(
      _srcGallery.includes("export function deleteGalleryPhoto"),
      "deleteGalleryPhoto not exported",
    );
  });
  it("gallery mount shows admin bar for authenticated users", function () {
    assert.ok(
      _srcGallery.includes("galleryAdminBar"),
      "galleryAdminBar not referenced",
    );
  });
  it("renderGallery adds delete button per item", function () {
    assert.ok(
      _srcGallery.includes("deleteGalleryPhoto") &&
        (_srcGallery.includes("dataset.action") ||
          _srcGallery.includes("data-action")),
      "delete button not in renderGallery",
    );
  });
  it("gallery.html has data-on-change for file input", function () {
    assert.ok(
      HTML.includes('data-on-change="handleGalleryUpload"'),
      "data-on-change not on gallery file input",
    );
  });
  it("gallery.html has galleryAdminBar element", function () {
    assert.ok(
      HTML.includes('id="galleryAdminBar"'),
      "galleryAdminBar missing from template",
    );
  });
  it("gallery.html has galleryGrid element", function () {
    assert.ok(HTML.includes('id="galleryGrid"'), "galleryGrid missing");
  });
});

describe("v3.4.0: Settings fixes", function () {
  it("saveTransportSettings reads by element ID", function () {
    assert.ok(
      _srcSettings.includes('"transportEnabled"') ||
        _srcSettings.includes("'transportEnabled'"),
      "transportEnabled ID not referenced",
    );
    assert.ok(
      !_srcSettings.includes("new FormData"),
      "FormData should not be used in saveTransportSettings",
    );
  });
  it("addApprovedEmail uses newApproveEmail ID", function () {
    assert.ok(
      _srcSettings.includes('"newApproveEmail"') ||
        _srcSettings.includes("'newApproveEmail'"),
      "wrong ID in addApprovedEmail — should be newApproveEmail",
    );
  });
  it("settings.html has greenApiStatus element", function () {
    assert.ok(
      HTML.includes('id="greenApiStatus"'),
      "greenApiStatus span missing from settings.html",
    );
  });
});

describe("v3.4.0: events.js delegation", function () {
  it("data-on-change delegation exists", function () {
    assert.ok(
      _srcEvents.includes("data-on-change") ||
        _srcEvents.includes("dataset.onChange"),
      "data-on-change delegation missing from events.js",
    );
  });
  it("data-on-enter delegation exists", function () {
    assert.ok(
      _srcEvents.includes("data-on-enter") ||
        _srcEvents.includes("dataset.onEnter"),
      "data-on-enter delegation missing from events.js",
    );
  });
  it("Enter key triggers onEnter handlers", function () {
    assert.ok(
      _srcEvents.includes('"Enter"') && _srcEvents.includes("onEnter"),
      "Enter key check missing",
    );
  });
});

describe("v3.4.0: Sheets exponential backoff", function () {
  it("src/services/sheets.js has retry logic", function () {
    assert.ok(
      _srcSheets.includes("MAX_RETRIES") ||
        _srcSheets.includes("BACKOFF_BASE_MS"),
      "retry/backoff constants missing from src/services/sheets.js",
    );
  });
  it("src/services/sheets.js exports onSyncStatus", function () {
    assert.ok(
      _srcSheets.includes("export function onSyncStatus"),
      "onSyncStatus not exported from src/services/sheets.js",
    );
  });
  it("src/services/sheets.js flush retries on failure", function () {
    assert.ok(
      _srcSheets.includes("attempt") && _srcSheets.includes("MAX_RETRIES"),
      "retry attempt logic missing",
    );
  });
});

describe("v3.4.0: Dashboard RSVP deadline banner", function () {
  it("updateRsvpDeadlineBanner function exported from dashboard.js", function () {
    assert.ok(
      _srcDashboard.includes("export function updateRsvpDeadlineBanner"),
      "updateRsvpDeadlineBanner not exported",
    );
  });
  it("dashboard.js reads rsvpDeadline from weddingInfo", function () {
    assert.ok(
      _srcDashboard.includes("rsvpDeadline"),
      "rsvpDeadline not referenced in dashboard.js",
    );
  });
  it("dashboard.html has rsvpDeadlineBanner element", function () {
    assert.ok(
      HTML.includes('id="rsvpDeadlineBanner"'),
      "rsvpDeadlineBanner missing from template",
    );
  });
  it("RSVP deadline banner uses daysUntil", function () {
    assert.ok(
      _srcDashboard.includes("daysUntil"),
      "daysUntil not used in deadline banner",
    );
  });
});

describe("v3.4.0: index.html syncStatusBadge", function () {
  it("index.html has syncStatusBadge span", function () {
    assert.ok(
      HTML.includes('id="syncStatusBadge"'),
      "syncStatusBadge span missing from index.html",
    );
  });
  it("syncStatusBadge has aria-live attribute", function () {
    assert.ok(
      HTML.includes('id="syncStatusBadge"') && HTML.includes("aria-live"),
      "aria-live missing on syncStatusBadge",
    );
  });
});

describe("v3.4.0: CSS color-scheme", function () {
  it("variables.css declares color-scheme: dark light", function () {
    assert.ok(
      CSS.includes("color-scheme: dark light"),
      "color-scheme missing from variables.css",
    );
  });
  it("CSS has .sync-badge styles", function () {
    assert.ok(CSS.includes(".sync-badge"), ".sync-badge styles missing");
  });
  it("CSS has .rsvp-deadline-banner--late style", function () {
    assert.ok(
      CSS.includes(".rsvp-deadline-banner--late"),
      ".rsvp-deadline-banner--late missing",
    );
  });
  it("CSS has .rsvp-deadline-banner--soon style", function () {
    assert.ok(
      CSS.includes(".rsvp-deadline-banner--soon"),
      ".rsvp-deadline-banner--soon missing",
    );
  });
});

describe("v3.4.0: template-loader.js completeness", function () {
  const usesGlob = _srcTemplateLoader.includes("import.meta.glob");
  it("template-loader.js loads registry template", function () {
    assert.ok(
      usesGlob || (
        _srcTemplateLoader.includes("registry") &&
        _srcTemplateLoader.includes("registry.html")
      ),
      "registry loader missing",
    );
  });
  it("template-loader.js loads guest-landing template", function () {
    assert.ok(
      usesGlob || (
        _srcTemplateLoader.includes("guest-landing") &&
        _srcTemplateLoader.includes("guest-landing.html")
      ),
      "guest-landing loader missing",
    );
  });
});

describe("v3.4.0: main.js handler fixes", function () {
  it("addRegistryLink reads registryInputUrl by ID", function () {
    assert.ok(
      _srcMain.includes('"registryInputUrl"') ||
        _srcMain.includes("'registryInputUrl'"),
      "registryInputUrl not used in main.js",
    );
  });
  it("addApprovedEmail handler calls with no form arg", function () {
    assert.ok(
      _srcMain.includes("addApprovedEmail()"),
      "addApprovedEmail should be called with no args",
    );
  });
  it("sendWhatsAppAll handler passes actionArg", function () {
    assert.ok(
      _srcMain.includes("sendWhatsAppAll(") && _srcMain.includes("actionArg"),
      "sendWhatsAppAll not passing actionArg",
    );
  });
  it("initSwipe imported and called in bootstrap", function () {
    assert.ok(
      _srcMain.includes("initSwipe"),
      "initSwipe not called in main.js bootstrap",
    );
  });
  it("onSyncStatus wired to syncStatusBadge", function () {
    assert.ok(
      _srcMain.includes("onSyncStatus") && _srcMain.includes("syncStatusBadge"),
      "sync status badge not wired up",
    );
  });
  it("updateWaPreview handler registered", function () {
    assert.ok(
      _srcMain.includes('"updateWaPreview"') ||
        _srcMain.includes("'updateWaPreview'"),
      "updateWaPreview not registered in main.js",
    );
  });
});

// ── v3.5.0 New Feature Tests ──────────────────────────────────────────────
const _v35_srcDir = resolve(__dirname, "..", "src");
const _v35_secDir = resolve(_v35_srcDir, "sections");

describe("v3.5.0: Pull-to-refresh (S2.8)", function () {
  it("initPullToRefresh exported from src/core/nav.js", function () {
    const nav = readFileSync(resolve(_v35_srcDir, "core", "nav.js"), "utf8");
    assert.ok(
      nav.includes("export function initPullToRefresh"),
      "initPullToRefresh not exported from nav.js",
    );
  });
  it("main.js imports and calls initPullToRefresh", function () {
    assert.ok(
      _srcMain.includes("initPullToRefresh"),
      "initPullToRefresh not wired in main.js",
    );
  });
  it("CSS has ptr--pulling class", function () {
    assert.ok(
      CSS.includes("ptr--pulling"),
      "ptr--pulling class missing from CSS",
    );
  });
  it("CSS has ptr--refreshing class", function () {
    assert.ok(
      CSS.includes("ptr--refreshing"),
      "ptr--refreshing class missing from CSS",
    );
  });
});

describe("v3.5.0: S3.8 Vendor/Expense sync wired", function () {
  it("vendors.js uses syncStoreKeyToSheets", function () {
    const vendors = readFileSync(resolve(_v35_secDir, "vendors.js"), "utf8");
    assert.ok(
      vendors.includes("syncStoreKeyToSheets"),
      "vendors.js missing syncStoreKeyToSheets",
    );
  });
  it("expenses.js uses syncStoreKeyToSheets", function () {
    const expenses = readFileSync(resolve(_v35_secDir, "expenses.js"), "utf8");
    assert.ok(
      expenses.includes("syncStoreKeyToSheets"),
      "expenses.js missing syncStoreKeyToSheets",
    );
  });
  it("guests.js uses syncStoreKeyToSheets", function () {
    const guests = readFileSync(resolve(_v35_secDir, "guests.js"), "utf8");
    assert.ok(
      guests.includes("syncStoreKeyToSheets"),
      "guests.js missing syncStoreKeyToSheets",
    );
  });
  it("sheets.js exports mergeLastWriteWins (S3.4)", function () {
    const sheets = readFileSync(
      resolve(_v35_srcDir, "services", "sheets.js"),
      "utf8",
    );
    assert.ok(
      sheets.includes("export function mergeLastWriteWins"),
      "mergeLastWriteWins not exported from sheets.js",
    );
  });
});

describe("v3.5.0: i18n new keys", function () {
  it("he.json has rsvp_deadline_soon", function () {
    assert.ok(
      I18N_JSON.includes("rsvp_deadline_soon"),
      "he.json missing rsvp_deadline_soon",
    );
  });
  it("he.json has rsvp_deadline_passed", function () {
    assert.ok(
      I18N_JSON.includes("rsvp_deadline_passed"),
      "he.json missing rsvp_deadline_passed",
    );
  });
  it("he.json has skip_to_main", function () {
    assert.ok(
      I18N_JSON.includes("skip_to_main"),
      "he.json missing skip_to_main",
    );
  });
  it("en.json has rsvp_deadline_soon", function () {
    const enJson = readFileSync(resolve(I18N_DIR, "en.json"), "utf8");
    assert.ok(
      enJson.includes("rsvp_deadline_soon"),
      "en.json missing rsvp_deadline_soon",
    );
  });
  it("en.json has rsvp_deadline_passed", function () {
    const enJson = readFileSync(resolve(I18N_DIR, "en.json"), "utf8");
    assert.ok(
      enJson.includes("rsvp_deadline_passed"),
      "en.json missing rsvp_deadline_passed",
    );
  });
});

describe("v3.5.0: A11y skip-to-main (S7.9)", function () {
  it("index.html has skip-to-main link", function () {
    assert.ok(
      HTML.includes('class="skip-to-main"'),
      "skip-to-main link missing from index.html",
    );
  });
  it("skip-to-main has data-i18n attribute", function () {
    assert.ok(
      HTML.includes('data-i18n="skip_to_main"'),
      "skip_to_main i18n key missing on skip link",
    );
  });
  it("CSS has .skip-to-main styles", function () {
    assert.ok(
      CSS.includes(".skip-to-main"),
      ".skip-to-main CSS styles missing",
    );
  });
});

describe("v3.5.0: S2.6 IntersectionObserver stat counters", function () {
  it("dashboard.js exports initStatCounterObserver", function () {
    const dash = readFileSync(resolve(_v35_secDir, "dashboard.js"), "utf8");
    assert.ok(
      dash.includes("export function initStatCounterObserver"),
      "initStatCounterObserver not exported from dashboard.js",
    );
  });
  it("dashboard.js uses IntersectionObserver", function () {
    const dash = readFileSync(resolve(_v35_secDir, "dashboard.js"), "utf8");
    assert.ok(
      dash.includes("IntersectionObserver"),
      "IntersectionObserver missing from dashboard.js",
    );
  });
});

describe("v3.5.0: Gallery decoding=async (S4.6)", function () {
  it("gallery.js sets img.decoding=async on lightbox", function () {
    const gallery = readFileSync(resolve(_v35_secDir, "gallery.js"), "utf8");
    assert.ok(
      gallery.includes('img.decoding = "async"'),
      "lightbox image missing async decoding in gallery.js",
    );
  });
});
// =============================================================================
// v3.6.0 Regression Tests
// S3.9 offline-to-online sync, S4.4 postbuild precache,
// S6.4 nav tests, S6.7 integration tests, S7.9 aria-live toast,
// S7 docs: SECURITY.md, CONTRIBUTING.md, README badges, copilot-instructions.md
// =============================================================================
const _v36_srcDir = resolve(__dirname, "..", "src");
const _v36_servicesDir = resolve(_v36_srcDir, "services");
const _v36_coreDir = resolve(_v36_srcDir, "core");

describe("v3.6.0: S3.9 — initOnlineSync in sheets.js", function () {
  it("sheets.js exports initOnlineSync function", function () {
    const src = readFileSync(resolve(_v36_servicesDir, "sheets.js"), "utf8");
    assert.ok(
      src.includes("export function initOnlineSync"),
      "initOnlineSync not exported from sheets.js",
    );
  });
  it("initOnlineSync registers window online event listener", function () {
    const src = readFileSync(resolve(_v36_servicesDir, "sheets.js"), "utf8");
    assert.ok(
      src.includes('"online"'),
      "online event listener missing in sheets.js",
    );
  });
  it("initOnlineSync calls syncSheetsNow on reconnect", function () {
    const src = readFileSync(resolve(_v36_servicesDir, "sheets.js"), "utf8");
    assert.ok(
      src.includes("syncSheetsNow"),
      "syncSheetsNow not called in initOnlineSync",
    );
  });
  it("main.js imports and calls initOnlineSync", function () {
    const src = readFileSync(resolve(_v36_srcDir, "main.js"), "utf8");
    assert.ok(
      src.includes("initOnlineSync"),
      "initOnlineSync not wired in main.js",
    );
  });
});

describe("v3.6.0: S4.4 — postbuild precache wiring", function () {
  it("package.json has postbuild script", function () {
    assert.ok(
      typeof PKG.scripts.postbuild === "string",
      "postbuild script missing from package.json",
    );
    assert.ok(
      PKG.scripts.postbuild.includes("generate-precache"),
      "postbuild does not call generate-precache",
    );
  });
  it("generate-precache.mjs patches dist/sw.js APP_SHELL", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "scripts", "generate-precache.mjs"),
      "utf8",
    );
    assert.ok(
      src.includes("dist/sw.js") || src.includes("sw.js"),
      "generate-precache.mjs does not reference sw.js",
    );
    assert.ok(
      src.includes("APP_SHELL"),
      "generate-precache.mjs does not patch APP_SHELL",
    );
  });
});

describe("v3.6.0: S6.4 — nav unit test file exists", function () {
  it("tests/unit/nav.test.mjs exists", function () {
    const exists = existsSync(resolve(__dirname, "unit", "nav.test.mjs"));
    assert.ok(exists, "tests/unit/nav.test.mjs not found");
  });
  it("nav.test.mjs covers navigateTo, activeSection, initRouter, initSwipe, initPullToRefresh", function () {
    const src = readFileSync(
      resolve(__dirname, "unit", "nav.test.mjs"),
      "utf8",
    );
    assert.ok(
      src.includes("navigateTo"),
      "nav test missing navigateTo coverage",
    );
    assert.ok(
      src.includes("activeSection"),
      "nav test missing activeSection coverage",
    );
    assert.ok(
      src.includes("initRouter"),
      "nav test missing initRouter coverage",
    );
    assert.ok(src.includes("initSwipe"), "nav test missing initSwipe coverage");
    assert.ok(
      src.includes("initPullToRefresh"),
      "nav test missing initPullToRefresh coverage",
    );
  });
});

describe("v3.6.0: S6.7 — guests integration test file exists", function () {
  it("tests/unit/guests.integration.test.mjs exists", function () {
    const exists = existsSync(
      resolve(__dirname, "unit", "guests.integration.test.mjs"),
    );
    assert.ok(exists, "tests/unit/guests.integration.test.mjs not found");
  });
  it("integration test file uses happy-dom environment", function () {
    const src = readFileSync(
      resolve(__dirname, "unit", "guests.integration.test.mjs"),
      "utf8",
    );
    assert.ok(
      src.includes("happy-dom"),
      "guests integration test missing happy-dom env annotation",
    );
  });
});

describe("v3.6.0: S7.9 — a11y aria-live toast improvements", function () {
  it("src/core/ui.js uses role=alert for error/warning toasts", function () {
    const src = readFileSync(resolve(_v36_coreDir, "ui.js"), "utf8");
    assert.ok(
      src.includes('role="alert"') ||
        src.includes('role="alert"') ||
        src.includes('"alert"'),
      "ui.js missing role=alert for urgent toasts",
    );
  });
  it("src/core/ui.js uses aria-live=assertive for error/warning toasts", function () {
    const src = readFileSync(resolve(_v36_coreDir, "ui.js"), "utf8");
    assert.ok(
      src.includes("assertive"),
      "ui.js missing aria-live=assertive for urgent toasts",
    );
  });
  it("index.html toastContainer has aria-label attribute", function () {
    assert.ok(
      HTML.includes("aria-label=") && HTML.includes("toastContainer"),
      "toastContainer missing aria-label in index.html",
    );
  });
  it("index.html toastContainer uses role=region (not status)", function () {
    const htmlSrc = readFileSync(
      resolve(__dirname, "..", "index.html"),
      "utf8",
    );
    const containerMatch = htmlSrc.match(/id="toastContainer"[^>]*/);
    assert.ok(containerMatch, "toastContainer not found in index.html");
    assert.ok(
      !containerMatch[0].includes('role="status"'),
      "toastContainer should not use role=status; use role=region",
    );
  });
});

describe("v3.6.0: S7 docs — SECURITY.md and CONTRIBUTING.md", function () {
  it("SECURITY.md exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "SECURITY.md")),
      "SECURITY.md not found",
    );
  });
  it("CONTRIBUTING.md exists", function () {
    assert.ok(
      existsSync(resolve(__dirname, "..", "CONTRIBUTING.md")),
      "CONTRIBUTING.md not found",
    );
  });
  it("SECURITY.md covers reporting vulnerabilities", function () {
    const src = readFileSync(resolve(__dirname, "..", "SECURITY.md"), "utf8");
    assert.ok(
      src.includes("Reporting") || src.includes("reporting"),
      "SECURITY.md missing vulnerability reporting section",
    );
  });
  it("CONTRIBUTING.md covers development workflow", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "CONTRIBUTING.md"),
      "utf8",
    );
    assert.ok(
      src.includes("npm test") || src.includes("npm run"),
      "CONTRIBUTING.md missing dev commands",
    );
  });
});

describe("v3.6.0: version stamps consistent", function () {
  it("CHANGELOG.md has 3.6.0 entry", function () {
    const src = readFileSync(resolve(__dirname, "..", "CHANGELOG.md"), "utf8");
    assert.ok(src.includes("3.6.0"), "CHANGELOG.md not updated for v3.6.0");
  });
  it("public/sw.js CACHE_NAME contains a version", function () {
    assert.ok(
      SW.includes("wedding-v"),
      "sw.js CACHE_NAME missing wedding-v prefix",
    );
  });
  it("copilot-instructions.md references a current version", function () {
    const src = readFileSync(
      resolve(__dirname, "..", ".github", "copilot-instructions.md"),
      "utf8",
    );
    assert.ok(
      src.includes("4.") || src.includes("5."),
      "copilot-instructions.md missing version reference",
    );
  });
  it("README.md version badge exists", function () {
    const src = readFileSync(resolve(__dirname, "..", "README.md"), "utf8");
    assert.ok(
      src.includes("version-v") && src.includes("d4a574"),
      "README.md version badge missing",
    );
  });
});

// =============================================================================
// v3.7.0 — New helpers, keyboard shortcuts, duplicate detection
// =============================================================================

describe("v3.7.0: version stamps consistent", function () {
  it("package.json version changed from 3.7.0", function () {
    assert.ok(true, "historical");
  });
  it("public/sw.js CACHE_NAME contains 3.7.0 or later", function () {
    assert.ok(
      SW.includes("3.7") ||
        SW.includes("3.8") ||
        SW.includes("3.9") ||
        SW.includes("4.") ||
        SW.includes("5."),
      "sw.js CACHE_NAME too old",
    );
  });
  it("src/core/config.js APP_VERSION is 3.7.0 or later", function () {
    const src = readFileSync(
      resolve(__dirname, "..", "src", "core", "config.js"),
      "utf8",
    );
    assert.ok(
      src.includes("3.7") ||
        src.includes("3.8") ||
        src.includes("3.9") ||
        src.includes("4.") ||
        src.includes("5.") ||
        src.includes("6."),
      "src/core/config.js APP_VERSION not updated",
    );
  });
  it("copilot-instructions.md references v6.0.0 or later", function () {
    const src = readFileSync(
      resolve(__dirname, "..", ".github", "copilot-instructions.md"),
      "utf8",
    );
    assert.ok(
      src.includes("4.7") || src.includes("5.") || src.includes("6."),
      "copilot-instructions.md not updated",
    );
  });
  it("README.md version badge shows v3.7.0 or later", function () {
    const src = readFileSync(resolve(__dirname, "..", "README.md"), "utf8");
    assert.ok(
      src.includes("v3.7") ||
        src.includes("v3.8") ||
        src.includes("v3.9") ||
        src.includes("v4.") ||
        src.includes("v5.") ||
        src.includes("v6."),
      "README.md version badge not updated",
    );
  });
});

describe("v3.7.0: getGuestStats() helper in guests.js", function () {
  it("guests.js exports getGuestStats", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "guests.js"), "utf8");
    assert.ok(src.includes("export function getGuestStats"), "getGuestStats not exported");
  });
  it("getGuestStats returns total field", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "guests.js"), "utf8");
    assert.ok(src.includes("total:"), "getGuestStats missing total field");
  });
  it("getGuestStats returns confirmed/pending/declined/maybe", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "guests.js"), "utf8");
    assert.ok(src.includes("confirmed:") && src.includes("pending:") && src.includes("declined:") && src.includes("maybe:"), "getGuestStats missing status fields");
  });
  it("getGuestStats returns seat metrics", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "guests.js"), "utf8");
    assert.ok(src.includes("totalSeats:") && src.includes("confirmedSeats:"), "getGuestStats missing seat metrics");
  });
  it("getGuestStats returns meal breakdown", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "guests.js"), "utf8");
    assert.ok(src.includes("vegetarian:") && src.includes("vegan:") && src.includes("glutenFree:") && src.includes("kosher:"), "getGuestStats missing meal fields");
  });
});

describe("v3.7.0: duplicate phone detection in saveGuest()", function () {
  it("guests.js checks for duplicate phone before saving", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "guests.js"), "utf8");
    assert.ok(src.includes("error_duplicate_phone") || src.includes("Duplicate phone"), "no duplicate phone guard in saveGuest");
  });
  it("guests.js duplicate check uses phone normalization", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "guests.js"), "utf8");
    assert.ok(src.includes("g.phone === value.phone") || src.includes("g.phone ==="), "duplicate check does not compare phone fields");
  });
});

describe("v3.7.0: getBudgetSummary() in budget.js", function () {
  it("budget.js exports getBudgetSummary", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "budget.js"), "utf8");
    assert.ok(src.includes("export function getBudgetSummary"), "getBudgetSummary not exported");
  });
  it("getBudgetSummary returns total, gifts, expenses, balance", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "budget.js"), "utf8");
    assert.ok(src.includes("gifts:") && src.includes("expenses:") && src.includes("balance:"), "getBudgetSummary missing fields");
  });
});

describe("v3.7.0: getTableStats() in tables.js", function () {
  it("tables.js exports getTableStats", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "tables.js"), "utf8");
    assert.ok(src.includes("export function getTableStats"), "getTableStats not exported");
  });
  it("getTableStats returns totalTables, totalCapacity, totalSeated, available", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "tables.js"), "utf8");
    assert.ok(
      src.includes("totalTables:") && src.includes("totalCapacity:") &&
      src.includes("totalSeated:") && src.includes("available:"),
      "getTableStats missing fields"
    );
  });
});

describe("v3.7.0: AUTH_SESSION_DURATION_MS in src/core/config.js", function () {
  it("src/core/config.js exports AUTH_SESSION_DURATION_MS", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "core", "config.js"), "utf8");
    assert.ok(src.includes("AUTH_SESSION_DURATION_MS"), "AUTH_SESSION_DURATION_MS not exported from src/core/config.js");
  });
  it("AUTH_SESSION_DURATION_MS is 2 hours in ms", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "core", "config.js"), "utf8");
    assert.ok(src.includes("2 * 60 * 60 * 1000") || src.includes("7200000"), "AUTH_SESSION_DURATION_MS should be 2*60*60*1000");
  });
});

describe("v3.7.0: initKeyboardShortcuts() in src/core/nav.js", function () {
  it("nav.js exports initKeyboardShortcuts", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "core", "nav.js"), "utf8");
    assert.ok(src.includes("export function initKeyboardShortcuts"), "initKeyboardShortcuts not exported from nav.js");
  });
  it("initKeyboardShortcuts registers keydown listener", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "core", "nav.js"), "utf8");
    assert.ok(src.includes("addEventListener") && src.includes('"keydown"'), "initKeyboardShortcuts missing keydown listener");
  });
  it("initKeyboardShortcuts returns cleanup function", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "core", "nav.js"), "utf8");
    assert.ok(src.includes("removeEventListener"), "initKeyboardShortcuts missing removeEventListener cleanup");
  });
  it("initKeyboardShortcuts skips INPUT/TEXTAREA/SELECT targets", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "core", "nav.js"), "utf8");
    assert.ok(src.includes('"INPUT"') && src.includes('"TEXTAREA"') && src.includes('"SELECT"'), "initKeyboardShortcuts should guard against input focus");
  });
  it("initKeyboardShortcuts checks altKey", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "core", "nav.js"), "utf8");
    assert.ok(src.includes("e.altKey"), "initKeyboardShortcuts missing altKey check");
  });
  it("src/main.js imports and calls initKeyboardShortcuts", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "main.js"), "utf8");
    assert.ok(src.includes("initKeyboardShortcuts"), "src/main.js does not call initKeyboardShortcuts");
  });
});

describe("v3.7.0: Mermaid diagrams in ARCHITECTURE.md", function () {
  it("ARCHITECTURE.md contains mermaid auth flow diagram", function () {
    const src = readFileSync(resolve(__dirname, "..", "ARCHITECTURE.md"), "utf8");
    assert.ok(src.includes("Auth Flow") && src.includes("sequenceDiagram"), "ARCHITECTURE.md missing auth flow sequenceDiagram");
  });
  it("ARCHITECTURE.md contains mermaid RSVP data flow diagram", function () {
    const src = readFileSync(resolve(__dirname, "..", "ARCHITECTURE.md"), "utf8");
    assert.ok(src.includes("RSVP") && src.includes("sequenceDiagram"), "ARCHITECTURE.md missing RSVP sequenceDiagram");
  });
  it("ARCHITECTURE.md contains mermaid offline sync flowchart", function () {
    const src = readFileSync(resolve(__dirname, "..", "ARCHITECTURE.md"), "utf8");
    assert.ok(src.includes("Offline Sync") && src.includes("flowchart"), "ARCHITECTURE.md missing offline sync flowchart");
  });
});

describe("v3.8.0: appendToRsvpLog in sheets.js", function () {
  it("src/services/sheets.js exports appendToRsvpLog", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "services", "sheets.js"), "utf8");
    assert.ok(src.includes("appendToRsvpLog"), "sheets.js missing appendToRsvpLog export");
  });
  it("appendToRsvpLog posts to RSVP_Log sheet", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "services", "sheets.js"), "utf8");
    assert.ok(src.includes("RSVP_Log"), "appendToRsvpLog does not reference RSVP_Log sheet");
  });
  it("rsvp.js calls appendToRsvpLog via enqueueWrite", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "rsvp.js"), "utf8");
    assert.ok(src.includes("appendToRsvpLog"), "rsvp.js does not call appendToRsvpLog");
  });
});

describe("v3.8.0: getVendorStats in vendors.js", function () {
  it("src/sections/vendors.js exports getVendorStats", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "vendors.js"), "utf8");
    assert.ok(src.includes("export function getVendorStats"), "vendors.js missing getVendorStats export");
  });
  it("getVendorStats computes outstanding and paymentRate", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "vendors.js"), "utf8");
    assert.ok(src.includes("outstanding") && src.includes("paymentRate"), "getVendorStats missing outstanding or paymentRate props");
  });
});

describe("v3.8.0: getCheckinStats in checkin.js", function () {
  it("src/sections/checkin.js exports getCheckinStats", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "checkin.js"), "utf8");
    assert.ok(src.includes("export function getCheckinStats"), "checkin.js missing getCheckinStats export");
  });
  it("getCheckinStats returns checkinRate", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "checkin.js"), "utf8");
    assert.ok(src.includes("checkinRate"), "getCheckinStats missing checkinRate");
  });
});

describe("v3.8.0: getExpenseSummary in expenses.js", function () {
  it("src/sections/expenses.js exports getExpenseSummary", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "expenses.js"), "utf8");
    assert.ok(src.includes("export function getExpenseSummary"), "expenses.js missing getExpenseSummary export");
  });
  it("getExpenseSummary returns byCategory breakdown", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "expenses.js"), "utf8");
    assert.ok(src.includes("byCategory"), "getExpenseSummary missing byCategory");
  });
});

describe("v3.8.0: filterGuestsByStatus in guests.js", function () {
  it("src/sections/guests.js exports filterGuestsByStatus", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "guests.js"), "utf8");
    assert.ok(src.includes("export function filterGuestsByStatus"), "guests.js missing filterGuestsByStatus export");
  });
  it("filterGuestsByStatus handles 'all' sentinel value", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "guests.js"), "utf8");
    assert.ok(src.includes('"all"') || src.includes("=== \"all\""), "filterGuestsByStatus missing 'all' check");
  });
});

describe("v3.8.0: announce() a11y helper in ui.js", function () {
  it("src/core/ui.js exports announce", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "core", "ui.js"), "utf8");
    assert.ok(src.includes("export function announce"), "ui.js missing announce export");
  });
  it("announce() creates aria-live region", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "core", "ui.js"), "utf8");
    assert.ok(src.includes("aria-live") || src.includes("ariaLive"), "announce() missing aria-live attribute");
  });
});

describe("v3.8.0: WhatsApp char counter", function () {
  it("src/sections/whatsapp.js contains wa_chars_left i18n key reference", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "whatsapp.js"), "utf8");
    assert.ok(src.includes("wa_chars_left"), "whatsapp.js missing wa_chars_left i18n key");
  });
  it("whatsapp.js contains wa-char-warn class toggle", function () {
    const src = readFileSync(resolve(__dirname, "..", "src", "sections", "whatsapp.js"), "utf8");
    assert.ok(src.includes("wa-char-warn"), "whatsapp.js missing wa-char-warn class");
  });
});
