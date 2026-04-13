'use strict';

/* ── App Init ── */

// Tracks the new Service Worker waiting to take over (set by initSW)
let _pendingSW = null;
// Prevents multiple reloads when the controller changes
let _swRefreshing = false;

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
  initSW();
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

/** Register the service worker, show an update banner when a new version is
 *  detected, and poll for updates every 5 minutes while the page is open. */
function initSW() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js').then(function(reg) {
    // A new SW may already be waiting (e.g. user had the page open during deploy)
    if (reg.waiting) {
      _pendingSW = reg.waiting;
      showUpdateBanner();
    }

    // Watch for a new SW being installed
    reg.addEventListener('updatefound', function() {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener('statechange', function() {
        // New SW finished installing and is waiting to activate
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          _pendingSW = sw;
          showUpdateBanner();
        }
      });
    });

    // Poll for a new SW every 5 minutes (triggers browser re-fetch of sw.js)
    function scheduleUpdateCheck() {
      setTimeout(function() {
        reg.update().catch(function() {});
        scheduleUpdateCheck();
      }, 5 * 60 * 1000);
    }
    scheduleUpdateCheck();
  }).catch(function(err) {
    console.warn('SW registration failed:', err);
  });

  // SW signals a content-level change detected via ETag comparison
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'UPDATE_AVAILABLE') {
      showUpdateBanner();
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

// Called by Google Identity Services SDK once it finishes loading
window.onGoogleLibraryLoad = function() {
  initGoogleSignIn();
};

