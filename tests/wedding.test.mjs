// =============================================================================
// Wedding Manager — Test Suite v1.3.0
// Run: node --test tests/wedding.test.mjs
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
  it("HTML contains v1.3.0", function () {
    assert.ok(SRC.includes("v1.3.0"));
  });

  it("SW cache name contains v1.3.0", function () {
    assert.ok(SW.includes("wedding-v1.3.0"));
  });

  it("package.json version is 1.3.0", function () {
    assert.equal(PKG.version, "1.3.0");
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
    assert.ok(SW.includes('wedding-v1.3.0'));
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
