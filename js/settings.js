"use strict";

/* ── Settings: Wedding Details, Export/Import, Data Management ── */
/* ── Wedding Details ── */
function updateWeddingDetails() {
  _weddingInfo.groom = document.getElementById("groomName").value.trim();
  _weddingInfo.groomEn = document.getElementById("groomNameEn").value.trim();
  _weddingInfo.bride = document.getElementById("brideName").value.trim();
  _weddingInfo.brideEn = document.getElementById("brideNameEn").value.trim();
  _weddingInfo.date = document.getElementById("weddingDate").value;
  _weddingInfo.hebrewDate = document
    .getElementById("weddingHebrewDate")
    .value.trim();
  _weddingInfo.time = document.getElementById("weddingTime").value || "18:00";
  _weddingInfo.ceremonyTime =
    document.getElementById("weddingCeremonyTime").value || "19:30";
  _weddingInfo.venue = document.getElementById("venueName").value.trim();
  _weddingInfo.address = document.getElementById("venueAddress").value.trim();
  _weddingInfo.wazeLink = document.getElementById("venueWaze").value.trim();

  // Update header
  if (_weddingInfo.groom || _weddingInfo.bride) {
    el.coupleNames.textContent =
      (_weddingInfo.groom || "?") + " ❤ " + (_weddingInfo.bride || "?");
  }
  if (_weddingInfo.date) {
    el.weddingDateDisplay.textContent = formatDateHebrew(_weddingInfo.date);
  }
  const hebrewEl = document.getElementById("hebrewDateDisplay");
  if (hebrewEl && _weddingInfo.hebrewDate)
    hebrewEl.textContent = _weddingInfo.hebrewDate;

  updateHeaderInfo();
  updateTopBar();
  renderCountdown();
  renderInvitation();
  saveAll();
}

function loadWeddingDetailsToForm() {
  document.getElementById("groomName").value = _weddingInfo.groom || "";
  document.getElementById("groomNameEn").value = _weddingInfo.groomEn || "";
  document.getElementById("brideName").value = _weddingInfo.bride || "";
  document.getElementById("brideNameEn").value = _weddingInfo.brideEn || "";
  document.getElementById("weddingDate").value = _weddingInfo.date || "";
  document.getElementById("weddingHebrewDate").value =
    _weddingInfo.hebrewDate || "";
  document.getElementById("weddingTime").value = _weddingInfo.time || "18:00";
  document.getElementById("weddingCeremonyTime").value =
    _weddingInfo.ceremonyTime || "19:30";
  document.getElementById("venueName").value = _weddingInfo.venue || "";
  document.getElementById("venueAddress").value = _weddingInfo.address || "";
  document.getElementById("venueWaze").value = _weddingInfo.wazeLink || "";

  if (_weddingInfo.groom || _weddingInfo.bride) {
    el.coupleNames.textContent =
      (_weddingInfo.groom || "?") + " ❤ " + (_weddingInfo.bride || "?");
  }
  if (_weddingInfo.date) {
    el.weddingDateDisplay.textContent = formatDateHebrew(_weddingInfo.date);
  }
  const hebrewEl3 = document.getElementById("hebrewDateDisplay");
  if (hebrewEl3 && _weddingInfo.hebrewDate)
    hebrewEl3.textContent = _weddingInfo.hebrewDate;
  updateHeaderInfo();
}

/* ── Export / Import ── */
function exportGuestsCSV() {
  if (!_guests.length) return;
  const BOM = "\uFEFF";
  const cols = [
    t("col_first_name"),
    t("col_last_name"),
    t("col_phone"),
    "Email",
    t("col_guests_count"),
    t("col_status"),
    t("col_side"),
    t("col_meal"),
    "Accessibility",
    t("col_table"),
    "Relationship",
    "Notes",
  ];
  const header = cols.join(",");
  const rows = _guests.map(function (g) {
    return [
      '"' + (g.firstName || "").replace(/"/g, '""') + '"',
      '"' + (g.lastName || "").replace(/"/g, '""') + '"',
      '"' + (g.phone || "") + '"',
      '"' + (g.email || "") + '"',
      g.count || 1,
      '"' + t("status_" + g.status) + '"',
      '"' + t("side_" + (g.side || "mutual")) + '"',
      '"' + t("meal_" + (g.meal || "regular")) + '"',
      g.accessibility ? "1" : "0",
      '"' + getTableName(g.tableId) + '"',
      '"' + (g.relationship || "").replace(/"/g, '""') + '"',
      '"' + (g.notes || "").replace(/"/g, '""') + '"',
    ].join(",");
  });
  const csv = BOM + header + "\n" + rows.join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  link.download =
    "wedding_guests_" + new Date().toISOString().slice(0, 10) + ".csv";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(t("toast_export_done"), "success");
}

function exportJSON() {
  const data = {
    version: "1.1",
    exported: new Date().toISOString(),
    wedding: _weddingInfo,
    guests: _guests,
    tables: _tables,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download =
    "wedding_backup_" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(t("toast_backup_exported"), "success");
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.name.endsWith(".json")) {
    showToast(t("toast_invalid_file"), "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.guests || !Array.isArray(data.guests))
        throw new Error("invalid");
      _guests = data.guests;
      _tables = data.tables || [];
      _weddingInfo = { ..._weddingDefaults, ...(data.wedding || {}) };
      migrateGuests();
      saveAll();
      syncGuestsToSheets();
      syncTablesToSheets();
      loadWeddingDetailsToForm();
      renderGuests();
      renderTables();
      renderStats();
      updateTopBar();
      showToast(t("toast_backup_imported"), "success");
    } catch (_err) {
      showToast(t("toast_invalid_file"), "error");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
}

function downloadCSVTemplate() {
  const BOM = "\uFEFF";
  const header =
    "שם פרטי,שם משפחה,טלפון,אימייל,מספר אורחים,צד (groom/bride/mutual),קבוצה (family/friends/work/other),ארוחה (regular/vegetarian/vegan/kosher/gluten_free),ילדים,נגישות (0/1),הערות\n";
  const example =
    "ישראל,כהן,0501234567,israel@example.com,2,groom,family,regular,0,0,\n";
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
        const notes = (cols[10] || "").trim();

        if (!firstName) continue;
        // Check for duplicates by phone or full name
        const dup = _guests.find(function (g) {
          return (
            (phone && g.phone === phone) ||
            guestFullName(g).toLowerCase() ===
              (firstName + " " + lastName).trim().toLowerCase()
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
            notes,
            updatedAt: now,
          });
        } else {
          _guests.push({
            id: uid(),
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
      saveAll();
      syncGuestsToSheets();
      renderGuests();
      renderStats();
      showToast(t("toast_csv_imported") + " (" + imported + ")", "success");
    } catch (_err) {
      showToast(t("toast_invalid_file"), "error");
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
  if (!confirm(t("confirm_clear"))) return;
  if (
    !confirm(
      _currentLang === "he"
        ? "פעולה זו אינה ניתנת לביטול. האם אתה בטוח לחלוטין?"
        : "This cannot be undone. Are you absolutely sure?",
    )
  )
    return;
  _guests = [];
  _tables = [];
  saveAll();
  syncGuestsToSheets();
  syncTablesToSheets();
  renderGuests();
  renderTables();
  renderStats();
  renderDataSummary();
  showToast(t("toast_data_cleared"), "error");
}

function renderDataSummary() {
  if (!el.dataSummary) return;
  const confirmed = _guests.filter(function (g) {
    return g.status === "confirmed";
  }).length;
  const sent = _guests.filter(function (g) {
    return g.sent;
  }).length;
  const lines = [
    "👥 " +
      (_currentLang === "he" ? "אורחים" : "Guests") +
      ": <strong>" +
      _guests.length +
      "</strong>",
    "🪑 " +
      (_currentLang === "he" ? "שולחנות" : "Tables") +
      ": <strong>" +
      _tables.length +
      "</strong>",
    "✅ " +
      (_currentLang === "he" ? "אישורים" : "Confirmed") +
      ": <strong>" +
      confirmed +
      "</strong>",
    "📱 " +
      (_currentLang === "he" ? "נשלחו" : "Sent") +
      ": <strong>" +
      sent +
      "</strong>",
    "🤵 " +
      (_currentLang === "he" ? "אורחי חתן" : "Groom's") +
      ": <strong>" +
      _guests.filter(function (g) {
        return g.side === "groom";
      }).length +
      "</strong>",
    "👰 " +
      (_currentLang === "he" ? "אורחי כלה" : "Bride's") +
      ": <strong>" +
      _guests.filter(function (g) {
        return g.side === "bride";
      }).length +
      "</strong>",
    "🥗 " +
      (_currentLang === "he" ? "צמחוני/טבעוני" : "Vegetarian/Vegan") +
      ": <strong>" +
      _guests.filter(function (g) {
        return g.meal === "vegetarian" || g.meal === "vegan";
      }).length +
      "</strong>",
    "♿ " +
      (_currentLang === "he" ? "נגישות" : "Accessibility") +
      ": <strong>" +
      _guests.filter(function (g) {
        return g.accessibility;
      }).length +
      "</strong>",
    '<hr style="border-color:rgba(255,255,255,0.05); margin:0.4rem 0;">',
    "ℹ️ Wedding Manager v1.2.0",
  ];
  el.dataSummary.innerHTML = lines.join("<br>");
}
