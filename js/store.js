// @ts-check
"use strict";
/* ── Reactive Store — Sprint 1.1 ──
 * Wraps app state with Proxy for automatic change detection,
 * debounced localStorage persistence, and subscriber notifications.
 *
 * Usage:
 *   initStore()                     — call once after loadAll()
 *   storeSubscribe('_guests', fn)   — listen for changes to _guests
 *   storeSubscribe('*', fn)         — listen for ALL state changes
 *   window._guests.push(g)          — auto-persists, notifies subscribers
 *   window._guests = [...]          — auto-persists, notifies subscribers
 */
(function () {
  /* ── Subscribers ── */
  const subs = new Map();

  function storeSubscribe(key, fn) {
    if (!subs.has(key)) subs.set(key, new Set());
    subs.get(key).add(fn);
    return function () {
      subs.get(key).delete(fn);
    };
  }

  /* Batched microtask notification — coalesces rapid-fire mutations (e.g. sort) */
  let notifyBatch = null;
  function scheduleNotify(key) {
    if (notifyBatch === null) {
      notifyBatch = new Set();
      Promise.resolve().then(function () {
        const batch = notifyBatch;
        notifyBatch = null;
        batch.forEach(function (k) {
          const fns = subs.get(k);
          if (fns)
            fns.forEach(function (f) {
              try {
                f(window[k]);
              } catch (_e) {}
            });
          const all = subs.get("*");
          if (all)
            all.forEach(function (f) {
              try {
                f(k, window[k]);
              } catch (_e) {}
            });
        });
      });
    }
    notifyBatch.add(key);
  }

  /* ── Debounced auto-persist ── */
  const persistMap = new Map(); // stateKey → localStorageKey
  const dirty = new Set();
  let saveTimer = null;

  function scheduleSave(key) {
    if (persistMap.has(key)) dirty.add(key);
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  }

  function flush() {
    const prefix = window.STORAGE_PREFIX || "wedding_v1_";
    dirty.forEach(function (key) {
      const storageKey = persistMap.get(key);
      if (storageKey) {
        try {
          localStorage.setItem(
            prefix + storageKey,
            JSON.stringify(window[key]),
          );
        } catch (_e) {}
      }
    });
    dirty.clear();
    saveTimer = null;
  }

  /* ── Proxy wrapper for arrays/objects ── */
  function wrap(val, key) {
    if (val === null || typeof val !== "object") return val;
    return new Proxy(val, {
      set (target, prop, v) {
        target[prop] = v;
        scheduleSave(key);
        scheduleNotify(key);
        return true;
      },
      deleteProperty (target, prop) {
        delete target[prop];
        scheduleSave(key);
        scheduleNotify(key);
        return true;
      },
    });
  }

  /* ── State schema: [windowPropertyName, localStorageKey | null] ── */
  const STATE_KEYS = [
    ["_guests", "guests"],
    ["_tables", "tables"],
    ["_weddingInfo", "wedding"],
    ["_invitationDataUrl", "invitation"],
    ["_currentLang", "lang"],
    ["_currentTheme", "theme"],
    ["_themeIndex", "themeIndex"],
    ["_isLightMode", "lightMode"],
    ["_timeline", "timeline"],
    ["_expenses", "expenses"],
    ["_gallery", "gallery"],
    ["_auditLog", "audit"],
    /* Non-persisted UI state */
    ["_currentFilter", null],
    ["_sideFilter", null],
    ["_sortCol", null],
    ["_sortAsc", null],
    ["_editingGuestId", null],
    ["_editingTableId", null],
    ["_editingTimelineId", null],
    ["_editingExpenseId", null],
    ["_authUser", null],
    ["_clientErrors", null],
  ];

  /**
   * Initialize the reactive store. Call once after loadAll().
   * Wraps all state variables with Proxy + Object.defineProperty.
   */
  function initStore() {
    STATE_KEYS.forEach(function (entry) {
      const name = entry[0];
      const storageKey = entry[1];
      if (storageKey) persistMap.set(name, storageKey);

      /* Snapshot current value and wrap objects/arrays */
      let val = window[name];
      if (val !== null && typeof val === "object") {
        val = wrap(val, name);
      }

      /* Replace property with reactive getter/setter */
      Object.defineProperty(window, name, {
        get () {
          return val;
        },
        set (v) {
          val = v !== null && typeof v === "object" ? wrap(v, name) : v;
          scheduleSave(name);
          scheduleNotify(name);
        },
        configurable: true,
        enumerable: true,
      });
    });
  }

  /* Force-flush any pending debounced saves (e.g. before page unload) */
  function storeFlush() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    flush();
  }

  /* ── Public API ── */
  window.initStore = initStore;
  window.storeSubscribe = storeSubscribe;
  window.storeFlush = storeFlush;
})();
