'use strict';

/* ── Persistence (localStorage) ── */
/* ── Persistence (localStorage) ── */
function save(key, data) {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data)); } catch (_e) {}
}
function load(key) {
  try { const v = localStorage.getItem(STORAGE_PREFIX + key); return v ? JSON.parse(v) : null; } catch (_e) { return null; }
}

function saveAll() {
  save('guests', _guests);
  save('tables', _tables);
  save('wedding', _weddingInfo);
  save('invitation', _invitationDataUrl);
  save('lang', _currentLang);
  save('theme', _currentTheme);
  save('themeIndex', _themeIndex);
}

function loadAll() {
  _guests = load('guests') || [];
  _tables = load('tables') || [];
  const savedWedding = load('wedding');
  _weddingInfo = savedWedding ? { ..._weddingDefaults, ...savedWedding } : { ..._weddingDefaults };
  _invitationDataUrl = load('invitation') || '';
  _currentLang  = load('lang')       || 'he';
  _currentTheme = load('theme')      || '';
  _themeIndex   = load('themeIndex') || 0;
  migrateGuests();
}

/* ── Data Migration v1 → v1.1 ── */
function migrateGuests() {
  let changed = false;
  _guests.forEach(function(g) {
    // Migrate old 'name' field to firstName
    if (g.name !== undefined && g.firstName === undefined) {
      g.firstName = g.name; g.lastName = ''; delete g.name; changed = true;
    }
    if (g.side         === undefined) { g.side         = 'mutual';  changed = true; }
    if (g.meal         === undefined) { g.meal         = 'regular'; changed = true; }
    if (g.email        === undefined) { g.email        = '';        changed = true; }
    if (g.children     === undefined) { g.children     = 0;        changed = true; }
    if (g.accessibility=== undefined) { g.accessibility= false;    changed = true; }
    if (g.relationship === undefined) { g.relationship = '';        changed = true; }
    if (g.mealNotes    === undefined) { g.mealNotes    = '';        changed = true; }
    if (g.rsvpDate     === undefined) { g.rsvpDate     = '';        changed = true; }
    if (g.gift         === undefined) { g.gift         = '';        changed = true; }
    if (g.updatedAt    === undefined) { g.updatedAt    = g.createdAt || ''; changed = true; }
  });
  if (changed) save('guests', _guests);
}

