'use strict';

/* ── App Init ── */
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
  initAuth();
}

init();

// Called by Google Identity Services SDK once it finishes loading
window.onGoogleLibraryLoad = function() {
  initGoogleSignIn();
};
