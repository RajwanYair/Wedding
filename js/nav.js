'use strict';

/* ── Navigation ── */
/* ── Navigation ── */
function showSection(name) {
  // Block non-admin users from accessing admin-only sections (security guard)
  const adminOnly = [
    "dashboard",
    "guests",
    "tables",
    "invitation",
    "whatsapp",
    "budget",
    "analytics",
    "checkin",
    "settings",
  ];
  if (_authUser && !_authUser.isAdmin && adminOnly.includes(name)) return;
  document.querySelectorAll(".section").forEach(function (s) {
    s.classList.remove("active");
  });
  const sec = document.getElementById("sec-" + name);
  if (sec) sec.classList.add("active");

  document.querySelectorAll(".nav-tab").forEach(function (tab) {
    tab.classList.toggle("active", tab.getAttribute("data-tab") === name);
  });

  if (name === "whatsapp") {
    updateWaPreview();
    renderWaGuestList();
  }
  if (name === "tables") {
    renderTables();
    renderUnassignedGuests();
  }
  if (name === "budget") {
    renderBudget();
    renderExpenses();
  }
  if (name === "analytics") {
    renderAnalytics();
  }
  if (name === "timeline") {
    renderTimeline();
  }
  if (name === "invitation") {
    renderVenueMap();
  }
  if (name === "landing") {
    renderGuestLanding();
  }
  if (name === "checkin") {
    renderCheckin();
  }
  if (name === "gallery") {
    renderGallery();
  }
  if (name === "tablefinder") {
    /* no initial render needed — driven by user input */
  }
  if (name === "settings") {
    renderDataSummary();
    renderUserManager();
    renderSheetsSettings();
    renderRsvpQr();
    renderRegistrySettings();
    renderContactSettings();
    renderAuditLog();
    renderErrorLog();
    renderEmailSettings();
    renderPushSettings();
  }
  if (name === "contact-form") {
    renderContactForm();
  }

  /* update URL hash */
  _routerPush(name);

  /* sync bottom-nav active state */
  document.querySelectorAll(".bottom-nav-item").forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === name);
  });
}

function toggleMobileNav() {
  const topNav = document.getElementById("navTabs");
  const btn = document.getElementById("btnMobileMore");
  if (!topNav) return;
  const isOpen = topNav.classList.toggle("mobile-nav-open");
  if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

