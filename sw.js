// =============================================================================
// Service Worker — Wedding Manager v1.1.0
// APP_SHELL pre-cache + offline fallback
// =============================================================================
'use strict';

const CACHE_NAME = 'wedding-v1.1.0';
const APP_SHELL = [
  './',
  './index.html',
  './icon.svg',
  './manifest.json',
];

// Install: pre-cache app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
});

// Activate: clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell, network-first for others
self.addEventListener('fetch', function(e) {
  const url = new URL(e.request.url);

  // Skip non-GET and cross-origin
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Only cache successful same-origin responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    }).catch(function() {
      // Offline fallback: return cached index
      return caches.match('./index.html');
    })
  );
});

// Skip waiting on message
self.addEventListener('message', function(e) {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
