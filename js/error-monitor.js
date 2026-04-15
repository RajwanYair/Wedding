// @ts-check
"use strict";

/* ── Client Error Monitoring (Sprint 6.4) ────────────────────────────────────
   Catches unhandled JS errors and promise rejections. Stores them in
   localStorage (wedding_v1_errors, max 50) and surfaces them in the Settings
   page for the admin. Errors are also optionally posted to the Apps Script
   WebApp endpoint so the admin sees production errors without opening DevTools.
   ─────────────────────────────────────────────────────────────────────────── */

const _ERROR_MAX = 50;

/**
 * Store a client-side error entry (ring-buffer, max 50).
 * @param {{message, source, lineno, colno, stack}} errInfo
 */
function logClientError(errInfo) {
  const entry = {
    ts: new Date().toISOString(),
    message: String(errInfo.message || "Unknown error").slice(0, 300),
    source: String(errInfo.source || "")
      .replace(window.location.origin, "")
      .slice(0, 100),
    lineno: errInfo.lineno || 0,
    colno: errInfo.colno || 0,
    stack: String(errInfo.stack || "").slice(0, 500),
    page: window.location.hash || "/",
    ua: navigator.userAgent.slice(0, 100),
  };
  window._clientErrors.unshift(entry); /* newest first */
  if (window._clientErrors.length > _ERROR_MAX)
    window._clientErrors.length = _ERROR_MAX;
  try {
    localStorage.setItem(
      `${window.STORAGE_PREFIX  }errors`,
      JSON.stringify(window._clientErrors),
    );
  } catch (_e) {}

  /* Optional: report to Apps Script (fire-and-forget) */
  if (window.SHEETS_WEBAPP_URL && navigator.onLine) {
    try {
      window
        ._sheetsWebAppPost({ action: "logError", error: entry })
        .catch(function () {});
    } catch (_e) {}
  }
}

/**
 * Render the error log table inside #errorLogBody (admin Settings card).
 */
function renderErrorLog() {
  const tbody = document.getElementById("errorLogBody");
  if (!tbody) return;

  if (window._clientErrors.length === 0) {
    tbody.replaceChildren();
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.style.cssText =
      "text-align:center; padding:1rem; font-size:0.85em; color:var(--text-muted);";
    td.setAttribute("data-i18n", "errors_empty");
    td.textContent = window.t("errors_empty");
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  tbody.replaceChildren();
  window._clientErrors.slice(0, 30).forEach(function (entry) {
    const tr = document.createElement("tr");
    tr.style.cssText = "font-size:0.78em;";

    const tdTs = document.createElement("td");
    tdTs.style.cssText =
      "white-space:nowrap; color:var(--text-muted); direction:ltr;";
    const d = new Date(entry.ts);
    tdTs.textContent =
      `${d.toLocaleDateString("he-IL") 
      } ${ 
      d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;

    const tdMsg = document.createElement("td");
    tdMsg.style.cssText =
      "color:var(--negative); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;";
    tdMsg.title = entry.message;
    tdMsg.textContent = entry.message;

    const tdSrc = document.createElement("td");
    tdSrc.style.cssText =
      "color:var(--text-muted); direction:ltr; font-size:0.9em;";
    const loc = entry.source
      ? `${entry.source  }:${  entry.lineno}`
      : `line ${  entry.lineno}`;
    tdSrc.textContent = loc;

    tr.append(tdTs, tdMsg, tdSrc);
    tbody.appendChild(tr);
  });
}

/** Clear all stored errors (admin only). */
function clearErrorLog() {
  if (!window._authUser || !window._authUser.isAdmin) return;
  window._clientErrors = [];
  try {
    localStorage.removeItem(`${window.STORAGE_PREFIX  }errors`);
  } catch (_e) {}
  renderErrorLog();
  window.showToast(window.t("errors_cleared"), "success");
}

/**
 * Register global error handlers. Call once at startup (in init()).
 */
function initErrorMonitor() {
  /* Load persisted errors */
  try {
    const stored = localStorage.getItem(`${window.STORAGE_PREFIX  }errors`);
    if (stored) window._clientErrors = JSON.parse(stored) || [];
  } catch (_e) {
    window._clientErrors = [];
  }

  window.addEventListener("error", function (e) {
    logClientError({
      message: e.message,
      source: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error && e.error.stack ? e.error.stack : "",
    });
  });

  window.addEventListener("unhandledrejection", function (e) {
    const reason = e.reason;
    logClientError({
      message: reason instanceof Error ? reason.message : String(reason),
      source: "",
      lineno: 0,
      colno: 0,
      stack: reason instanceof Error && reason.stack ? reason.stack : "",
    });
  });
}
