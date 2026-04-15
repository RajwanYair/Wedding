// @ts-check
"use strict";

/* ── Settings: Wedding Details, Export/Import, Data Management ── */
/* ── Wedding Details ── */
function updateWeddingDetails() {
  if (!window._authUser || !window._authUser.isAdmin) return;
  window._weddingInfo.groom = window.sanitizeInput(
    document.getElementById("groomName").value,
    100,
  );
  window._weddingInfo.groomEn = window.sanitizeInput(
    document.getElementById("groomNameEn").value,
    100,
  );
  window._weddingInfo.bride = window.sanitizeInput(
    document.getElementById("brideName").value,
    100,
  );
  window._weddingInfo.brideEn = window.sanitizeInput(
    document.getElementById("brideNameEn").value,
    100,
  );
  window._weddingInfo.date = document.getElementById("weddingDate").value;
  window._weddingInfo.hebrewDate = window.sanitizeInput(
    document.getElementById("weddingHebrewDate").value,
    100,
  );
  window._weddingInfo.time =
    document.getElementById("weddingTime").value || "18:00";
  window._weddingInfo.ceremonyTime =
    document.getElementById("weddingCeremonyTime").value || "19:30";
  window._weddingInfo.venue = window.sanitizeInput(
    document.getElementById("venueName").value,
    200,
  );
  window._weddingInfo.address = window.sanitizeInput(
    document.getElementById("venueAddress").value,
    300,
  );

  /* Validate Waze / navigation link — must be a valid HTTPS URL if provided */
  const rawWaze = window.sanitizeInput(
    document.getElementById("venueWaze").value,
    2048,
  );
  if (rawWaze && !window.isValidHttpsUrl(rawWaze)) {
    window.showToast(window.t("toast_invalid_url"), "error");
    return;
  }
  window._weddingInfo.wazeLink = rawWaze;

  // RSVP deadline
  const rsvpDLEl = document.getElementById("rsvpDeadline");
  if (rsvpDLEl) window._weddingInfo.rsvpDeadline = rsvpDLEl.value;

  // Transport settings
  window._weddingInfo.transportEnabled = document.getElementById(
    "transportEnabled",
  )
    ? document.getElementById("transportEnabled").checked
    : !!window._weddingInfo.transportEnabled;
  window._weddingInfo.transportTefachotTime = window.sanitizeInput(
    (document.getElementById("transportTefachotTime") || {}).value || "",
    10,
  );
  window._weddingInfo.transportTefachotAddress = window.sanitizeInput(
    (document.getElementById("transportTefachotAddress") || {}).value || "",
    200,
  );
  window._weddingInfo.transportJerusalemTime = window.sanitizeInput(
    (document.getElementById("transportJerusalemTime") || {}).value || "",
    10,
  );
  window._weddingInfo.transportJerusalemAddress = window.sanitizeInput(
    (document.getElementById("transportJerusalemAddress") || {}).value || "",
    200,
  );
  if (window._weddingInfo.groom || window._weddingInfo.bride) {
    window.el.coupleNames.textContent = `${
      window._weddingInfo.groom || "?"
    } ❤ ${window._weddingInfo.bride || "?"}`;
  }
  if (window._weddingInfo.date) {
    window.el.weddingDateDisplay.textContent = window.formatDateHebrew(
      window._weddingInfo.date,
    );
  }
  const hebrewEl = document.getElementById("hebrewDateDisplay");
  if (hebrewEl && window._weddingInfo.hebrewDate)
    hebrewEl.textContent = window._weddingInfo.hebrewDate;

  window.updateHeaderInfo();
  window.updateTopBar();
  window.renderCountdown();
  window.renderInvitation();
  window.saveAll();
  window.syncConfigToSheets();
}

function loadWeddingDetailsToForm() {
  document.getElementById("groomName").value = window._weddingInfo.groom || "";
  document.getElementById("groomNameEn").value =
    window._weddingInfo.groomEn || "";
  document.getElementById("brideName").value = window._weddingInfo.bride || "";
  document.getElementById("brideNameEn").value =
    window._weddingInfo.brideEn || "";
  document.getElementById("weddingDate").value = window._weddingInfo.date || "";
  document.getElementById("weddingHebrewDate").value =
    window._weddingInfo.hebrewDate || "";
  document.getElementById("weddingTime").value =
    window._weddingInfo.time || "18:00";
  document.getElementById("weddingCeremonyTime").value =
    window._weddingInfo.ceremonyTime || "19:30";
  document.getElementById("venueName").value = window._weddingInfo.venue || "";
  document.getElementById("venueAddress").value =
    window._weddingInfo.address || "";
  document.getElementById("venueWaze").value =
    window._weddingInfo.wazeLink || "";

  const rsvpDLEl = document.getElementById("rsvpDeadline");
  if (rsvpDLEl) rsvpDLEl.value = window._weddingInfo.rsvpDeadline || "";

  // Transport settings
  const tEnabledEl = document.getElementById("transportEnabled");
  if (tEnabledEl) tEnabledEl.checked = !!window._weddingInfo.transportEnabled;
  const tTefTime = document.getElementById("transportTefachotTime");
  if (tTefTime)
    tTefTime.value = window._weddingInfo.transportTefachotTime || "";
  const tTefAddr = document.getElementById("transportTefachotAddress");
  if (tTefAddr)
    tTefAddr.value = window._weddingInfo.transportTefachotAddress || "";
  const tJerTime = document.getElementById("transportJerusalemTime");
  if (tJerTime)
    tJerTime.value = window._weddingInfo.transportJerusalemTime || "";
  const tJerAddr = document.getElementById("transportJerusalemAddress");
  if (tJerAddr)
    tJerAddr.value = window._weddingInfo.transportJerusalemAddress || "";
}

function saveTransportSettings() {
  if (!window._authUser || !window._authUser.isAdmin) return;
  window._weddingInfo.transportEnabled =
    document.getElementById("transportEnabled").checked;
  window._weddingInfo.transportTefachotTime = window.sanitizeInput(
    document.getElementById("transportTefachotTime").value,
    10,
  );
  window._weddingInfo.transportTefachotAddress = window.sanitizeInput(
    document.getElementById("transportTefachotAddress").value,
    200,
  );
  window._weddingInfo.transportJerusalemTime = window.sanitizeInput(
    document.getElementById("transportJerusalemTime").value,
    10,
  );
  window._weddingInfo.transportJerusalemAddress = window.sanitizeInput(
    document.getElementById("transportJerusalemAddress").value,
    200,
  );
  window.saveAll();
  window.syncConfigToSheets();
  window.showToast(window.t("transport_saved"), "success");
}

/* ── Export / Import ── */
function exportGuestsCSV() {
  if (!window._guests.length) return;
  const BOM = "\uFEFF";
  /** Escape a value for a CSV cell: wrap in quotes and escape internal quotes.
   *  Also prefix formula-injection characters (=, +, -, @, TAB, CR) with a tab
   *  so spreadsheet apps don't execute them as formulas. */
  function csvCell(val) {
    let s = val === null || val === undefined ? "" : String(val);
    /* Strip formula-injection prefixes */
    if (s.length > 0 && "=+-@\t\r".indexOf(s[0]) !== -1) s = `\t${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }
  const cols = [
    window.t("col_first_name"),
    window.t("col_last_name"),
    window.t("col_phone"),
    "Email",
    window.t("col_guests_count"),
    window.t("col_status"),
    window.t("col_side"),
    window.t("col_meal"),
    "Accessibility",
    window.t("col_transport"),
    window.t("col_table"),
    "Relationship",
    "Notes",
  ];
  const header = cols.join(",");
  const rows = window._guests.map(function (g) {
    return [
      csvCell(g.firstName),
      csvCell(g.lastName),
      csvCell(g.phone),
      csvCell(g.email),
      g.count || 1,
      csvCell(window.t(`status_${g.status}`)),
      csvCell(window.t(`side_${g.side || "mutual"}`)),
      csvCell(window.t(`meal_${g.meal || "regular"}`)),
      g.accessibility ? "1" : "0",
      csvCell(g.transport || ""),
      csvCell(window.getTableName(g.tableId)),
      csvCell(g.relationship),
      csvCell(g.notes),
    ].join(",");
  });
  const csv = `${BOM + header}\n${rows.join("\n")}`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  link.download = `wedding_guests_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  window.showToast(window.t("toast_export_done"), "success");
}

function exportJSON() {
  const data = {
    version: "1.1",
    exported: new Date().toISOString(),
    wedding: window._weddingInfo,
    guests: window._guests,
    tables: window._tables,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `wedding_backup_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  window.showToast(window.t("toast_backup_exported"), "success");
}

function importJSON(e) {
  if (!window._authUser || !window._authUser.isAdmin) return;
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.endsWith(".json")) {
    window.showToast(window.t("toast_invalid_file"), "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.guests || !Array.isArray(data.guests))
        throw new Error("invalid");
      /* Scrub imported guest objects — only known keys, bounded lengths */
      window._guests = data.guests
        .filter(function (g) {
          return (
            g &&
            typeof g === "object" &&
            typeof g.id === "string" &&
            g.firstName
          );
        })
        .map(function (g) {
          return {
            id: window.sanitizeInput(g.id, 20),
            firstName: window.sanitizeInput(g.firstName, 100),
            lastName: window.sanitizeInput(g.lastName, 100),
            phone: window.sanitizeInput(g.phone, 20),
            email: window.sanitizeInput(g.email, 254),
            count: parseInt(g.count, 10) || 1,
            children: parseInt(g.children, 10) || 0,
            status: ["pending", "confirmed", "declined", "maybe"].includes(
              g.status,
            )
              ? g.status
              : "pending",
            side: ["groom", "bride", "mutual"].includes(g.side)
              ? g.side
              : "mutual",
            group: ["family", "friends", "work", "neighbors", "other"].includes(
              g.group,
            )
              ? g.group
              : "other",
            relationship: window.sanitizeInput(g.relationship, 100),
            meal: [
              "regular",
              "vegetarian",
              "vegan",
              "gluten_free",
              "kosher",
              "other",
            ].includes(g.meal)
              ? g.meal
              : "regular",
            mealNotes: window.sanitizeInput(g.mealNotes, 300),
            accessibility: Boolean(g.accessibility),
            tableId: window.sanitizeInput(g.tableId, 20),
            gift: window.sanitizeInput(g.gift, 300),
            notes: window.sanitizeInput(g.notes, 1000),
            sent: Boolean(g.sent),
            rsvpDate: window.sanitizeInput(g.rsvpDate, 30),
            createdAt: window.sanitizeInput(g.createdAt, 30),
            updatedAt: window.sanitizeInput(g.updatedAt, 30),
          };
        });
      window._tables = data.tables || [];
      window._weddingInfo = {
        ...window._weddingDefaults,
        ...(data.wedding || {}),
      };
      window.migrateGuests();
      window.saveAll();
      window.syncGuestsToSheets();
      window.syncTablesToSheets();
      loadWeddingDetailsToForm();
      window.renderGuests();
      window.renderTables();
      window.renderStats();
      window.updateTopBar();
      window.showToast(window.t("toast_backup_imported"), "success");
    } catch (_err) {
      window.showToast(window.t("toast_invalid_file"), "error");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
}

function downloadCSVTemplate() {
  const BOM = "\uFEFF";
  const header =
    "שם פרטי,שם משפחה,טלפון,אימייל,מספר אורחים,צד (groom/bride/mutual),קבוצה (family/friends/work/other),ארוחה (regular/vegetarian/vegan/kosher/gluten_free),ילדים,נגישות (0/1),הסעה (none/tefachot/jerusalem),הערות\n";
  const example =
    "ישראל,כהן,0501234567,israel@example.com,2,groom,family,regular,0,0,,\n";
  const blob = new Blob([BOM + header + example], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "wedding_guests_template.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const lines = ev.target.result
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter(Boolean);
      if (lines.length < 2) throw new Error("empty");
      let imported = 0;
      const now = new Date().toISOString();
      // Skip header row (index 0)
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (!cols[0]) continue;
        const firstName = (cols[0] || "").trim();
        const lastName = (cols[1] || "").trim();
        const phone = (cols[2] || "").trim();
        const email = (cols[3] || "").trim();
        const count = parseInt(cols[4], 10) || 1;
        const side = ["groom", "bride", "mutual"].includes(cols[5])
          ? cols[5]
          : "mutual";
        const group = [
          "family",
          "friends",
          "work",
          "neighbors",
          "other",
        ].includes(cols[6])
          ? cols[6]
          : "other";
        const meal = [
          "regular",
          "vegetarian",
          "vegan",
          "kosher",
          "gluten_free",
          "other",
        ].includes(cols[7])
          ? cols[7]
          : "regular";
        const children = parseInt(cols[8], 10) || 0;
        const accessibility = cols[9] === "1" || cols[9] === "true";
        const transport = ["tefachot", "jerusalem"].includes(
          (cols[10] || "").trim(),
        )
          ? cols[10].trim()
          : "";
        const notes = (
          cols[11] || (cols[10] && !transport ? cols[10] : "")
        ).trim();

        if (!firstName) continue;
        // Check for duplicates by phone or full name
        const dup = window._guests.find(function (g) {
          return (
            (phone && g.phone === phone) ||
            window.guestFullName(g).toLowerCase() ===
              `${firstName} ${lastName}`.trim().toLowerCase()
          );
        });
        if (dup) {
          Object.assign(dup, {
            lastName: dup.lastName || lastName,
            phone: dup.phone || phone,
            email: dup.email || email,
            count,
            side,
            group,
            meal,
            children,
            accessibility,
            transport,
            notes,
            updatedAt: now,
          });
        } else {
          window._guests.push({
            id: window.uid(),
            firstName,
            lastName,
            phone,
            email,
            count,
            children,
            status: "pending",
            side,
            group,
            relationship: "",
            meal,
            mealNotes: "",
            accessibility,
            transport,
            tableId: "",
            notes,
            gift: "",
            sent: false,
            rsvpDate: "",
            createdAt: now,
            updatedAt: now,
          });
        }
        imported++;
      }
      window.saveAll();
      window.syncGuestsToSheets();
      window.renderGuests();
      window.renderStats();
      window.showToast(
        `${window.t("toast_csv_imported")} (${imported})`,
        "success",
      );
    } catch (_err) {
      window.showToast(window.t("toast_invalid_file"), "error");
    }
    e.target.value = "";
  };
  reader.readAsText(file, "UTF-8");
}

function parseCsvLine(line) {
  const result = [];
  let cur = "",
    inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function clearAllData() {
  if (!window._authUser || !window._authUser.isAdmin) return;
  if (!confirm(window.t("confirm_clear"))) return;
  if (
    !confirm(
      window._currentLang === "he"
        ? "פעולה זו אינה ניתנת לביטול. האם אתה בטוח לחלוטין?"
        : "This cannot be undone. Are you absolutely sure?",
    )
  )
    return;
  window._guests = [];
  window._tables = [];
  window.saveAll();
  window.syncGuestsToSheets();
  window.syncTablesToSheets();
  window.renderGuests();
  window.renderTables();
  window.renderStats();
  renderDataSummary();
  window.showToast(window.t("toast_data_cleared"), "error");
}

function renderDataSummary() {
  if (!window.el.dataSummary) return;
  const confirmed = window._guests.filter(function (g) {
    return g.status === "confirmed";
  }).length;
  const sent = window._guests.filter(function (g) {
    return g.sent;
  }).length;
  const rows = [
    [
      "👥",
      window._currentLang === "he" ? "אורחים" : "Guests",
      window._guests.length,
    ],
    [
      "🪑",
      window._currentLang === "he" ? "שולחנות" : "Tables",
      window._tables.length,
    ],
    ["✅", window._currentLang === "he" ? "אישורים" : "Confirmed", confirmed],
    ["📱", window._currentLang === "he" ? "נשלחו" : "Sent", sent],
    [
      "🤵",
      window._currentLang === "he" ? "אורחי חתן" : "Groom's",
      window._guests.filter(function (g) {
        return g.side === "groom";
      }).length,
    ],
    [
      "👰",
      window._currentLang === "he" ? "אורחי כלה" : "Bride's",
      window._guests.filter(function (g) {
        return g.side === "bride";
      }).length,
    ],
    [
      "🥗",
      window._currentLang === "he" ? "צמחוני/טבעוני" : "Vegetarian/Vegan",
      window._guests.filter(function (g) {
        return g.meal === "vegetarian" || g.meal === "vegan";
      }).length,
    ],
    [
      "♿",
      window._currentLang === "he" ? "נגישות" : "Accessibility",
      window._guests.filter(function (g) {
        return g.accessibility;
      }).length,
    ],
  ];
  window.el.dataSummary.textContent = "";
  const frag = document.createDocumentFragment();
  rows.forEach(function (row) {
    const line = document.createElement("div");
    const label = document.createTextNode(`${row[0]} ${row[1]}: `);
    const strong = document.createElement("strong");
    strong.textContent = String(row[2]);
    line.appendChild(label);
    line.appendChild(strong);
    frag.appendChild(line);
  });
  const hr = document.createElement("hr");
  hr.style.cssText = "border-color:rgba(255,255,255,0.05); margin:0.4rem 0;";
  frag.appendChild(hr);
  const info = document.createElement("div");
  info.textContent = "ℹ\uFE0F Wedding Manager v1.19.0";
  frag.appendChild(info);
  window.el.dataSummary.appendChild(frag);
}
/* ── QR Code for RSVP ── */
function renderRsvpQr() {
  const img = document.getElementById("rsvpQrImage");
  const link = document.getElementById("rsvpQrLink");
  if (!img) return;
  const url = window.location.href.split("#")[0];
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=4&data=${encodeURIComponent(
    url,
  )}`;
  if (link) {
    link.href = url;
    link.textContent = url;
  }
}

function printRsvpQr() {
  const img = document.getElementById("rsvpQrImage");
  if (!img || !img.src) return;
  const g = window.escapeHtml(window._weddingInfo.groom || "");
  const b = window.escapeHtml(window._weddingInfo.bride || "");
  const d = window.escapeHtml(window._weddingInfo.date || "");
  const src = window.escapeHtml(img.src);
  const html =
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR RSVP</title>` +
    `<style>body{font-family:sans-serif;text-align:center;padding:2rem;}</style></head><body>` +
    `<h2>${g} \u2665 ${b}</h2><p style="color:#666">${d}</p>` +
    `<img src="${src}" width="240" height="240" alt="QR Code">` +
    `<p style="font-size:.85em;color:#666">${window.t("qr_scan_to_rsvp")}</p>` +
    `<script>window.onload=function(){window.print();}</script>` +
    `</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const burl = URL.createObjectURL(blob);
  const win = window.open(burl, "_blank", "width=440,height=560");
  if (win)
    win.addEventListener("load", function () {
      URL.revokeObjectURL(burl);
    });
}

function copyRsvpLink() {
  const url = window.location.href.split("#")[0];
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function () {
      window.showToast(window.t("qr_copied"), "success");
    });
  }
}
