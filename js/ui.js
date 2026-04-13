'use strict';

/* ── UI: i18n Engine, Theme, Modal, Toast ── */
/* ── i18n Engine ── */
function t(key) {
  return (I18N[_currentLang] && I18N[_currentLang][key]) || key;
}

function applyLanguage() {
  const lang = _currentLang;
  const dir  = lang === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir  = dir;

  document.querySelectorAll('[data-i18n]').forEach(function(node) {
    const key = node.getAttribute('data-i18n');
    const val = t(key);
    if (val !== key) node.textContent = val;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(node) {
    const key = node.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val !== key) node.placeholder = val;
  });
  document.querySelectorAll('[data-i18n-tooltip]').forEach(function(node) {
    const key = node.getAttribute('data-i18n-tooltip');
    const val = t(key);
    if (val !== key) node.setAttribute('data-tooltip', val);
  });

  const btnLang = document.getElementById('btnLang');
  if (btnLang) btnLang.textContent = lang === 'he' ? 'EN' : 'עב';

  renderGuests();
  renderTables();
  renderStats();
  updateWaPreview();
  renderWaGuestList();
  updateTopBar();
}

function toggleLanguage() {
  _currentLang = _currentLang === 'he' ? 'en' : 'he';
  applyLanguage();
  saveAll();
}

/* ── Theme ── */
function cycleTheme() {
  _themeIndex   = (_themeIndex + 1) % THEMES.length;
  _currentTheme = THEMES[_themeIndex];
  document.body.className = _currentTheme;
  saveAll();
}


/* ── Modal ── */
function openModal(id) {
  const o = document.getElementById(id);
  if (o) o.classList.add('active');
}
function closeModal(id) {
  const o = document.getElementById(id);
  if (o) o.classList.remove('active');
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(function(m) { m.classList.remove('active'); });
});
document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.classList.remove('active'); });
});

/* ── Toast ── */
function showToast(msg, type) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const icon = icons[type] || icons.info;
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type || '');
  toast.textContent = icon + ' ' + msg;
  el.toastContainer.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}

/* ── Print ── */
function printGuests() { window.print(); }

/* ── Update Banner ── */
/** Show a persistent top banner prompting the user to reload for new content. */
function showUpdateBanner() {
  if (document.getElementById('updateBanner')) return; // already visible
  const banner = document.createElement('div');
  banner.id = 'updateBanner';
  banner.className = 'update-banner';

  const msg = document.createElement('span');
  msg.className = 'update-banner-msg';
  msg.textContent = t('sw_update_msg');

  const btn = document.createElement('button');
  btn.className = 'btn btn-primary update-banner-btn';
  btn.textContent = t('sw_update_btn');
  btn.addEventListener('click', function() { applyUpdate(); });

  const dismiss = document.createElement('button');
  dismiss.className = 'update-banner-dismiss';
  dismiss.textContent = '\u00d7';
  dismiss.setAttribute('aria-label', 'Dismiss update notification');
  dismiss.addEventListener('click', function() { banner.remove(); });

  banner.appendChild(msg);
  banner.appendChild(btn);
  banner.appendChild(dismiss);
  document.body.appendChild(banner);
}

