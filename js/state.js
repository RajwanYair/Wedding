'use strict';

/* ── Persistence (localStorage) ── */
/* ── Persistence (localStorage) ── */
function save(key, data) {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data)); } catch (_e) {}
}
function load(key) {
  try { const v = localStorage.getItem(STORAGE_PREFIX + key); return v ? JSON.parse(v) : null; } catch (_e) { return null; }
}

/**
 * Fetch wedding.json at startup and merge into _weddingDefaults.
 * If there is already a user-saved weddingInfo in localStorage, those values
 * take precedence (they are re-applied in loadAll after this resolves).
 * Silent no-op on any fetch / parse error — hardcoded defaults remain.
 * @returns {Promise<void>}
 */
async function loadExternalConfig() {
  try {
    const resp = await fetch('./wedding.json');
    if (!resp.ok) { return; }
    const cfg = await resp.json();
    if (!cfg || typeof cfg !== 'object') { return; }
    /* Strip the non-data comment key if present */
    delete cfg['_comment'];
    /* Merge public-config fields into defaults (don't overwrite known-sensitive keys) */
    const ALLOWED_KEYS = [
      'groom', 'groomEn', 'bride', 'brideEn',
      'date', 'hebrewDate', 'time', 'ceremonyTime',
      'venue', 'address', 'wazeLink', 'giftBudget',
    ];
    ALLOWED_KEYS.forEach(function(k) {
      if (Object.prototype.hasOwnProperty.call(cfg, k)) {
        _weddingDefaults[k] = cfg[k];
      }
    });
    /* If the user has never saved custom wedding info, apply the new defaults now */
    if (!localStorage.getItem(STORAGE_PREFIX + 'wedding')) {
      _weddingInfo = { ..._weddingDefaults };
    }
  } catch (_e) { /* silent fallback to hardcoded _weddingDefaults */ }
}

function saveAll() {
  save("guests", _guests);
  save("tables", _tables);
  save("wedding", _weddingInfo);
  save("invitation", _invitationDataUrl);
  save("lang", _currentLang);
  save("theme", _currentTheme);
  save("themeIndex", _themeIndex);
  save("lightMode", _isLightMode);
  save("timeline", _timeline);
  save("expenses", _expenses);
  save("gallery", _gallery);
  save("audit", _auditLog);
}

function loadAll() {
  _guests = load("guests") || [];
  _tables = load("tables") || [];
  const savedWedding = load("wedding");
  _weddingInfo = savedWedding
    ? { ..._weddingDefaults, ...savedWedding }
    : { ..._weddingDefaults };
  _invitationDataUrl = load("invitation") || "";
  _currentLang = load("lang") || "he";
  _currentTheme = load("theme") || "";
  _themeIndex = load("themeIndex") || 0;
  const savedLight = load("lightMode");
  _isLightMode =
    savedLight !== null
      ? savedLight
      : window.matchMedia("(prefers-color-scheme: light)").matches;
  _timeline = load("timeline") || [];
  _expenses = load("expenses") || [];
  _gallery  = load("gallery")  || [];
  _auditLog = load("audit")    || [];
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
    if (g.arrived      === undefined) { g.arrived      = false;       changed = true; }
    if (g.arrivedAt    === undefined) { g.arrivedAt    = null;         changed = true; }
  });
  if (changed) save('guests', _guests);
}

