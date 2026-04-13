'use strict';

/* ── App Init ── */

// Tracks the new Service Worker waiting to take over (set by initSW)
let _pendingSW = null;
// Prevents multiple reloads when the controller changes
let _swRefreshing = false;
// Epoch when the page first loaded — used to decide auto-refresh vs banner
const _pageOpenedAt = Date.now();
// Timestamp when the tab was last hidden (used by visibilitychange handler)
let _hiddenAt = 0;
// Cached SW registration for on-demand update checks (e.g. tab refocus)
let _swReg = null;
// Minimum age (ms) before an update triggers automatic reload instead of banner
const _AUTO_REFRESH_AFTER_MS = 5 * 60 * 1000;

function init() {
  loadAll();
  if (_currentTheme) document.body.className = _currentTheme;
  applyLanguage();
  loadWeddingDetailsToForm();
  renderStats();
  renderGuests();
  renderTables();
  renderInvitation();
  renderCountdown();
  updateWaPreview();
  updateTopBar();
  updateHeaderInfo();
  initParticles();
  setInterval(renderCountdown, 1000);
  renderBudget();
  initAuth();
  loadFBSDK();
  loadAppleSDK();
  initSW();
  /* Load primary data from Google Sheets (public read, no auth) */
  loadFromSheetsOnInit();
  /* Start 30-second auto-sync polling for remote changes */
  startSheetsAutoSync();
}

/** Applies the queued update: tells the waiting SW to skip waiting (which
 *  triggers controllerchange → page reload), or falls back to a hard reload. */
function applyUpdate() {
  if (_pendingSW) {
    _pendingSW.postMessage('SKIP_WAITING');
    // controllerchange listener below will reload the page
  } else {
    window.location.reload();
  }
}

/**
 * Decides whether to auto-refresh or show the update banner.
 * If the page has been open for at least _AUTO_REFRESH_AFTER_MS, reload
 * silently — the user has been away long enough that a refresh is harmless.
 * Otherwise surface the banner so they can save any in-progress work first.
 */
function _handleUpdateDetected() {
  if (Date.now() - _pageOpenedAt >= _AUTO_REFRESH_AFTER_MS) {
    applyUpdate();
  } else {
    showUpdateBanner();
  }
}

/** Register the service worker, show an update banner when a new version is
 *  detected, and poll for updates every 5 minutes while the page is open. */
function initSW() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js').then(function(reg) {
    _swReg = reg;

    // A new SW may already be waiting (e.g. user had the page open during deploy)
    if (reg.waiting) {
      _pendingSW = reg.waiting;
      _handleUpdateDetected();
    }

    // Watch for a new SW being installed
    reg.addEventListener('updatefound', function() {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', function() {
        // New SW finished installing and is waiting to activate
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          _pendingSW = sw;
          _handleUpdateDetected();
        }
      });
    });

    // Poll for a new SW every 5 minutes (triggers browser re-fetch of sw.js)
    setInterval(function() { reg.update().catch(function() {}); }, _AUTO_REFRESH_AFTER_MS);
  }).catch(function(err) {
    console.warn('SW registration failed:', err);
  });

  // SW signals a content-level change detected during background revalidation
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'UPDATE_AVAILABLE') {
      _handleUpdateDetected();
    }
  });

  // When the tab regains focus after being hidden for ≥ 5 minutes, immediately
  // ask the SW to re-check for updates so stale-open tabs refresh quickly.
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      _hiddenAt = Date.now();
    } else if (_hiddenAt && (Date.now() - _hiddenAt) >= _AUTO_REFRESH_AFTER_MS) {
      if (_swReg) _swReg.update().catch(function() {});
    }
  });

  // Once the new SW has taken control, reload to serve fresh files
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (_swRefreshing) return;
    _swRefreshing = true;
    window.location.reload();
  });
}

init();

/* Google Identity Services calls this after its SDK loads */
window.onGoogleLibraryLoad = function() { initGoogleSignIn(); };

