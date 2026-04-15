// @ts-check
"use strict";

/* ── Persistence (localStorage) ── */
/* ── Persistence (localStorage) ── */
function save(key, data) {
  try {
    localStorage.setItem(window.STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (_e) {}
}
function load(key) {
  try {
    const v = localStorage.getItem(window.STORAGE_PREFIX + key);
    return v ? JSON.parse(v) : null;
  } catch (_e) {
    return null;
  }
}

/**
 * Fetch wedding.json at startup and merge into window._weddingDefaults.
 * If there is already a user-saved weddingInfo in localStorage, those values
 * take precedence (they are re-applied in loadAll after this resolves).
 * Silent no-op on any fetch / parse error — hardcoded defaults remain.
 * @returns {Promise<void>}
 */
async function loadExternalConfig() {
  try {
    const resp = await fetch("./wedding.json");
    if (!resp.ok) {
      return;
    }
    const cfg = await resp.json();
    if (!cfg || typeof cfg !== "object") {
      return;
    }
    /* Strip the non-data comment key if present */
    delete cfg["_comment"];
    /* Merge public-config fields into defaults (don't overwrite known-sensitive keys) */
    const ALLOWED_KEYS = [
      "groom",
      "groomEn",
      "bride",
      "brideEn",
      "date",
      "hebrewDate",
      "time",
      "ceremonyTime",
      "venue",
      "address",
      "wazeLink",
      "giftBudget",
    ];
    ALLOWED_KEYS.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(cfg, k)) {
        window._weddingDefaults[k] = cfg[k];
      }
    });
    /* If the user has never saved custom wedding info, apply the new defaults now */
    if (!localStorage.getItem(`${window.STORAGE_PREFIX  }wedding`)) {
      window._weddingInfo = { ...window._weddingDefaults };
    }
  } catch (_e) {
    /* silent fallback to hardcoded window._weddingDefaults */
  }
}

function saveAll() {
  save("guests", window._guests);
  save("tables", window._tables);
  save("wedding", window._weddingInfo);
  save("invitation", window._invitationDataUrl);
  save("lang", window._currentLang);
  save("theme", window._currentTheme);
  save("themeIndex", window._themeIndex);
  save("lightMode", window._isLightMode);
  save("timeline", window._timeline);
  save("expenses", window._expenses);
  save("gallery", window._gallery);
  save("audit", window._auditLog);
  save("waTemplates", window._waTemplates);
  save("greenApiConfig", window._greenApiConfig);
  save("vendors", window._vendors);
}

function loadAll() {
  window._guests = load("guests") || [];
  window._tables = load("tables") || [];
  const savedWedding = load("wedding");
  window._weddingInfo = savedWedding
    ? { ...window._weddingDefaults, ...savedWedding }
    : { ...window._weddingDefaults };
  window._invitationDataUrl = load("invitation") || "";
  window._currentLang = load("lang") || "he";
  window._currentTheme = load("theme") || "";
  window._themeIndex = load("themeIndex") || 0;
  const savedLight = load("lightMode");
  window._isLightMode =
    savedLight !== null
      ? savedLight
      : window.matchMedia("(prefers-color-scheme: light)").matches;
  window._timeline = load("timeline") || [];
  window._expenses = load("expenses") || [];
  window._gallery = load("gallery") || [];
  window._auditLog = load("audit") || [];
  window._waTemplates = load("waTemplates") || {
    he: window.WA_DEFAULT_HE,
    en: window.WA_DEFAULT_EN,
  };
  window._greenApiConfig = load("greenApiConfig") || {
    instanceId: "",
    apiToken: "",
  };
  window._vendors = load("vendors") || [];
  migrateGuests();
}

/* ── Data Migration v1 → v1.1 ── */
function migrateGuests() {
  let changed = false;
  window._guests.forEach(function (g) {
    // Migrate old 'name' field to firstName
    if (g.name !== undefined && g.firstName === undefined) {
      g.firstName = g.name;
      g.lastName = "";
      delete g.name;
      changed = true;
    }
    if (g.side === undefined) {
      g.side = "mutual";
      changed = true;
    }
    if (g.meal === undefined) {
      g.meal = "regular";
      changed = true;
    }
    if (g.email === undefined) {
      g.email = "";
      changed = true;
    }
    if (g.children === undefined) {
      g.children = 0;
      changed = true;
    }
    if (g.accessibility === undefined) {
      g.accessibility = false;
      changed = true;
    }
    if (g.transport === undefined) {
      g.transport = "";
      changed = true;
    }
    if (g.relationship === undefined) {
      g.relationship = "";
      changed = true;
    }
    if (g.mealNotes === undefined) {
      g.mealNotes = "";
      changed = true;
    }
    if (g.rsvpDate === undefined) {
      g.rsvpDate = "";
      changed = true;
    }
    if (g.gift === undefined) {
      g.gift = "";
      changed = true;
    }
    if (g.updatedAt === undefined) {
      g.updatedAt = g.createdAt || "";
      changed = true;
    }
    if (g.arrived === undefined) {
      g.arrived = false;
      changed = true;
    }
    if (g.arrivedAt === undefined) {
      g.arrivedAt = null;
      changed = true;
    }
  });
  if (changed) save("guests", window._guests);
}
