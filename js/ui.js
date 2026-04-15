// @ts-check
"use strict";

/* ── UI: i18n Engine, Theme, Modal, Toast ── */
/* ── i18n Engine ── */
function t(key) {
  return (
    (window.I18N[window._currentLang] &&
      window.I18N[window._currentLang][key]) ||
    key
  );
}

async function applyLanguage() {
  await window.loadLocale(window._currentLang);
  const lang = window._currentLang;
  const dir = lang === "he" ? "rtl" : "ltr";
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;

  document.querySelectorAll("[data-i18n]").forEach(function (node) {
    const key = node.getAttribute("data-i18n");
    const val = t(key);
    if (val !== key) node.textContent = val;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) {
    const key = node.getAttribute("data-i18n-placeholder");
    const val = t(key);
    if (val !== key) node.placeholder = val;
  });
  document.querySelectorAll("[data-i18n-tooltip]").forEach(function (node) {
    const key = node.getAttribute("data-i18n-tooltip");
    const val = t(key);
    if (val !== key) node.setAttribute("data-tooltip", val);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(function (node) {
    const key = node.getAttribute("data-i18n-aria");
    const val = t(key);
    if (val !== key) node.setAttribute("aria-label", val);
  });

  const btnLang = document.getElementById("btnLang");
  if (btnLang) btnLang.textContent = lang === "he" ? "EN" : "עב";

  // Load the per-language WA template into the textarea
  if (window.el.waTemplate) {
    const tpl = window._waTemplates?.[lang];
    if (tpl !== undefined) {
      window.el.waTemplate.value = tpl;
      window.el.waTemplate.classList.toggle("u-direction-rtl", lang === "he");
    }
  }

  window.renderGuests();
  window.renderTables();
  window.renderStats();
  window.updateWaPreview();
  window.renderWaGuestList();
  window.updateTopBar();
}

async function toggleLanguage() {
  // Persist the current template before switching languages
  if (window.el.waTemplate) {
    window._waTemplates[window._currentLang] = window.el.waTemplate.value;
  }
  const newLang = window._currentLang === "he" ? "en" : "he";
  await window.loadLocale(newLang);
  window._currentLang = newLang;
  applyLanguage();
  window.saveAll();
}

/* ── Theme ── */
function cycleTheme() {
  window._themeIndex = (window._themeIndex + 1) % window.THEMES.length;
  window._currentTheme = window.THEMES[window._themeIndex];
  _applyThemeClasses();
  window.saveAll();
}

function toggleLightMode() {
  window._isLightMode = !window._isLightMode;
  _applyThemeClasses();
  const btn = document.getElementById("btnDarkLight");
  if (btn) btn.textContent = window._isLightMode ? "🌙" : "☀️";
  window.saveAll();
}

function _applyThemeClasses() {
  const classes = [
    window._currentTheme,
    window._isLightMode ? "light-mode" : "",
  ].filter(Boolean);
  document.body.className = classes.join(" ");
}

/* ── OS dark/light mode runtime listener ── */
window
  .matchMedia("(prefers-color-scheme: light)")
  .addEventListener("change", function (e) {
    if (window.load && window.load("lightMode") !== null) return;
    window._isLightMode = e.matches;
    _applyThemeClasses();
    const btn = document.getElementById("btnDarkLight");
    if (btn) btn.textContent = window._isLightMode ? "🌙" : "☀️";
  });

/* ── Modal ── */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function openModal(id) {
  const o = document.getElementById(id);
  if (!o) return;
  o.classList.add("active");
  o.removeAttribute("aria-hidden");
  o.setAttribute("aria-modal", "true");
  document.body.style.overflow = "hidden";
  /* Announce modal to screen readers — remember opener for later restore */
  _modalOpener = document.activeElement;
  /* focus first interactive element for keyboard / screen-reader users */
  requestAnimationFrame(function () {
    const first = o.querySelector(
      'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    );
    if (first) /** @type {HTMLElement} */ (first).focus();
  });
}

let _modalOpener = null; // last focused element before modal opened

function closeModal(id) {
  const o = document.getElementById(id);
  if (!o) return;
  o.classList.remove("active");
  o.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".modal-overlay.active")) {
    document.body.style.overflow = "";
    /* Restore focus to the element that triggered the modal */
    if (_modalOpener && typeof _modalOpener.focus === "function") {
      _modalOpener.focus();
      _modalOpener = null;
    }
  }
}
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.active").forEach(function (m) {
      m.classList.remove("active");
    });
    if (!document.querySelector(".modal-overlay.active"))
      document.body.style.overflow = "";
  }
  /* Focus trap — keep Tab cycling inside the active modal */
  if (e.key === "Tab") {
    const modal = document.querySelector(".modal-overlay.active .modal");
    if (!modal) return;
    const focusable = Array.from(modal.querySelectorAll(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
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
const _TOAST_DURATION = 3500; // ms

function showToast(msg, type) {
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  const icon = icons[type] || icons.info;
  const toastType = icons[type] ? type : "info";

  const toast = document.createElement("div");
  toast.className = `toast ${toastType}`;

  const iconSpan = document.createElement("span");
  iconSpan.textContent = icon;
  iconSpan.setAttribute("aria-hidden", "true");

  const msgSpan = document.createElement("span");
  msgSpan.textContent = msg;

  const progress = document.createElement("div");
  progress.className = "toast-progress";
  progress.style.animationDuration = `${_TOAST_DURATION}ms`;
  progress.style.animationName = "toast-progress-bar";

  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);
  toast.appendChild(progress);

  const container = window.el.toastContainer;
  if (container) container.appendChild(toast);

  /** Animate out then remove */
  function dismiss() {
    toast.classList.add("toast-out");
    toast.addEventListener(
      "animationend",
      function () {
        toast.remove();
      },
      { once: true },
    );
    // Fallback removal in case animationend never fires
    setTimeout(function () {
      toast.remove();
    }, 400);
  }

  const timer = setTimeout(dismiss, _TOAST_DURATION);

  // Allow clicking to dismiss early
  toast.addEventListener(
    "click",
    function () {
      clearTimeout(timer);
      dismiss();
    },
    { once: true },
  );
}

/* ── Print ── */
function printGuests() {
  window.print();
}

/** Populate hidden place-cards grid then print */
function printPlaceCards() {
  const grid = document.getElementById("placeCardsGrid");
  if (!grid) return;
  grid.replaceChildren();

  const seated = window._guests.filter(function (g) {
    return g.tableId;
  });
  seated
    .sort(function (a, b) {
      return (window.getTableName(a.tableId) || "").localeCompare(
        window.getTableName(b.tableId) || "",
      );
    })
    .forEach(function (g) {
      const card = document.createElement("div");
      card.className = "place-card";

      const nameEl = document.createElement("div");
      nameEl.className = "place-card-name";
      nameEl.textContent = window.guestFullName(g);

      const tableEl = document.createElement("div");
      tableEl.className = "place-card-table";
      tableEl.textContent = `${t("print_table")} ${window.getTableName(g.tableId)}`;

      const countEl = document.createElement("div");
      countEl.className = "place-card-count";
      const seats = (g.count || 1) + (g.children ? `+${g.children}` : "");
      if (seats !== "1") countEl.textContent = `${seats} ${t("print_seats")}`;

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
  grid.replaceChildren();

  window._tables.forEach(function (tbl, idx) {
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
    capEl.textContent = `${t("print_capacity")}: ${tbl.capacity || "—"}`;

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
  if (document.getElementById("updateBanner")) return; // already visible
  const banner = document.createElement("div");
  banner.id = "updateBanner";
  banner.className = "update-banner";

  const msg = document.createElement("span");
  msg.className = "update-banner-msg";
  msg.textContent = t("sw_update_msg");

  const btn = document.createElement("button");
  btn.className = "btn btn-primary update-banner-btn";
  btn.textContent = t("sw_update_btn");
  btn.addEventListener("click", function () {
    window.applyUpdate();
  });

  const dismiss = document.createElement("button");
  dismiss.className = "update-banner-dismiss";
  dismiss.textContent = "\u00d7";
  dismiss.setAttribute("aria-label", "Dismiss update notification");
  dismiss.addEventListener("click", function () {
    banner.remove();
  });

  banner.appendChild(msg);
  banner.appendChild(btn);
  banner.appendChild(dismiss);
  document.body.appendChild(banner);
}
