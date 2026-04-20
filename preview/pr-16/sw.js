// =============================================================================
// Service Worker — Wedding Manager v9.0.0
// Stale-while-revalidate · offline fallback · Background Sync · update detection
// =============================================================================
"use strict";

const CACHE_NAME = "wedding-v9.0.0";
// Static assets to pre-cache. Vite-built JS/CSS have hashed filenames and are
// cached on first fetch by the non-shell handler (cache-first with network fallback).
const APP_SHELL = [
  "/Wedding/CHANGELOG.md",
  "/Wedding/_headers",
  "/Wedding/assets/chunk-public-DB3hCcbv.js",
  "/Wedding/assets/chunk-services-BJ7fXmoG.css",
  "/Wedding/assets/chunk-services-BfUM0OAx.js",
  "/Wedding/assets/conflictModal-4wRjuhqI.js",
  "/Wedding/assets/expenseModal-BXvjiLJr.js",
  "/Wedding/assets/galleryLightbox-UUJWWpWR.js",
  "/Wedding/assets/guestModal-Be1031Wn.js",
  "/Wedding/assets/he-PIfz2Vj_.js",
  "/Wedding/assets/index-Crlrm5ZM.js",
  "/Wedding/assets/index-DpgwsurW.css",
  "/Wedding/assets/locale-ar-CkKMgMzf.js",
  "/Wedding/assets/locale-en-Q7pVcuX4.js",
  "/Wedding/assets/locale-ru-Chtn2pUk.js",
  "/Wedding/assets/rolldown-runtime-lhHHWwHU.js",
  "/Wedding/assets/sec-analytics-BfO5T_Dp.js",
  "/Wedding/assets/sec-budget-D0e9qOIY.js",
  "/Wedding/assets/sec-changelog-Cx9x2_Ml.js",
  "/Wedding/assets/sec-checkin-AObqI7Q9.js",
  "/Wedding/assets/sec-dashboard-y-g9CJyw.js",
  "/Wedding/assets/sec-expenses-Bo2J2oZ3.js",
  "/Wedding/assets/sec-gallery-BCCYI74j.js",
  "/Wedding/assets/sec-guests-CuMk8Lo3.js",
  "/Wedding/assets/sec-invitation-BDgbMNKW.js",
  "/Wedding/assets/sec-settings-UFfxuETs.js",
  "/Wedding/assets/sec-tables-PjPX6tT5.js",
  "/Wedding/assets/sec-timeline-OSkDhEXg.js",
  "/Wedding/assets/sec-vendors-CTLZ8PLs.js",
  "/Wedding/assets/sec-whatsapp-VPl4S3ZR.js",
  "/Wedding/assets/sheets-impl-DrE8Yydh.js",
  "/Wedding/assets/shortcutsModal-DsCQ32gZ.js",
  "/Wedding/assets/supabase-C2CHuYf9.js",
  "/Wedding/assets/supabase-client-Cep_I5iH.js",
  "/Wedding/assets/supabase-realtime-hYFnoxHV.js",
  "/Wedding/assets/tableModal-CS_BlBk9.js",
  "/Wedding/assets/template-analytics-C506ilFI.js",
  "/Wedding/assets/template-budget-D9BAxiCA.js",
  "/Wedding/assets/template-changelog-Dx7-9zrM.js",
  "/Wedding/assets/template-checkin-BMPB88aN.js",
  "/Wedding/assets/template-communication-CklYmMw6.js",
  "/Wedding/assets/template-contact-form-CdEIHWmE.js",
  "/Wedding/assets/template-dashboard-CAciBS_n.js",
  "/Wedding/assets/template-gallery-BsFBdPq7.js",
  "/Wedding/assets/template-guest-landing-CQzGS3s7.js",
  "/Wedding/assets/template-guests-CphOFYzg.js",
  "/Wedding/assets/template-invitation-C0ohm6RJ.js",
  "/Wedding/assets/template-landing-CnoFSOA2.js",
  "/Wedding/assets/template-registry-3wRfJbqW.js",
  "/Wedding/assets/template-rsvp-D3JHC169.js",
  "/Wedding/assets/template-settings-BYzGnjeT.js",
  "/Wedding/assets/template-tables-BFU0rU4_.js",
  "/Wedding/assets/template-timeline-Bnq4hYK_.js",
  "/Wedding/assets/template-vendors-b2gEcp2c.js",
  "/Wedding/assets/template-whatsapp-DSZpkwns.js",
  "/Wedding/assets/timelineModal-D9qVwzdu.js",
  "/Wedding/assets/vendorModal-C6vUjbCb.js",
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
