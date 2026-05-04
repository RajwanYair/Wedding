// =============================================================================
// Service Worker — Wedding Manager v31.3.0
// S401 — Strategy cache patterns:
//   · Cache-first     — fonts/icons (immutable CDN assets)
//   · Network-first   — Supabase API (data freshness; cache as offline fallback)
//   · Stale-while-revalidate — app shell (HTML/manifest/offline page)
//   · Cache-first     — Vite-hashed JS/CSS/assets (content-addressed, never change)
//   · Background Sync · update detection
// =============================================================================
"use strict";

const CACHE_NAME = "wedding-v31.3.0";
const FONT_CACHE  = "wedding-fonts-v1";   // immutable; cleared only on SW uninstall
const API_CACHE   = "wedding-api-v1";     // network-first; stale data served offline
// Static assets to pre-cache. Vite-built JS/CSS have hashed filenames and are
// cached on first fetch by the non-shell handler (cache-first with network fallback).
const APP_SHELL = [
  "/Wedding/404.html",
  "/Wedding/CHANGELOG.md",
  "/Wedding/_headers",
  "/Wedding/assets/ai-client-BK8ip335.js",
  "/Wedding/assets/analytics-4jtSpcrN.js",
  "/Wedding/assets/api-key-DjWYiaby.js",
  "/Wedding/assets/app-badge-DE7rDL1S.js",
  "/Wedding/assets/ar-D4cHaskJ.js",
  "/Wedding/assets/audit-log-CooYCgyK.js",
  "/Wedding/assets/budget-NiAcxl34.js",
  "/Wedding/assets/changelog-9q2QeUXI.js",
  "/Wedding/assets/checkin-BXqciKTB.js",
  "/Wedding/assets/compliance-CzjtfkcU.js",
  "/Wedding/assets/conflictModal-CctmB2Ns.js",
  "/Wedding/assets/contact-form-Be0pLWBG.js",
  "/Wedding/assets/dashboard-GcLUZ9yU.js",
  "/Wedding/assets/en-DqN2cwJ2.js",
  "/Wedding/assets/es-CJWUHXVE.js",
  "/Wedding/assets/expenseModal-DSPqri2J.js",
  "/Wedding/assets/fr-ycf746tU.js",
  "/Wedding/assets/gallery-BEjeIJXJ.js",
  "/Wedding/assets/galleryLightbox-Cv-wEVD9.js",
  "/Wedding/assets/guest-csv-import-Ddcr0kb-.js",
  "/Wedding/assets/guest-dedup-Pn0ZeGg0.js",
  "/Wedding/assets/guest-identity-Er53assf.js",
  "/Wedding/assets/guest-landing-B_jW5Y-U.js",
  "/Wedding/assets/guestModal-pNMFmqHc.js",
  "/Wedding/assets/guests-BYfuzkla.js",
  "/Wedding/assets/guests-D76TsOKu.js",
  "/Wedding/assets/guests-D8e6bIEB.js",
  "/Wedding/assets/he-CqauE7bL.js",
  "/Wedding/assets/i18n-DBdMwTX5.js",
  "/Wedding/assets/i18n-DNA5sOFX.js",
  "/Wedding/assets/index-DuuvU5nJ.js",
  "/Wedding/assets/index-E71pxdwd.css",
  "/Wedding/assets/invitation-BRROpNP8.js",
  "/Wedding/assets/landing-mpMsfznk.js",
  "/Wedding/assets/network-status-DkwfdD3m.js",
  "/Wedding/assets/observability-BUVKvqa_.js",
  "/Wedding/assets/onboarding-J7xahBjA.js",
  "/Wedding/assets/pdf-export-cfVGSz8s.js",
  "/Wedding/assets/phone-C-wY_HZ9.js",
  "/Wedding/assets/preload-helper-RYSt_V-Q.js",
  "/Wedding/assets/print-qW81-9tw.css",
  "/Wedding/assets/printPreviewModal-BU3WcDnh.js",
  "/Wedding/assets/registry-mgB0-v6s.js",
  "/Wedding/assets/router-C8sMTeB0.js",
  "/Wedding/assets/router-vQB_ewOx.js",
  "/Wedding/assets/rsvp-CLSA9Xgg.js",
  "/Wedding/assets/ru-DXjZCL5F.js",
  "/Wedding/assets/run-of-show-BqLOW3AG.js",
  "/Wedding/assets/search-handler-7j-9Vc_3.js",
  "/Wedding/assets/searchModal-Cat3E34w.js",
  "/Wedding/assets/security-1JG0CvPb.js",
  "/Wedding/assets/settings-DjFtvs-s.js",
  "/Wedding/assets/sheets-DUXMDV8P.js",
  "/Wedding/assets/sheets-tbRBn5Ws.js",
  "/Wedding/assets/shortcutsModal-kCKNammF.js",
  "/Wedding/assets/storage-sT9Wr9QC.js",
  "/Wedding/assets/store-DeN0TO5b.js",
  "/Wedding/assets/supabase-BobegfCz.js",
  "/Wedding/assets/supabase-client-C1_sRDo-.js",
  "/Wedding/assets/supabase-client-ZarHpEYH.js",
  "/Wedding/assets/tableModal-DJ9c_2Vc.js",
  "/Wedding/assets/tables-ffPfx9HT.js",
  "/Wedding/assets/timeline-C4G1P-0W.js",
  "/Wedding/assets/timelineModal-CtK-4HZM.js",
  "/Wedding/assets/ui-BlXpSM3N.js",
  "/Wedding/assets/ui-CW4t9WgB.js",
  "/Wedding/assets/vendorModal-EhEMCFq6.js",
  "/Wedding/assets/vendors-IwdwPfkM.js",
  "/Wedding/assets/webauthn-DkLuqyFA.js",
  "/Wedding/assets/webhooks-DNNs5HUX.js",
  "/Wedding/assets/website-builder-DeWlQSbY.js",
  "/Wedding/assets/whatsapp-wiPqHUDv.js",
  "/Wedding/icon-192.png",
  "/Wedding/icon-512.png",
  "/Wedding/icon.svg",
  "/Wedding/index.html",
  "/Wedding/invitation.jpg",
  "/Wedding/manifest.json",
  "/Wedding/offline.html",
  "/Wedding/wedding.json",
];

// Lazily-resolved Set of fully-qualified app-shell URLs
let _shellUrls = null;
function getShellUrls() {
  if (!_shellUrls) {
    const base = self.registration.scope;
    _shellUrls = new Set(
      APP_SHELL.map(function (p) {
        return new URL(p, base).href;
      }),
    );
  }
  return _shellUrls;
}

// Broadcast UPDATE_AVAILABLE to all window clients (deduplicated per SW activation)
let _updateNotified = false;
function notifyClients() {
  if (_updateNotified) return;
  _updateNotified = true;
  self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then(function (clients) {
      clients.forEach(function (c) {
        c.postMessage({ type: "UPDATE_AVAILABLE" });
      });
    });
}

/** Extract the best available freshness token from a Response */
function freshnessToken(response) {
  return (
    response.headers.get("ETag") ||
    response.headers.get("Last-Modified") ||
    response.headers.get("Date") ||
    ""
  );
}

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }),
  );
});

// ── Activate: remove stale caches, claim all clients ─────────────────────────
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              // Keep the current app-shell cache, font cache, and API cache
              return k !== CACHE_NAME && k !== FONT_CACHE && k !== API_CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

// ── Fetch: strategy routing ──────────────────────────────────────────────────
self.addEventListener("fetch", function (e) {
  const url = new URL(e.request.url);

  // Only handle GET requests
  if (e.request.method !== "GET") return;

  // ── Strategy 1: Cache-first — fonts and icon CDN assets ───────────────────
  // Google Fonts, gstatic, or icon CDN: immutable, never expire.
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com" ||
    url.hostname === "cdnjs.cloudflare.com" ||
    url.hostname === "cdn.jsdelivr.net"
  ) {
    e.respondWith(
      caches.open(FONT_CACHE).then(function (cache) {
        return cache.match(e.request).then(function (cached) {
          if (cached) return cached;
          return fetch(e.request).then(function (response) {
            if (response.status === 200) cache.put(e.request, response.clone());
            return response;
          });
        });
      }),
    );
    return;
  }

  // ── Strategy 2: Network-first — Supabase REST / realtime API ──────────────
  // Try network; serve stale on offline so dashboards still render.
  if (url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.io")) {
    e.respondWith(
      fetch(e.request)
        .then(function (response) {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(API_CACHE).then(function (cache) { cache.put(e.request, clone); });
          }
          return response;
        })
        .catch(function () {
          return caches.match(e.request, { cacheName: API_CACHE });
        }),
    );
    return;
  }

  // ── Same-origin only below ─────────────────────────────────────────────────
  if (url.origin !== self.location.origin) return;

  const isShell = getShellUrls().has(url.href);
  // Vite-hashed assets: filenames contain a hex digest (e.g., index-BcXyz123.js)
  const isHashedAsset = /\.[0-9a-f]{8,}\.(js|css|woff2?|png|svg|webp)$/i.test(url.pathname);

  if (isShell) {
    // ── Strategy 3: Stale-while-revalidate — app shell ──────────────────────
    // Respond from cache instantly; refresh cache in background.
    // Notify clients when ETag/Last-Modified changes (new deployment).
    e.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(e.request).then(function (cached) {
          const networkUpdate = fetch(e.request)
            .then(function (response) {
              if (response.status === 200) {
                const newV = freshnessToken(response);
                const oldV = cached ? freshnessToken(cached) : "";
                if (!cached || (newV && newV !== oldV)) notifyClients();
                cache.put(e.request, response.clone());
              }
              return response;
            })
            .catch(function () {
              return cached || caches.match("./index.html");
            });
          return cached || networkUpdate;
        });
      }),
    );
  } else if (isHashedAsset) {
    // ── Strategy 4: Cache-first — Vite-hashed JS/CSS (content-addressed) ────
    // These filenames never repeat across builds; safe to cache forever.
    e.respondWith(
      caches.match(e.request).then(function (cached) {
        if (cached) return cached;
        return fetch(e.request).then(function (response) {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(e.request, clone); });
          }
          return response;
        });
      }).catch(function () {
        if (e.request.mode === "navigate") return caches.match("./offline.html");
        return caches.match("./index.html");
      }),
    );
  } else {
    // ── Strategy 5: Cache-first — other same-origin assets ───────────────────
    e.respondWith(
      caches
        .match(e.request)
        .then(function (cached) {
          if (cached) return cached;
          return fetch(e.request).then(function (response) {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(function (cache) {
                cache.put(e.request, clone);
              });
            }
            return response;
          });
        })
        .catch(function () {
          if (e.request.mode === "navigate") return caches.match("./offline.html");
          return caches.match("./index.html");
        }),
    );
  }
});

// ── IndexedDB helpers for sync queue ─────────────────────────────────────────
const IDB_NAME = "wedding-sync-queue";
const IDB_VERSION = 1;
const IDB_STORE = "pending";

function openSyncDb() {
  return new Promise(function (resolve, reject) {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = function (e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = function (e) { resolve(e.target.result); };
    req.onerror = function (e) { reject(e.target.error); };
  });
}

function idbGetAll(db) {
  return new Promise(function (resolve, reject) {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = function (e) { resolve(e.target.result); };
    req.onerror = function (e) { reject(e.target.error); };
  });
}

function idbDelete(db, id) {
  return new Promise(function (resolve, reject) {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const req = tx.objectStore(IDB_STORE).delete(id);
    req.onsuccess = function () { resolve(); };
    req.onerror = function (e) { reject(e.target.error); };
  });
}

/** Flush all pending sync records, notifying window clients to retry them. */
function flushQueue(tag) {
  return openSyncDb()
    .then(function (db) {
      return idbGetAll(db).then(function (items) {
        const tagItems = items.filter(function (item) { return item.tag === tag; });
        if (tagItems.length === 0) return;
        return self.clients
          .matchAll({ type: "window", includeUncontrolled: true })
          .then(function (clients) {
            const type =
              tag === "rsvp-sync" ? "RSVP_SYNC_READY" : "WRITE_SYNC_READY";
            return Promise.all(
              tagItems.map(function (item) {
                clients.forEach(function (c) {
                  c.postMessage({ type, payload: item.payload });
                });
                // Remove the flushed item after notifying clients
                return idbDelete(db, item.id);
              }),
            );
          });
      });
    });
}

// ── Background Sync: flush offline RSVP / write queue ────────────────────────
// Tags: "rsvp-sync"  — registered by rsvp.js when submission occurs offline
//       "write-sync" — registered by enqueueWrite() when Sheets sync fails
const RSVP_SYNC_TAG = "rsvp-sync";
const WRITE_SYNC_TAG = "write-sync";

self.addEventListener("sync", function (e) {
  if (e.tag === RSVP_SYNC_TAG || e.tag === WRITE_SYNC_TAG) {
    e.waitUntil(flushQueue(e.tag));
  }
});

// ── Periodic Background Sync (S563) ──────────────────────────────────────────
// Optional Chromium-only API that wakes the SW at most ~once/24 h to refresh
// caches (manifest, locale JSON, RSVP queue).  Registered by `src/core/ui.js`
// when permission is granted.  Other browsers ignore this listener.
const PERIODIC_REFRESH_TAG = "wedding-refresh";

self.addEventListener("periodicsync", function (e) {
  if (e.tag !== PERIODIC_REFRESH_TAG) return;
  e.waitUntil(
    Promise.all([
      flushQueue(RSVP_SYNC_TAG).catch(function () {}),
      flushQueue(WRITE_SYNC_TAG).catch(function () {}),
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.add("/Wedding/").catch(function () {});
      }),
    ]),
  );
});

// ── Message: SKIP_WAITING — new SW takes over immediately ────────────────────
// Also handles QUEUE_SYNC to add a pending item to IndexedDB.
self.addEventListener("message", function (e) {
  if (e.data === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (e.data && e.data.type === "QUEUE_SYNC") {
    // Client registers a payload for later retry; store in IndexedDB.
    openSyncDb()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          const tx = db.transaction(IDB_STORE, "readwrite");
          const req = tx.objectStore(IDB_STORE).add({
            tag: e.data.tag || WRITE_SYNC_TAG,
            payload: e.data.payload || null,
            ts: Date.now(),
          });
          req.onsuccess = function () { resolve(); };
          req.onerror = function (ev) { reject(ev.target.error); };
        });
      })
      .catch(function () { /* non-fatal */ });
  }
});
// ── Push: show notification to admin ────────────────────────────────────────────
self.addEventListener("push", function (e) {
  let data = {};
  if (e.data) {
    try {
      data = e.data.json();
    } catch (_) {
      data = { body: e.data.text() };
    }
  }
  const title = data.title || "Wedding Manager";
  const options = {
    body: data.body || "",
    icon: data.icon || "./icon-192.png",
    badge: "./icon-192.png",
    tag: "wedding-push",
    data,
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: focus or open window ────────────────────────────────
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clients) {
        for (let i = 0; i < clients.length; i++) {
          const c = clients[i];
          if (c.url && "focus" in c) return c.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow("./");
      }),
  );
});
