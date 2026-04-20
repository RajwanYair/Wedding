// =============================================================================
// Service Worker — Wedding Manager v10.0.0
// Stale-while-revalidate · offline fallback · Background Sync · update detection
// =============================================================================
"use strict";

const CACHE_NAME = "wedding-v10.0.0";
// Static assets to pre-cache. Vite-built JS/CSS have hashed filenames and are
// cached on first fetch by the non-shell handler (cache-first with network fallback).
const APP_SHELL = [
  "/Wedding/CHANGELOG.md",
  "/Wedding/_headers",
  "/Wedding/assets/app-badge-Bc-rbLLh.js",
  "/Wedding/assets/chunk-public-DjmSLvar.js",
  "/Wedding/assets/chunk-services-BJ7fXmoG.css",
  "/Wedding/assets/chunk-services-BKJYPJTm.js",
  "/Wedding/assets/conflictModal-C_b-kZ-o.js",
  "/Wedding/assets/expenseModal-BfDlhz6L.js",
  "/Wedding/assets/galleryLightbox-HZYD2gG6.js",
  "/Wedding/assets/guest-token-Bw7jTdhm.js",
  "/Wedding/assets/guestModal-DegAVVAE.js",
  "/Wedding/assets/he-Bsabitfs.js",
  "/Wedding/assets/index-CUdlFfeE.js",
  "/Wedding/assets/index-ozMb7pq8.css",
  "/Wedding/assets/locale-ar-BLZUZAm1.js",
  "/Wedding/assets/locale-en-CnWN9Ygo.js",
  "/Wedding/assets/locale-ru-CQ1kOYqU.js",
  "/Wedding/assets/network-status-BUPQ17Sv.js",
  "/Wedding/assets/nfc-Cn9cbGmz.js",
  "/Wedding/assets/rolldown-runtime-lhHHWwHU.js",
  "/Wedding/assets/sec-analytics-BZAjN-g8.js",
  "/Wedding/assets/sec-budget-dHjsmOc_.js",
  "/Wedding/assets/sec-changelog-r9m95MYL.js",
  "/Wedding/assets/sec-checkin-DekqdlQ6.js",
  "/Wedding/assets/sec-dashboard-X-E9IbLt.js",
  "/Wedding/assets/sec-expenses-DUSNvvel.js",
  "/Wedding/assets/sec-gallery-CKhyJbbs.js",
  "/Wedding/assets/sec-guests-BfTVIr7g.js",
  "/Wedding/assets/sec-invitation-DUQUP8wR.js",
  "/Wedding/assets/sec-settings-B_683r6T.js",
  "/Wedding/assets/sec-tables-B3_vB0l6.js",
  "/Wedding/assets/sec-timeline-Bff5gZsP.js",
  "/Wedding/assets/sec-vendors-D4wtoBWC.js",
  "/Wedding/assets/sec-whatsapp-CFYaf6Sv.js",
  "/Wedding/assets/sheets-impl-BxDKs9nz.js",
  "/Wedding/assets/shortcutsModal-DZ4AQKqj.js",
  "/Wedding/assets/supabase-DWh_IB-d.js",
  "/Wedding/assets/supabase-client-trs4tfHY.js",
  "/Wedding/assets/supabase-realtime-DJiwtIHc.js",
  "/Wedding/assets/tableModal-Dddhq7PO.js",
  "/Wedding/assets/template-analytics-CDgFJiAq.js",
  "/Wedding/assets/template-budget-DHiX88fg.js",
  "/Wedding/assets/template-changelog-CnINrAwU.js",
  "/Wedding/assets/template-checkin-BmpwB936.js",
  "/Wedding/assets/template-communication-DStUNbgH.js",
  "/Wedding/assets/template-contact-form-BmmuEajy.js",
  "/Wedding/assets/template-dashboard-CmZQ8K0R.js",
  "/Wedding/assets/template-gallery-IN8a2lD5.js",
  "/Wedding/assets/template-guest-landing-CIBMygWE.js",
  "/Wedding/assets/template-guests-DZ1KKSbc.js",
  "/Wedding/assets/template-invitation-c_cSimh7.js",
  "/Wedding/assets/template-landing-CxOT1_Dp.js",
  "/Wedding/assets/template-registry-7H6b6lym.js",
  "/Wedding/assets/template-rsvp-61H3O7DS.js",
  "/Wedding/assets/template-settings-Nqnvaoyn.js",
  "/Wedding/assets/template-tables-D8U8gVSI.js",
  "/Wedding/assets/template-timeline-BexsydYl.js",
  "/Wedding/assets/template-vendors-BqxrrkpT.js",
  "/Wedding/assets/template-whatsapp-CHkXTX3K.js",
  "/Wedding/assets/timelineModal-BWS17yvx.js",
  "/Wedding/assets/vendorModal-DArxQM-f.js",
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
              return k !== CACHE_NAME;
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

// ── Fetch: stale-while-revalidate for app shell ───────────────────────────────
self.addEventListener("fetch", function (e) {
  const url = new URL(e.request.url);

  // Only handle same-origin GETs
  if (e.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  const isShell = getShellUrls().has(url.href);

  if (isShell) {
    // Stale-while-revalidate: respond from cache instantly; refresh cache in background.
    // If the server signals new content (ETag/Last-Modified changed), notify all clients.
    e.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(e.request).then(function (cached) {
          const networkUpdate = fetch(e.request)
            .then(function (response) {
              if (response.status === 200) {
                const newV = freshnessToken(response);
                const oldV = cached ? freshnessToken(cached) : "";
                // Notify when: no previous cache (first fetch), or freshness token changed.
                // 'Date' always differs on each response so we only use it as a fallback
                // when ETag and Last-Modified are both absent, meaning we signal once.
                if (!cached || (newV && newV !== oldV)) notifyClients();
                cache.put(e.request, response.clone());
              }
              return response;
            })
            .catch(function () {
              return cached || caches.match("./index.html");
            });
          // Serve stale cache immediately; background revalidation runs regardless
          return cached || networkUpdate;
        });
      }),
    );
  } else {
    // Non-shell resources: cache-first, fetch on miss
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
          // For navigation requests, serve branded offline page
          if (e.request.mode === "navigate") {
            return caches.match("./offline.html");
          }
          return caches.match("./index.html");
        }),
    );
  }
});

// ── Background Sync: flush offline RSVP queue ────────────────────────────────
// Tags: "rsvp-sync" (registered by rsvp.js when submission occurs offline)
const RSVP_SYNC_TAG = "rsvp-sync";

self.addEventListener("sync", function (e) {
  if (e.tag === RSVP_SYNC_TAG) {
    e.waitUntil(
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then(function (clients) {
          clients.forEach(function (c) {
            c.postMessage({ type: "RSVP_SYNC_READY" });
          });
        }),
    );
  }
});

// ── Message: SKIP_WAITING — new SW takes over immediately ────────────────────
self.addEventListener("message", function (e) {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
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
