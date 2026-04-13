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
  _themeIndex = (_themeIndex + 1) % THEMES.length;
  _currentTheme = THEMES[_themeIndex];
  _applyThemeClasses();
  saveAll();
}

function toggleLightMode() {
  _isLightMode = !_isLightMode;
  _applyThemeClasses();
  const btn = document.getElementById("btnDarkLight");
  if (btn) btn.textContent = _isLightMode ? "🌙" : "☀️";
  saveAll();
}

function _applyThemeClasses() {
  const classes = [_currentTheme, _isLightMode ? "light-mode" : ""].filter(
    Boolean,
  );
  document.body.className = classes.join(" ");
}

/* ── Modal ── */
function openModal(id) {
  const o = document.getElementById(id);
  if (!o) return;
  o.classList.add("active");
  document.body.style.overflow = "hidden";
  /* focus first interactive element for keyboard / screen-reader users */
  requestAnimationFrame(function () {
    const first = o.querySelector(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    );
    if (first) first.focus();
  });
}
function closeModal(id) {
  const o = document.getElementById(id);
  if (!o) return;
  o.classList.remove("active");
  if (!document.querySelector(".modal-overlay.active"))
    document.body.style.overflow = "";
}
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.active").forEach(function (m) {
      m.classList.remove("active");
    });
    if (!document.querySelector(".modal-overlay.active"))
      document.body.style.overflow = "";
  }
});
document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      overlay.classList.remove("active");
      if (!document.querySelector(".modal-overlay.active"))
        document.body.style.overflow = "";
    }
  });
});

/* ── Toast ── */
function showToast(msg, type) {
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  const icon = icons[type] || icons.info;
  const toast = document.createElement("div");
  toast.className = "toast " + (type || "");
  toast.textContent = icon + " " + msg;
  el.toastContainer.appendChild(toast);
  setTimeout(function () {
    toast.remove();
  }, 3000);
}

/* ── Print ── */
function printGuests() {
  window.print();
}

/** Populate hidden place-cards grid then print */
function printPlaceCards() {
  const grid = document.getElementById("placeCardsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const seated = _guests.filter(function (g) {
    return g.tableId;
  });
  seated
    .sort(function (a, b) {
      return (getTableName(a.tableId) || "").localeCompare(
        getTableName(b.tableId) || "",
      );
    })
    .forEach(function (g) {
      const card = document.createElement("div");
      card.className = "place-card";

      const nameEl = document.createElement("div");
      nameEl.className = "place-card-name";
      nameEl.textContent = guestFullName(g);

      const tableEl = document.createElement("div");
      tableEl.className = "place-card-table";
      tableEl.textContent = t("print_table") + " " + getTableName(g.tableId);

      const countEl = document.createElement("div");
      countEl.className = "place-card-count";
      const seats = (g.count || 1) + (g.children ? "+" + g.children : "");
      if (seats !== "1") countEl.textContent = seats + " " + t("print_seats");

      card.appendChild(nameEl);
      card.appendChild(tableEl);
      if (seats !== "1") card.appendChild(countEl);
      grid.appendChild(card);
    });

  window.print();
}

/** Populate hidden table-signs grid then print */
function printTableSigns() {
  const grid = document.getElementById("tableSignsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  _tables.forEach(function (tbl, idx) {
    const sign = document.createElement("div");
    sign.className = "table-sign";

    const numEl = document.createElement("div");
    numEl.className = "table-sign-number";
    numEl.textContent = idx + 1;

    const nameEl = document.createElement("div");
    nameEl.className = "table-sign-name";
    nameEl.textContent = tbl.name;

    const capEl = document.createElement("div");
    capEl.className = "table-sign-capacity";
    capEl.textContent = t("print_capacity") + ": " + (tbl.capacity || "—");

    sign.appendChild(numEl);
    sign.appendChild(nameEl);
    sign.appendChild(capEl);
    grid.appendChild(sign);
  });

  window.print();
}

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

