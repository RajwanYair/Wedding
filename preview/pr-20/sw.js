// =============================================================================
// Service Worker — Wedding Manager v11.16.0
// Stale-while-revalidate · offline fallback · Background Sync · update detection
// =============================================================================
"use strict";

const CACHE_NAME = "wedding-v11.16.0";
// Static assets to pre-cache. Vite-built JS/CSS have hashed filenames and are
// cached on first fetch by the non-shell handler (cache-first with network fallback).
const APP_SHELL = [
  "/Wedding/CHANGELOG.md",
  "/Wedding/_headers",
  "/Wedding/assets/analytics-BsEpR9lu.js",
  "/Wedding/assets/app-badge-yPBgZRF2.js",
  "/Wedding/assets/budget-BBji05al.js",
  "/Wedding/assets/changelog-B0DVy58H.js",
  "/Wedding/assets/checkin-DLFnQe_b.js",
  "/Wedding/assets/conflictModal-Dr002tSg.js",
  "/Wedding/assets/constants-B-FNLGOE.js",
  "/Wedding/assets/contact-form-iMuCNQV-.js",
  "/Wedding/assets/dashboard-2FdXzztD.js",
  "/Wedding/assets/en-CDkAVmlc.js",
  "/Wedding/assets/expenseModal-BO5Un0zW.js",
  "/Wedding/assets/gallery-DAtIdb4M.js",
  "/Wedding/assets/galleryLightbox-Ba4AKcw9.js",
  "/Wedding/assets/guest-landing-K8EGDITH.js",
  "/Wedding/assets/guest-token-cDBmavuS.js",
  "/Wedding/assets/guestModal-Dp0IYLz5.js",
  "/Wedding/assets/guests-D6z2F6Wb.js",
  "/Wedding/assets/he-u0BcKJbq.js",
  "/Wedding/assets/index-BYeGzOaG.css",
  "/Wedding/assets/index-YcX8K7ON.js",
  "/Wedding/assets/invitation-CAKa9w0n.js",
  "/Wedding/assets/landing-DkQ5bGJV.js",
  "/Wedding/assets/network-status-DFbPR84L.js",
  "/Wedding/assets/preload-helper-pK6g_zWx.js",
  "/Wedding/assets/print-B1NC0712.css",
  "/Wedding/assets/registry-BwLMoYsH.js",
  "/Wedding/assets/rsvp-Dh2sgp6q.js",
  "/Wedding/assets/settings-CZc7LYgB.js",
  "/Wedding/assets/sheets-impl-D95kwaKQ.js",
  "/Wedding/assets/shortcutsModal-JE6AHIw_.js",
  "/Wedding/assets/state-DHL4se0o.js",
  "/Wedding/assets/supabase-BmVdAVyH.js",
  "/Wedding/assets/supabase-client-BXW7sm1B.js",
  "/Wedding/assets/supabase-realtime-Cg31pfMq.js",
  "/Wedding/assets/tableModal-DrcT0qL5.js",
  "/Wedding/assets/tables-BONUrshC.js",
  "/Wedding/assets/timeline-Ba13mTD_.js",
  "/Wedding/assets/timelineModal-DU1vC9Gt.js",
  "/Wedding/assets/vendorModal-BDSH9dZ8.js",
  "/Wedding/assets/vendors-S2g-j8l1.js",
  "/Wedding/assets/whatsapp-BxIEfvAp.js",
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
