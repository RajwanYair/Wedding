'use strict';

/* ── Navigation ── */
/* ── Navigation ── */
function showSection(name) {
  // Block non-admin users from accessing admin-only sections (security guard)
  const adminOnly = ['dashboard', 'guests', 'tables', 'invitation', 'whatsapp', 'budget', 'analytics', 'settings'];
  if (_authUser && !_authUser.isAdmin && adminOnly.includes(name)) return;
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  const sec = document.getElementById('sec-' + name);
  if (sec) sec.classList.add('active');

  document.querySelectorAll('.nav-tab').forEach(function(tab) {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === name);
  });

  if (name === 'whatsapp')  { updateWaPreview(); renderWaGuestList(); }
  if (name === 'tables')    { renderTables(); renderUnassignedGuests(); }
  if (name === 'budget')    { renderBudget(); }
  if (name === 'analytics') { renderAnalytics(); }
  if (name === "settings") {
    renderDataSummary();
    renderUserManager();
    renderSheetsSettings();
  }
}

