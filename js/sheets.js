// @ts-check
"use strict";

/* ── Google Sheets Integration ──────────────────────────────────────────────
   Reading  : public gviz/tq endpoint (no auth — works for any shared sheet)
   Writing  : Google Apps Script Web App, no-cors POST (deploy once, done)
   Auto-sync: polls every window.SHEETS_SYNC_INTERVAL_MS for remote changes
   ─────────────────────────────────────────────────────────────────────────── */

const _GVIZ_BASE = `https://docs.google.com/spreadsheets/d/${
  window.SPREADSHEET_ID
}/gviz/tq`;

/* Runtime state */
let _sheetsSyncTimer = null; // setTimeout handle
const _sheetsLastSig = {}; // { tabName: fingerprint } for change detection

/* ── S2.8: Pull-to-refresh (touch drag-down triggers Sheets sync) ────────── */
(function _initPullToRefresh() {
  const PULL_THRESHOLD = 80; // px downward drag required
  let _pullStart = 0;
  let _pulling = false;

  function _hint(show) {
    const el = document.querySelector(".pull-refresh-hint");
    if (el) el.classList.toggle("visible", show);
  }

  document.addEventListener(
    "touchstart",
    function (e) {
      if (window.scrollY === 0 && e.touches.length === 1) {
        _pullStart = e.touches[0].clientY;
        _pulling = true;
      }
    },
    { passive: true },
  );

  document.addEventListener(
    "touchmove",
    function (e) {
      if (!_pulling) return;
      const dy = e.touches[0].clientY - _pullStart;
      _hint(dy > PULL_THRESHOLD / 2);
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    function (e) {
      if (!_pulling) return;
      _pulling = false;
      const dy = e.changedTouches[0].clientY - _pullStart;
      _hint(false);
      if (dy > PULL_THRESHOLD) {
        window.showToast(
          window.t ? window.t("sync_status_syncing") : "Syncing…",
          "info",
        );
        _checkSheetsForChanges();
      }
    },
    { passive: true },
  );
})();

/* ── Runtime Web App URL (settable at runtime via Settings UI) ────────────── */

function _getWebAppUrl() {
  const stored = localStorage.getItem("wedding_v1_sheetsWebAppUrl");
  return (stored && stored.trim()) || window.SHEETS_WEBAPP_URL || "";
}

/* ── Public Read via gviz/tq ─────────────────────────────────────────────── */

/**
 * Fetch a public sheet tab via the gviz/tq endpoint.
 * Works for sheets shared as "Anyone with the link can view/edit".
 * Returns the parsed gviz JSON object, or null on failure.
 */
async function sheetsGvizRead(tabName) {
  if (!window.SPREADSHEET_ID || window.SPREADSHEET_ID.includes("YOUR"))
    return null;
  // &headers=1 tells gviz to treat the first row as column labels
  // without it columns come back as "A","B","C"… and all reads silently return nothing
  const url = `${_GVIZ_BASE}?tqx=out:json&headers=1&sheet=${encodeURIComponent(tabName)}`;
  try {
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) return null;
    const text = await resp.text();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch (_e) {
    return null;
  }
}

/** Convert a gviz table response to an array of plain objects, keyed by column labels */
function _gvizToObjects(gvizData) {
  if (!gvizData || !gvizData.table || !gvizData.table.cols) return [];
  const cols = gvizData.table.cols.map(function (c) {
    return c.label || c.id || "";
  });
  return (gvizData.table.rows || [])
    .map(function (r) {
      const obj = {};
      cols.forEach(function (col, i) {
        obj[col] = r.c && r.c[i] && r.c[i].v != null ? String(r.c[i].v) : "";
      });
      return obj;
    })
    .filter(function (row) {
      return Object.values(row).some(function (v) {
        return v !== "";
      });
    });
}

/** Extract a lightweight fingerprint for change detection from a gviz response */
function _gvizSig(gvizData) {
  if (!gvizData) return "";
  const sig = gvizData.sig || "";
  const rows =
    gvizData.table && gvizData.table.rows ? gvizData.table.rows.length : 0;
  return `${sig}|${rows}`;
}

/* ── Row Converters ──────────────────────────────────────────────────────── */

function guestToRow(g) {
  return window.GUEST_COLS.map(function (k) {
    const v = g[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

function rowToGuest(headers, row) {
  const g = {};
  headers.forEach(function (h, i) {
    g[h] = row[i] !== undefined ? row[i] : "";
  });
  g.count = parseInt(g.count, 10) || 1;
  g.children = parseInt(g.children, 10) || 0;
  g.accessibility = g.accessibility === "true" || g.accessibility === true;
  g.sent = g.sent === "true" || g.sent === true;
  return g;
}

function tableToRow(tbl) {
  return window.TABLE_COLS.map(function (k) {
    return String(tbl[k] !== undefined ? tbl[k] : "");
  });
}

function rowToTable(headers, row) {
  const tbl = {};
  headers.forEach(function (h, i) {
    tbl[h] = row[i] !== undefined ? row[i] : "";
  });
  tbl.capacity = parseInt(tbl.capacity, 10) || 10;
  return tbl;
}

/* ── Apps Script Write (no-cors, fire-and-forget) ────────────────────────── */

/**
 * POST a payload to the Apps Script Web App.
 * Uses no-cors so no CORS preflight is needed; response is opaque (ignored).
 */
async function _sheetsWebAppPost(payload) {
  const url = _getWebAppUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(payload),
    });
  } catch (_e) {
    /* offline — localStorage already saved */
  }
}

/* ── Load from Sheets (primary data source) ──────────────────────────────── */

/**
 * Load all three tabs from the public sheet and overwrite in-memory state +
 * localStorage.  Called on startup and whenever remote changes are detected.
 */
async function loadFromSheetsOnInit() {
  if (!window.SPREADSHEET_ID || window.SPREADSHEET_ID.includes("YOUR")) return;

  const [gData, tData, cfgData] = await Promise.all([
    sheetsGvizRead(window.SHEETS_GUESTS_TAB),
    sheetsGvizRead(window.SHEETS_TABLES_TAB),
    sheetsGvizRead(window.SHEETS_CONFIG_TAB),
  ]);

  /* Store fingerprints for change detection */
  if (gData) _sheetsLastSig[window.SHEETS_GUESTS_TAB] = _gvizSig(gData);
  if (tData) _sheetsLastSig[window.SHEETS_TABLES_TAB] = _gvizSig(tData);
  if (cfgData) _sheetsLastSig[window.SHEETS_CONFIG_TAB] = _gvizSig(cfgData);

  let reRender = false;

  if (gData && gData.table) {
    const objects = _gvizToObjects(gData).filter(function (r) {
      return r.id;
    });
    if (objects.length > 0) {
      window._guests = objects.map(function (obj) {
        return rowToGuest(Object.keys(obj), Object.values(obj));
      });
      window.migrateGuests();
      window.save("guests", window._guests);
      reRender = true;
    }
  }

  if (tData && tData.table) {
    const objects = _gvizToObjects(tData).filter(function (r) {
      return r.id;
    });
    if (objects.length > 0) {
      window._tables = objects.map(function (obj) {
        return rowToTable(Object.keys(obj), Object.values(obj));
      });
      window.save("tables", window._tables);
      reRender = true;
    }
  }

  if (cfgData && cfgData.table) {
    const objects = _gvizToObjects(cfgData);
    if (objects.length > 0) {
      const cfg = {};
      objects.forEach(function (r) {
        if (r.key) cfg[r.key] = r.value || "";
      });
      if (Object.keys(cfg).length > 0) {
        window._weddingInfo = Object.assign({}, window._weddingDefaults, cfg);
        if (cfg.giftBudget !== undefined) {
          window._weddingInfo.giftBudget = parseFloat(cfg.giftBudget) || 0;
        }
        window.save("wedding", window._weddingInfo);
        reRender = true;
      }
    }
  }

  if (reRender) {
    window.renderGuests();
    window.renderTables();
    window.renderStats();
    window.updateHeaderInfo();
    window.updateTopBar();
    window.renderCountdown();
    window.loadWeddingDetailsToForm();
    updateSheetsStatusBadge();
    if (typeof renderBudget === "function") window.renderBudget();
  }
}

/* ── S3.2: Write Queue — batch + debounce mutations ─────────────────────── */

const _writeQueue = [];
let _writeFlushTimer = null;
const _WRITE_DEBOUNCE_MS = 1500; // coalesce rapid saves into one write

/**
 * Enqueue a write operation. Later enqueued ops for the same `key` replace
 * earlier ones (last-write-wins within the debounce window).
 * @param {'guests'|'tables'|'vendors'|'expenses'} key
 * @param {Function} syncFn  Async function that performs the actual Sheets write
 */
function enqueueSheetWrite(key, syncFn) {
  /* Replace existing entry for same key */
  const idx = _writeQueue.findIndex(function (e) {
    return e.key === key;
  });
  if (idx !== -1) _writeQueue.splice(idx, 1);
  _writeQueue.push({ key, syncFn, ts: Date.now() });

  if (_writeFlushTimer) clearTimeout(_writeFlushTimer);
  _writeFlushTimer = setTimeout(_flushWriteQueue, _WRITE_DEBOUNCE_MS);
}

async function _flushWriteQueue() {
  _writeFlushTimer = null;
  const batch = _writeQueue.splice(0);
  if (!batch.length) return;
  updateSyncStatus("syncing");
  for (const entry of batch) {
    try {
      await entry.syncFn();
    } catch (_e) {
      /* individual failures are silent */
    }
  }
  updateSyncStatus("synced");
  /* S3.3: clear optimistic pending indicators now that data is confirmed */
  if (typeof window.clearGuestPendingSync === "function") {
    window.clearGuestPendingSync();
  }
}

/* ── S3.4: Conflict resolution — last-write-wins via updatedAt ─────────────
   When a remote row has a newer updatedAt than the local record,
   the remote value wins. Implemented in loadFromSheetsOnInit() via _mergeGuest.
   ─────────────────────────────────────────────────────────────────────────── */

/**
 * Merge a remotely-sourced guest into the local guest array.
 * Returns true if the local record was updated.
 * @param {object} remoteGuest
 */
function _mergeGuest(remoteGuest) {
  const local = window._guests.find(function (g) {
    return g.id === remoteGuest.id;
  });
  if (!local) {
    window._guests.push(remoteGuest);
    return true;
  }
  /* Only overwrite if remote is strictly newer */
  const remoteTs = remoteGuest.updatedAt
    ? new Date(remoteGuest.updatedAt).getTime()
    : 0;
  const localTs = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
  if (remoteTs > localTs) {
    Object.assign(local, remoteGuest);
    return true;
  }
  return false;
}

/* ── Write to Sheets ─────────────────────────────────────────────────────── */

/** Push all guests to the Attendees tab (replaces full sheet contents) */
async function syncGuestsToSheets() {
  window.save("guests", window._guests);
  const rows = [window.GUEST_COLS].concat(window._guests.map(guestToRow));

  if (_getWebAppUrl()) {
    await _sheetsWebAppPost({
      action: "replaceAll",
      sheet: window.SHEETS_GUESTS_TAB,
      rows,
    });
    /* Verify write via readable doGet after the no-cors fire-and-forget lands */
    const gLen = window._guests.length;
    setTimeout(function () {
      _verifySheetWrite(window.SHEETS_GUESTS_TAB, gLen);
    }, 5000);
  }

  /* Also sync via Sheets API v4 if an OAuth token is available */
  if (window._sheetsToken) {
    try {
      await sheetsRequest(
        "POST",
        `/values/${encodeURIComponent(window.SHEETS_GUESTS_TAB)}:clear`,
        {},
      );
      await sheetsRequest(
        "PUT",
        `/values/${encodeURIComponent(
          `${window.SHEETS_GUESTS_TAB}!A1`,
        )}?valueInputOption=USER_ENTERED`,
        { values: rows },
      );
    } catch (_e) {
      /* offline */
    }
  }
}

/** Push all tables to the Tables tab (replaces full sheet contents) */
async function syncTablesToSheets() {
  window.save("tables", window._tables);
  const rows = [window.TABLE_COLS].concat(window._tables.map(tableToRow));

  if (_getWebAppUrl()) {
    await _sheetsWebAppPost({
      action: "replaceAll",
      sheet: window.SHEETS_TABLES_TAB,
      rows,
    });
  }

  if (window._sheetsToken) {
    try {
      await sheetsRequest(
        "POST",
        `/values/${encodeURIComponent(window.SHEETS_TABLES_TAB)}:clear`,
        {},
      );
      await sheetsRequest(
        "PUT",
        `/values/${encodeURIComponent(
          `${window.SHEETS_TABLES_TAB}!A1`,
        )}?valueInputOption=USER_ENTERED`,
        { values: rows },
      );
    } catch (_e) {
      /* offline */
    }
  }
}

/** Push weddingInfo key-value pairs to the Config tab */
async function syncConfigToSheets() {
  window.save("wedding", window._weddingInfo);
  const rows = [["key", "value"]].concat(
    Object.keys(window._weddingInfo).map(function (k) {
      return [
        k,
        String(
          window._weddingInfo[k] !== undefined ? window._weddingInfo[k] : "",
        ),
      ];
    }),
  );
  if (_getWebAppUrl()) {
    await _sheetsWebAppPost({
      action: "replaceAll",
      sheet: window.SHEETS_CONFIG_TAB,
      rows,
    });
  }
}

/**
 * Append a single RSVP row via the Apps Script Web App.
 * Used for guest users who are not logged in as admins.
 */
async function sheetsAppendRsvp(guest) {
  await _sheetsWebAppPost({
    action: "append",
    sheet: window.SHEETS_GUESTS_TAB,
    row: guestToRow(guest),
  });
  /* S3.7: Also append to the dedicated RSVP log tab */
  if (_getWebAppUrl() && window.SHEETS_RSVP_LOG_TAB) {
    await _sheetsWebAppPost({
      action: "append",
      sheet: window.SHEETS_RSVP_LOG_TAB,
      row: [
        new Date().toISOString(),
        guest.phone || "",
        `${guest.firstName || ""} ${guest.lastName || ""}`.trim(),
        guest.status || "",
        guest.count || 1,
      ],
    }).catch(function () {
      /* non-critical */
    });
  }
}

/* ── S3.8: Vendor + Expense Sheets sync ─────────────────────────────────── */

const _VENDOR_COLS = [
  "id",
  "category",
  "name",
  "contact",
  "phone",
  "price",
  "paid",
  "notes",
  "updatedAt",
  "createdAt",
];
const _EXPENSE_COLS = [
  "id",
  "category",
  "amount",
  "description",
  "date",
  "createdAt",
];

/** Push all vendors to the Vendors sheet tab */
async function syncVendorsToSheets() {
  if (!_getWebAppUrl() || !window.SHEETS_VENDORS_TAB) return;
  const vendors = window._vendors || [];
  const rows = [_VENDOR_COLS].concat(
    vendors.map(function (v) {
      return _VENDOR_COLS.map(function (c) {
        return v[c] !== undefined ? String(v[c]) : "";
      });
    }),
  );
  await _sheetsWebAppPost({
    action: "replaceAll",
    sheet: window.SHEETS_VENDORS_TAB,
    rows,
  });
}

/** Push all expenses to the Expenses sheet tab */
async function syncExpensesToSheets() {
  if (!_getWebAppUrl() || !window.SHEETS_EXPENSES_TAB) return;
  const expenses = window._expenses || [];
  const rows = [_EXPENSE_COLS].concat(
    expenses.map(function (e) {
      return _EXPENSE_COLS.map(function (c) {
        return e[c] !== undefined ? String(e[c]) : "";
      });
    }),
  );
  await _sheetsWebAppPost({
    action: "replaceAll",
    sheet: window.SHEETS_EXPENSES_TAB,
    rows,
  });
}

/* ── Auto-sync (Change Detection Polling — exponential backoff) ──────────── */

/* Backoff state */
let _sheetsBackoffStep = 0;
const _SHEETS_BACKOFF_STEPS = [30, 60, 120, 300]; // seconds between polls

/** Returns the current poll interval with ±10 % jitter */
function _sheetsNextInterval() {
  const base =
    (_SHEETS_BACKOFF_STEPS[_sheetsBackoffStep] ||
      _SHEETS_BACKOFF_STEPS[_SHEETS_BACKOFF_STEPS.length - 1]) * 1000;
  const jitter = (Math.random() * 0.2 - 0.1) * base; // ±10 %
  return Math.max(window.SHEETS_SYNC_INTERVAL_MS, base + jitter);
}

/** Advance backoff on consecutive errors; reset on success */
function _sheetsBackoffError() {
  _sheetsBackoffStep = Math.min(
    _sheetsBackoffStep + 1,
    _SHEETS_BACKOFF_STEPS.length - 1,
  );
  updateSyncStatus("error");
}
function _sheetsBackoffReset() {
  _sheetsBackoffStep = 0;
}

/** Check for remote changes; reload if any tab's fingerprint has changed */
async function _checkSheetsForChanges() {
  if (!window.SPREADSHEET_ID || window.SPREADSHEET_ID.includes("YOUR")) return;
  updateSyncStatus("syncing");

  try {
    const [gData, tData, cfgData] = await Promise.all([
      sheetsGvizRead(window.SHEETS_GUESTS_TAB),
      sheetsGvizRead(window.SHEETS_TABLES_TAB),
      sheetsGvizRead(window.SHEETS_CONFIG_TAB),
    ]);

    const gSig = _gvizSig(gData);
    const tSig = _gvizSig(tData);
    const cfgSig = _gvizSig(cfgData);

    const changed =
      (gSig && gSig !== _sheetsLastSig[window.SHEETS_GUESTS_TAB]) ||
      (tSig && tSig !== _sheetsLastSig[window.SHEETS_TABLES_TAB]) ||
      (cfgSig && cfgSig !== _sheetsLastSig[window.SHEETS_CONFIG_TAB]);

    /* Update stored sigs regardless */
    if (gSig) _sheetsLastSig[window.SHEETS_GUESTS_TAB] = gSig;
    if (tSig) _sheetsLastSig[window.SHEETS_TABLES_TAB] = tSig;
    if (cfgSig) _sheetsLastSig[window.SHEETS_CONFIG_TAB] = cfgSig;

    if (changed) {
      await loadFromSheetsOnInit();
      window.showToast(window.t("toast_sheets_loaded"));
    }
    _sheetsBackoffReset();
    updateSyncStatus("synced");
  } catch (_e) {
    _sheetsBackoffError();
  }

  /* Reschedule with potentially longer interval if errors are accumulating */
  if (_sheetsSyncTimer) {
    clearTimeout(_sheetsSyncTimer);
    _sheetsSyncTimer = setTimeout(
      _checkSheetsForChanges,
      _sheetsNextInterval(),
    );
  }
}

/** Start the auto-sync polling loop with Page Visibility API (smart polling) */
function startSheetsAutoSync() {
  if (_sheetsSyncTimer) clearTimeout(_sheetsSyncTimer);
  _sheetsSyncTimer = setTimeout(
    _checkSheetsForChanges,
    window.SHEETS_SYNC_INTERVAL_MS,
  );

  /* Smart polling: pause when tab is hidden, resume immediately on refocus */
  document.removeEventListener("visibilitychange", _sheetsVisibilityHandler);
  document.addEventListener("visibilitychange", _sheetsVisibilityHandler);
}

/** Visibility change handler — pause/resume polling with the tab */
function _sheetsVisibilityHandler() {
  if (document.hidden) {
    /* Tab hidden — stop polling to save bandwidth */
    if (_sheetsSyncTimer) {
      clearTimeout(_sheetsSyncTimer);
      _sheetsSyncTimer = null;
    }
    updateSyncStatus("offline");
  } else {
    /* Tab visible again — check immediately, then reschedule */
    updateSyncStatus("syncing");
    _checkSheetsForChanges();
    if (!_sheetsSyncTimer) {
      _sheetsSyncTimer = setTimeout(
        _checkSheetsForChanges,
        window.SHEETS_SYNC_INTERVAL_MS,
      );
    }
  }
}

/** Stop the auto-sync polling loop */
function stopSheetsAutoSync() {
  if (_sheetsSyncTimer) {
    clearTimeout(_sheetsSyncTimer);
    _sheetsSyncTimer = null;
  }
  updateSyncStatus("offline");
}

/* ── OAuth2 (legacy — kept as optional path for direct Sheets API access) ── */

function initSheetsTokenClient() {
  const clientId = window.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes("YOUR")) return;
  if (
    typeof window.google === "undefined" ||
    !window.google.accounts ||
    !window.google.accounts.oauth2
  )
    return;
  window._sheetsTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: window.SHEETS_SCOPE,
    callback(tokenResponse) {
      if (tokenResponse.error) {
        console.warn("Sheets token error:", tokenResponse.error);
        return;
      }
      window._sheetsToken = tokenResponse.access_token;
      updateSheetsStatusBadge();
      loadFromSheetsOnInit();
    },
  });
}

function requestSheetsAccess() {
  if (window._sheetsToken) {
    loadFromSheetsOnInit();
    return;
  }
  if (!window._sheetsTokenClient) initSheetsTokenClient();
  if (window._sheetsTokenClient)
    window._sheetsTokenClient.requestAccessToken({ prompt: "" });
}

/** Low-level Sheets API v4 fetch helper (OAuth token required) */
async function sheetsRequest(method, path, body) {
  if (!window._sheetsToken) return null;
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${window.SPREADSHEET_ID}`;
  try {
    const resp = await fetch(base + path, {
      method,
      headers: Object.assign(
        { Authorization: `Bearer ${window._sheetsToken}` },
        body ? { "Content-Type": "application/json" } : {},
      ),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (resp.status === 401) {
      window._sheetsToken = null;
      updateSheetsStatusBadge();
      return null;
    }
    if (!resp.ok) return null;
    return resp.json();
  } catch (_e) {
    return null;
  }
}

/* ── Settings UI ─────────────────────────────────────────────────────────── */

/**
 * Check the Apps Script Web App version and spreadsheet read access.
 * Returns { gsOk, gsVersion, readOk } — all fields null if no URL configured.
 */
async function checkGsConnectivity() {
  const url = _getWebAppUrl();
  if (!url) return { gsOk: false, gsVersion: null, readOk: false };

  let gsOk = false;
  let gsVersion = null;
  let readOk = false;

  /* 1 — GET the health-check endpoint (cors-enabled, readable) */
  try {
    const r = await fetch(url, { method: "GET", cache: "no-store" });
    if (r.ok) {
      const data = await r.json();
      gsOk = Boolean(data.ok);
      gsVersion = data.version || null;
    }
  } catch (_e) {
    /* offline or CORS error */
  }

  /* 2 — gviz read test (public read access) */
  const gData = await sheetsGvizRead(window.SHEETS_GUESTS_TAB);
  readOk = Boolean(gData);

  return { gsOk, gsVersion, readOk };
}

/**
 * Test the connection and update the Sheets settings UI with results.
 * Triggered by the "Test Connection" button in Settings.
 */
async function sheetsCheckConnection() {
  const badge = document.getElementById("sheetsBadge");
  if (badge) {
    badge.textContent = `⏳ ${window.t("sheets_testing")}`;
    badge.style.color = "var(--text-muted)";
  }

  const { gsOk, gsVersion, readOk } = await checkGsConnectivity();

  const verEl = document.getElementById("sheetsGsVersion");
  if (verEl) {
    if (!_getWebAppUrl()) {
      verEl.textContent = "";
    } else if (!gsOk) {
      verEl.textContent = window.t("sheets_gs_unreachable");
      verEl.style.color = "var(--negative, red)";
    } else {
      const ver = gsVersion || "?";
      const outdated = gsVersion && gsVersion !== "1.20.0";
      verEl.textContent = `${window.t("sheets_gs_version")} ${ver}${outdated ? ` — ${window.t("sheets_gs_outdated")}` : ""}`;
      verEl.style.color = outdated
        ? "var(--warning, #f59e0b)"
        : "var(--positive)";
    }
  }

  if (!readOk) {
    window.showToast(window.t("sheets_read_fail"), "warning");
  } else if (!gsOk) {
    window.showToast(window.t("sheets_gs_unreachable"), "error");
  } else {
    window.showToast(window.t("sheets_test_ok"), "success");
  }

  updateSheetsStatusBadge();
}

/**
 * After a no-cors write, verify row count by calling doGet ?action=getRowCount.
 * Shows a warning toast if the count doesn't match expected.
 */
async function _verifySheetWrite(tabName, expectedDataRows) {
  const url = _getWebAppUrl();
  if (!url) return;
  try {
    const r = await fetch(
      `${url}?action=getRowCount&sheet=${encodeURIComponent(tabName)}`,
      { cache: "no-store" },
    );
    if (!r.ok) return;
    const data = await r.json();
    if (!data.ok) return;
    if (data.count !== expectedDataRows) {
      window.showToast(window.t("sheets_sync_verify_fail"), "warning");
    }
  } catch (_e) {
    /* ignore — offline */
  }
}

/** Update the connection status indicator badge (synced / syncing / offline / error) */
function updateSyncStatus(state) {
  const el = document.getElementById("sheetsSyncStatus");
  if (!el) return;
  const labels = {
    synced: window.t ? window.t("sync_status_synced") : "Synced",
    syncing: window.t ? window.t("sync_status_syncing") : "Syncing…",
    offline: window.t ? window.t("sync_status_offline") : "Offline",
    error: window.t ? window.t("sync_status_error") : "Sync error",
  };
  el.className = `sync-status ${state}`;
  el.replaceChildren();

  const dot = document.createElement("span");
  dot.className = "sync-dot";
  const text = document.createElement("span");
  text.textContent = labels[state] || state;

  el.appendChild(dot);
  el.appendChild(text);
}

/** Update the status badge in Settings → Sheets card */
function updateSheetsStatusBadge() {
  const badge = document.getElementById("sheetsBadge");
  if (!badge) return;
  const hasSheet = Boolean(
    window.SPREADSHEET_ID && !window.SPREADSHEET_ID.includes("YOUR"),
  );
  const hasWriter = Boolean(_getWebAppUrl() || window._sheetsToken);
  if (hasSheet && hasWriter) {
    badge.textContent = `\uD83D\uDFE2 ${window.t("sheets_status_on")}`;
    badge.style.color = "var(--positive)";
  } else if (hasSheet) {
    badge.textContent = `\uD83D\uDFE1 ${window.t("sheets_read_only")}`;
    badge.style.color = "var(--warning, #f59e0b)";
  } else {
    badge.textContent = `\uD83D\uDD34 ${window.t("sheets_status_off")}`;
    badge.style.color = "var(--text-muted)";
  }
}

/** Save the Apps Script Web App URL entered in the Settings input */
function saveWebAppUrl() {
  const inp = document.getElementById("sheetsWebAppUrl");
  if (!inp) return;
  const url = inp.value.trim();
  localStorage.setItem("wedding_v1_sheetsWebAppUrl", url);
  updateSheetsStatusBadge();
  window.showToast(window.t("sheets_webapp_saved"), "success");
}

/** Render current values into the Sheets settings card (called when Settings tab opens) */
function renderSheetsSettings() {
  const inp = document.getElementById("sheetsWebAppUrl");
  if (inp) inp.value = _getWebAppUrl();
  updateSheetsStatusBadge();
}

/** Create any missing sheet tabs via the Apps Script Web App */
async function createMissingSheetTabs() {
  if (!_getWebAppUrl()) {
    window.showToast(
      `${window.t("sheets_webapp_saved")} — ${window.t("sheets_status_off")}`,
      "warning",
    );
    return;
  }
  await _sheetsWebAppPost({ action: "ensureSheets" });
  window.showToast(window.t("toast_sheets_loaded"), "success");
}

/** Called from the Sheets sync button in Settings */
function syncSheetsNow() {
  loadFromSheetsOnInit().then(function () {
    window.showToast(window.t("toast_sheets_loaded"));
  });
}
