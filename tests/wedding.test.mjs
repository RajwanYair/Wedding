// =============================================================================
// Wedding Manager — Test Suite v1.1.0
// Run: node --test tests/wedding.test.mjs
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = readFileSync(resolve(__dirname, '..', 'index.html'), 'utf8');
const SW = readFileSync(resolve(__dirname, '..', 'sw.js'), 'utf8');
const MANIFEST = JSON.parse(readFileSync(resolve(__dirname, '..', 'manifest.json'), 'utf8'));
const PKG = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));

// ── Version ──
describe('Version', function() {
  it('HTML contains v1.1.0', function() {
    assert.ok(HTML.includes('v1.1.0'));
  });

  it('SW cache name contains v1.1.0', function() {
    assert.ok(SW.includes('wedding-v1.1.0'));
  });

  it('package.json version is 1.1.0', function() {
    assert.equal(PKG.version, '1.1.0');
  });
});

// ── HTML Structure ──
describe('HTML Structure', function() {
  it('has DOCTYPE', function() {
    assert.ok(HTML.startsWith('<!DOCTYPE html>'));
  });

  it('has lang="he" and dir="rtl"', function() {
    assert.ok(HTML.includes('lang="he"'));
    assert.ok(HTML.includes('dir="rtl"'));
  });

  it('has viewport meta', function() {
    assert.ok(HTML.includes('name="viewport"'));
  });

  it('has charset meta', function() {
    assert.ok(HTML.includes('charset="UTF-8"'));
  });

  it('has title', function() {
    assert.ok(HTML.includes('<title>'));
  });

  it('links to manifest.json', function() {
    assert.ok(HTML.includes('manifest.json'));
  });

  it('links to icon.svg', function() {
    assert.ok(HTML.includes('icon.svg'));
  });
});

// ── Sections ──
describe('Sections', function() {
  const sections = ['dashboard', 'guests', 'tables', 'invitation', 'whatsapp', 'rsvp', 'settings'];
  sections.forEach(function(sec) {
    it('has section: ' + sec, function() {
      assert.ok(HTML.includes('id="sec-' + sec + '"'));
    });
  });

  it('has navigation tabs', function() {
    assert.ok(HTML.includes('nav-tabs'));
  });
});

// ── i18n ──
describe('i18n System', function() {
  it('has data-i18n attributes', function() {
    assert.ok(HTML.includes('data-i18n='));
  });

  it('has Hebrew translations object', function() {
    assert.ok(HTML.includes("he: {") || HTML.includes("he:{"));
  });

  it('has English translations object', function() {
    assert.ok(HTML.includes("en: {") || HTML.includes("en:{"));
  });

  it('has language toggle button', function() {
    assert.ok(HTML.includes('toggleLanguage'));
  });

  it('has t() function', function() {
    assert.ok(HTML.includes('function t('));
  });

  it('has applyLanguage function', function() {
    assert.ok(HTML.includes('function applyLanguage'));
  });
});

// ── Themes ──
describe('Themes', function() {
  it('has default theme (purple)', function() {
    assert.ok(HTML.includes('--accent: #d4a574'));
  });

  it('has rose gold theme', function() {
    assert.ok(HTML.includes('theme-rosegold'));
  });

  it('has classic gold theme', function() {
    assert.ok(HTML.includes('theme-gold'));
  });

  it('has emerald theme', function() {
    assert.ok(HTML.includes('theme-emerald'));
  });

  it('has royal blue theme', function() {
    assert.ok(HTML.includes('theme-royal'));
  });

  it('has cycleTheme function', function() {
    assert.ok(HTML.includes('function cycleTheme'));
  });
});

// ── Guest Management ──
describe('Guest Management', function() {
  it('has guest table', function() {
    assert.ok(HTML.includes('id="guestTableBody"'));
  });

  it('has add guest modal', function() {
    assert.ok(HTML.includes('id="guestModal"'));
  });

  it('has saveGuest function', function() {
    assert.ok(HTML.includes('function saveGuest'));
  });

  it('has deleteGuest function', function() {
    assert.ok(HTML.includes('function deleteGuest'));
  });

  it('has editGuest function', function() {
    assert.ok(HTML.includes('function editGuest'));
  });

  it('has search functionality', function() {
    assert.ok(HTML.includes('id="guestSearch"'));
  });

  it('has filter buttons', function() {
    assert.ok(HTML.includes('setFilter'));
  });

  it('has status badges (confirmed, pending, declined)', function() {
    assert.ok(HTML.includes('status-confirmed'));
    assert.ok(HTML.includes('status-pending'));
    assert.ok(HTML.includes('status-declined'));
  });

  it('has side filter (groom/bride/mutual)', function() {
    assert.ok(HTML.includes('setSideFilter'));
    assert.ok(HTML.includes('side-groom'));
    assert.ok(HTML.includes('side-bride'));
    assert.ok(HTML.includes('side-mutual'));
  });

  it('has meal preferences', function() {
    assert.ok(HTML.includes('meal_regular'));
    assert.ok(HTML.includes('meal_vegetarian'));
    assert.ok(HTML.includes('meal_vegan'));
  });

  it('has expanded guest model (firstName, lastName, side, meal, children)', function() {
    assert.ok(HTML.includes('guestFirstName'));
    assert.ok(HTML.includes('guestLastName'));
    assert.ok(HTML.includes('guestSide'));
    assert.ok(HTML.includes('guestMeal'));
    assert.ok(HTML.includes('guestChildren'));
    assert.ok(HTML.includes('guestAccessibility'));
  });

  it('has sortGuestsBy function', function() {
    assert.ok(HTML.includes('function sortGuestsBy'));
  });

  it('has data migration function', function() {
    assert.ok(HTML.includes('function migrateGuests'));
  });
});

// ── Table Seating ──
describe('Table Seating', function() {
  it('has seating floor', function() {
    assert.ok(HTML.includes('id="seatingFloor"'));
  });

  it('has table modal', function() {
    assert.ok(HTML.includes('id="tableModal"'));
  });

  it('has saveTable function', function() {
    assert.ok(HTML.includes('function saveTable'));
  });

  it('has deleteTable function', function() {
    assert.ok(HTML.includes('function deleteTable'));
  });

  it('supports round and rect shapes', function() {
    assert.ok(HTML.includes('shape_round'));
    assert.ok(HTML.includes('shape_rect'));
  });

  it('has drag-and-drop support', function() {
    assert.ok(HTML.includes('ondragstart'));
    assert.ok(HTML.includes('ondrop'));
    assert.ok(HTML.includes('ondragover'));
  });

  it('has unassigned guests section', function() {
    assert.ok(HTML.includes('id="unassignedGuests"'));
  });
});

// ── WhatsApp ──
describe('WhatsApp Integration', function() {
  it('has WhatsApp template textarea', function() {
    assert.ok(HTML.includes('id="waTemplate"'));
  });

  it('has WhatsApp preview', function() {
    assert.ok(HTML.includes('id="waPreviewBubble"'));
  });

  it('has sendWhatsAppSingle function', function() {
    assert.ok(HTML.includes('function sendWhatsAppSingle'));
  });

  it('has sendWhatsAppAll function', function() {
    assert.ok(HTML.includes('function sendWhatsAppAll'));
  });

  it('uses wa.me deep link', function() {
    assert.ok(HTML.includes('wa.me/'));
  });

  it('has message placeholders', function() {
    assert.ok(HTML.includes('{name}'));
    assert.ok(HTML.includes('{groom}'));
    assert.ok(HTML.includes('{bride}'));
    assert.ok(HTML.includes('{date}'));
    assert.ok(HTML.includes('{venue}'));
  });

  it('opens in new tab with noopener', function() {
    assert.ok(HTML.includes('noopener'));
  });
});

// ── RSVP ──
describe('RSVP', function() {
  it('has RSVP first name field', function() {
    assert.ok(HTML.includes('id="rsvpFirstName"'));
  });

  it('has RSVP phone field', function() {
    assert.ok(HTML.includes('id="rsvpPhone"'));
  });

  it('has RSVP attendance field', function() {
    assert.ok(HTML.includes('id="rsvpAttending"'));
  });

  it('has submitRSVP function', function() {
    assert.ok(HTML.includes('function submitRSVP'));
  });

  it('has guest count input', function() {
    assert.ok(HTML.includes('id="rsvpGuests"'));
  });

  it('has dietary notes field', function() {
    assert.ok(HTML.includes('id="rsvpNotes"'));
  });

  it('has side selection (groom/bride/mutual)', function() {
    assert.ok(HTML.includes('id="rsvpSide"'));
  });

  it('has meal selection', function() {
    assert.ok(HTML.includes('id="rsvpMeal"'));
  });

  it('has children field', function() {
    assert.ok(HTML.includes('id="rsvpChildren"'));
  });

  it('has accessibility checkbox', function() {
    assert.ok(HTML.includes('id="rsvpAccessibility"'));
  });
});

// ── Invitation ──
describe('Invitation', function() {
  it('has invitation preview', function() {
    assert.ok(HTML.includes('id="invitationPreview"'));
  });

  it('has file upload', function() {
    assert.ok(HTML.includes('id="invitationFile"'));
  });

  it('has handleInvitationUpload function', function() {
    assert.ok(HTML.includes('function handleInvitationUpload'));
  });

  it('generates default SVG invitation', function() {
    assert.ok(HTML.includes('function renderDefaultInvitationSVG'));
  });

  it('validates file type', function() {
    assert.ok(HTML.includes('validTypes'));
  });

  it('validates file size', function() {
    assert.ok(HTML.includes('5 * 1024 * 1024'));
  });
});

// ── Wedding Details ──
describe('Wedding Details', function() {
  it('has groom name input', function() {
    assert.ok(HTML.includes('id="groomName"'));
  });

  it('has bride name input', function() {
    assert.ok(HTML.includes('id="brideName"'));
  });

  it('has wedding date input', function() {
    assert.ok(HTML.includes('id="weddingDate"'));
  });

  it('has venue input', function() {
    assert.ok(HTML.includes('id="venueName"'));
  });

  it('has countdown', function() {
    assert.ok(HTML.includes('id="countdown"'));
  });
});

// ── Data Persistence ──
describe('Data Persistence', function() {
  it('uses wedding_v1_ prefix', function() {
    assert.ok(HTML.includes('wedding_v1_'));
  });

  it('has save function', function() {
    assert.ok(HTML.includes('function save('));
  });

  it('has load function', function() {
    assert.ok(HTML.includes('function load('));
  });

  it('has saveAll function', function() {
    assert.ok(HTML.includes('function saveAll'));
  });

  it('has loadAll function', function() {
    assert.ok(HTML.includes('function loadAll'));
  });
});

// ── Export ──
describe('Export', function() {
  it('has CSV export', function() {
    assert.ok(HTML.includes('function exportGuestsCSV'));
  });

  it('includes UTF-8 BOM for Hebrew', function() {
    assert.ok(HTML.includes('\\uFEFF') || HTML.includes('BOM'));
  });

  it('has print function', function() {
    assert.ok(HTML.includes('function printGuests'));
  });

  it('has JSON backup export', function() {
    assert.ok(HTML.includes('function exportJSON'));
  });

  it('has JSON backup import', function() {
    assert.ok(HTML.includes('function importJSON'));
  });

  it('has CSV import', function() {
    assert.ok(HTML.includes('function importCSV'));
  });

  it('has CSV template download', function() {
    assert.ok(HTML.includes('function downloadCSVTemplate'));
  });

  it('has clearAllData function', function() {
    assert.ok(HTML.includes('function clearAllData'));
  });
});

// ── Security ──
describe('Security', function() {
  it('does not use eval()', function() {
    assert.ok(!HTML.includes('eval('));
  });

  it('does not use document.write()', function() {
    assert.ok(!HTML.includes('document.write('));
  });

  it('has escapeHtml function', function() {
    assert.ok(HTML.includes('function escapeHtml'));
  });

  it('uses textContent for safe rendering', function() {
    assert.ok(HTML.includes('textContent'));
  });

  it('has cleanPhone function', function() {
    assert.ok(HTML.includes('function cleanPhone'));
  });
});

// ── CSS ──
describe('CSS', function() {
  it('uses CSS custom properties', function() {
    assert.ok(HTML.includes(':root'));
    assert.ok(HTML.includes('var(--'));
  });

  it('has glassmorphism (backdrop-filter)', function() {
    assert.ok(HTML.includes('backdrop-filter: blur('));
  });

  it('has responsive breakpoints', function() {
    assert.ok(HTML.includes('768px'));
    assert.ok(HTML.includes('480px'));
  });

  it('has print stylesheet', function() {
    assert.ok(HTML.includes('@media print'));
  });

  it('respects prefers-reduced-motion', function() {
    assert.ok(HTML.includes('prefers-reduced-motion'));
  });

  it('has RTL-first layout styles', function() {
    assert.ok(HTML.includes('dir="rtl"'));
  });
});

// ── UI Components ──
describe('UI Components', function() {
  it('has toast notification system', function() {
    assert.ok(HTML.includes('function showToast'));
    assert.ok(HTML.includes('id="toastContainer"'));
  });

  it('has modals with close on escape', function() {
    assert.ok(HTML.includes("e.key === 'Escape'"));
  });

  it('has modals with close on overlay click', function() {
    assert.ok(HTML.includes('e.target === overlay'));
  });

  it('has progress bar', function() {
    assert.ok(HTML.includes('id="progressFill"'));
  });

  it('has empty states', function() {
    assert.ok(HTML.includes('empty-state'));
  });

  it('has floating particles', function() {
    assert.ok(HTML.includes('function initParticles'));
  });
});

// ── Service Worker ──
describe('Service Worker', function() {
  it('has cache name with version', function() {
    assert.ok(SW.includes("CACHE_NAME = 'wedding-v1.1.0'"));
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
