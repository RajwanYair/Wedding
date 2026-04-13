// =============================================================================
// Service Worker — Wedding Manager v1.11.0
// Stale-while-revalidate for app shell + offline fallback + update detection
// =============================================================================
'use strict';

const CACHE_NAME = "wedding-v1.11.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./icon.svg",
  "./manifest.json",
  "./invitation.jpg",
  "./css/variables.css",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/responsive.css",
  "./css/auth.css",
  "./js/config.js",
  "./js/i18n.js",
  "./js/dom.js",
  "./js/state.js",
  "./js/utils.js",
  "./js/ui.js",
  "./js/nav.js",
  "./js/dashboard.js",
  "./js/guests.js",
  "./js/tables.js",
  "./js/invitation.js",
  "./js/whatsapp.js",
  "./js/rsvp.js",
  "./js/settings.js",
  "./js/sheets.js",
  "./js/auth.js",
  "./js/app.js",
];

// Lazily-resolved Set of fully-qualified app-shell URLs
let _shellUrls = null;
function getShellUrls() {
  if (!_shellUrls) {
    const base = self.registration.scope;
    _shellUrls = new Set(APP_SHELL.map(function(p) { return new URL(p, base).href; }));
  }
  return _shellUrls;
}

// Broadcast UPDATE_AVAILABLE to all window clients (once per SW lifetime)
let _updateNotified = false;
function notifyClients() {
  if (_updateNotified) return;
  _updateNotified = true;
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
    clients.forEach(function(c) { c.postMessage({ type: 'UPDATE_AVAILABLE' }); });
  });
}

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
});

// ── Activate: remove stale caches, claim all clients ─────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

// ── Fetch: stale-while-revalidate for app shell ───────────────────────────────
self.addEventListener('fetch', function(e) {
  const url = new URL(e.request.url);

  // Only handle same-origin GETs
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  const isShell = getShellUrls().has(url.href);

  if (isShell) {
    // Stale-while-revalidate: respond from cache instantly; refresh cache in background.
    // If the server signals new content (ETag/Last-Modified changed), notify all clients.
    e.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          const networkUpdate = fetch(e.request).then(function(response) {
            if (response.status === 200) {
              const newV = response.headers.get('ETag') || response.headers.get('Last-Modified') || '';
              const oldV = cached ? (cached.headers.get('ETag') || cached.headers.get('Last-Modified') || '') : '';
              if (cached && newV && newV !== oldV) notifyClients();
              cache.put(e.request, response.clone());
            }
            return response;
          }).catch(function() {
            return cached || caches.match('./index.html');
          });
          // Serve stale cache immediately; background revalidation runs regardless
          return cached || networkUpdate;
        });
      })
    );
  } else {
    // Non-shell resources: cache-first, fetch on miss
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
          }
          return response;
        });
      }).catch(function() {
        return caches.match('./index.html');
      })
    );
  }
});

// ── Message: SKIP_WAITING — new SW takes over immediately ────────────────────
self.addEventListener('message', function(e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

