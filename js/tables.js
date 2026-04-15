// @ts-check
"use strict";

/* ── Table Seating ── */
/* ── Tables ── */
function renderTables() {
  window.el.tablesEmpty.style.display =
    window._tables.length === 0 ? "block" : "none";
  window.el.seatingFloor.replaceChildren();
  const frag = document.createDocumentFragment();

  window._tables.forEach(function (tbl) {
    const guests = window._guests.filter(function (g) {
      return g.tableId === tbl.id;
    });
    const totalSeated = guests.reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
    const full = totalSeated >= tbl.capacity;

    const card = document.createElement("div");
    card.className = `table-card drop-zone${full ? " highlight" : ""}`;
    card.setAttribute("data-table-id", tbl.id);
    card.ondragover = function (e) {
      e.preventDefault();
      card.classList.add("drag-over");
    };
    card.ondragleave = function () {
      card.classList.remove("drag-over");
    };
    card.ondrop = function (e) {
      handleTableDrop(e, tbl.id);
      card.classList.remove("drag-over");
    };

    let guestHtml = "";
    guests.forEach(function (g) {
      const sideIcon = window.SIDE_ICON[g.side || "mutual"] || "";
      guestHtml += `<div class="tg-item">${sideIcon} ${window.escapeHtml(
        window.guestFullName(g),
      )} (${g.count || 1})</div>`;
    });

    const pctFull =
      tbl.capacity > 0 ? Math.round((totalSeated / tbl.capacity) * 100) : 0;
    const fillColor = full ? "var(--positive)" : "var(--accent)";

    /* Shape indicator */
    const shapeDiv = document.createElement("div");
    shapeDiv.className = `table-shape ${tbl.shape || "round"}`;
    shapeDiv.textContent = tbl.shape === "rect" ? "\u25ac" : "\u2b24";

    /* Table name */
    const nameDiv = document.createElement("div");
    nameDiv.className = "table-name";
    nameDiv.textContent = tbl.name;

    /* Capacity */
    const capDiv = document.createElement("div");
    capDiv.className = "table-capacity";
    capDiv.textContent = `${(full ? "\u2705 " : "") + totalSeated} / ${
      tbl.capacity
    } ${window.t("seats")}`;

    /* Progress bar */
    const barOuter = document.createElement("div");
    barOuter.style.cssText =
      "background:rgba(255,255,255,0.06);border-radius:4px;height:4px;margin:0.4rem 0;overflow:hidden;";
    const barInner = document.createElement("div");
    barInner.style.cssText = `height:100%;width:${pctFull}%;background:${
      fillColor
    };border-radius:4px;transition:width 0.3s;`;
    barOuter.appendChild(barInner);

    /* Guest list */
    const guestListDiv = document.createElement("div");
    guestListDiv.className = "table-guests-list";
    guests.forEach(function (g) {
      const gItem = document.createElement("div");
      gItem.className = "tg-item";
      const sIcon = window.SIDE_ICON[g.side || "mutual"] || "";
      gItem.textContent = `${sIcon} ${window.guestFullName(g)} (${g.count || 1})`;
      guestListDiv.appendChild(gItem);
    });

    /* Action buttons */
    const actionsDiv = document.createElement("div");
    actionsDiv.style.cssText =
      "margin-top:0.8rem; display:flex; gap:0.3rem; justify-content:center;";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary btn-small";
    btnEdit.setAttribute("data-action", "editTable");
    btnEdit.setAttribute("data-action-arg", tbl.id);
    btnEdit.title = window.t("btn_edit");
    btnEdit.textContent = "\u270f\ufe0f";

    const btnDel = document.createElement("button");
    btnDel.className = "btn btn-danger btn-small";
    btnDel.setAttribute("data-action", "deleteTable");
    btnDel.setAttribute("data-action-arg", tbl.id);
    btnDel.title = window.t("btn_delete");
    btnDel.textContent = "\ud83d\uddd1\ufe0f";

    actionsDiv.appendChild(btnEdit);
    actionsDiv.appendChild(btnDel);

    card.appendChild(shapeDiv);
    card.appendChild(nameDiv);
    card.appendChild(capDiv);
    card.appendChild(barOuter);
    card.appendChild(guestListDiv);
    card.appendChild(actionsDiv);

    frag.appendChild(card);
  });

  window.el.seatingFloor.appendChild(frag);
  renderUnassignedGuests();
}

function renderUnassignedGuests() {
  const unassigned = window._guests.filter(function (g) {
    return !g.tableId && g.status !== "declined";
  });
  if (unassigned.length === 0) {
    window.el.unassignedGuests.textContent = "";
    const notice = document.createElement("span");
    notice.style.cssText = "color:var(--text-muted); font-size:0.85em;";
    notice.textContent = `🎉 ${
      window._currentLang === "he"
        ? "כל האורחים שובצו!"
        : "All guests assigned!"
    }`;
    window.el.unassignedGuests.appendChild(notice);
    return;
  }
  window.el.unassignedGuests.textContent = "";
  unassigned.forEach(function (g) {
    const chip = document.createElement("span");
    chip.className = "btn btn-secondary btn-small guest-draggable";
    chip.draggable = true;
    const sideIcon = window.SIDE_ICON[g.side || "mutual"] || "";
    chip.textContent = `${sideIcon} ${window.guestFullName(g)} (${g.count || 1})`;
    chip.ondragstart = function (e) {
      e.dataTransfer.setData("text/plain", g.id);
    };
    window.el.unassignedGuests.appendChild(chip);
  });
}
/**
 * Auto-assign unassigned (non-declined) guests to tables that have available
 * capacity. Guests are grouped by `group` field (family → friends → work →
 * other). Within each group preference is given to tables that already seat
 * guests from the same group.
 * @returns {number} - count of newly assigned guests
 */
function autoAssignTables() {
  if (!window._authUser || !window._authUser.isAdmin) return 0;
  const GROUP_ORDER = ["family", "friends", "work", "other"];
  const unassigned = window._guests.filter(function (g) {
    return !g.tableId && g.status !== "declined";
  });
  if (unassigned.length === 0) {
    window.showToast(window.t("auto_assign_none"), "info");
    return 0;
  }

  /* Sort by group priority */
  unassigned.sort(function (a, b) {
    const ai = GROUP_ORDER.indexOf(a.group || "other");
    const bi = GROUP_ORDER.indexOf(b.group || "other");
    return ai - bi;
  });

  let assigned = 0;

  unassigned.forEach(function (guest) {
    if (guest.tableId) return; /* may have been assigned in this loop */

    /* Calculate available capacity for each table */
    const tableAvail = window._tables.map(function (tbl) {
      const seated = window._guests
        .filter(function (g) {
          return g.tableId === tbl.id;
        })
        .reduce(function (s, g) {
          return s + (g.count || 1);
        }, 0);
      return { tbl, avail: tbl.capacity - seated };
    });

    const needed = guest.count || 1;

    /* 1st preference: table that already seats same-group guests */
    let target = null;
    const sameGroup = tableAvail.find(function (ta) {
      if (ta.avail < needed) return false;
      return window._guests.some(function (g) {
        return (
          g.tableId === ta.tbl.id &&
          (g.group || "other") === (guest.group || "other")
        );
      });
    });
    if (sameGroup) {
      target = sameGroup.tbl;
    } else {
      /* 2nd preference: any table with enough space (most space first) */
      const candidates = tableAvail
        .filter(function (ta) {
          return ta.avail >= needed;
        })
        .sort(function (a, b) {
          return b.avail - a.avail;
        });
      if (candidates.length > 0) target = candidates[0].tbl;
    }

    if (target) {
      guest.tableId = target.id;
      assigned++;
    }
  });

  if (assigned > 0) {
    window.saveAll();
    window.syncGuestsToSheets();
    renderTables();
    window.renderGuests();
    window.renderStats();
    window.showToast(
      window.t("auto_assign_done").replace("{n}", assigned),
      "success",
    );
  } else {
    window.showToast(window.t("auto_assign_none"), "info");
  }
  return assigned;
}
function handleTableDrop(e, tableId) {
  e.preventDefault();
  const guestId = e.dataTransfer.getData("text/plain");
  if (!guestId) return;
  const g = window._guests.find(function (x) {
    return x.id === guestId;
  });
  if (g) {
    g.tableId = tableId;
    window.saveAll();
    window.syncGuestsToSheets();
    renderTables();
    window.renderGuests();
    window.renderStats();
  }
}

function openAddTableModal() {
  window._editingTableId = null;
  document.getElementById("tableModalTitle").textContent =
    window.t("modal_add_table");
  document.getElementById("tableName").value = "";
  document.getElementById("tableCapacity").value = "10";
  document.getElementById("tableShape").value = "round";
  window.openModal("tableModal");
}

function editTable(id) {
  const tbl = window._tables.find(function (x) {
    return x.id === id;
  });
  if (!tbl) return;
  window._editingTableId = id;
  document.getElementById("tableModalTitle").textContent =
    window.t("modal_edit_table");
  document.getElementById("tableName").value = tbl.name || "";
  document.getElementById("tableCapacity").value = tbl.capacity || 10;
  document.getElementById("tableShape").value = tbl.shape || "round";
  window.openModal("tableModal");
}

function saveTable() {
  if (!window._authUser || !window._authUser.isAdmin) return;
  const name = document.getElementById("tableName").value.trim();
  if (!name) return;
  const capacity =
    parseInt(document.getElementById("tableCapacity").value, 10) || 10;
  const shape = document.getElementById("tableShape").value;

  if (window._editingTableId) {
    const tbl = window._tables.find(function (x) {
      return x.id === window._editingTableId;
    });
    if (tbl) {
      tbl.name = name;
      tbl.capacity = capacity;
      tbl.shape = shape;
    }
  } else {
    window._tables.push({ id: window.uid(), name, capacity, shape });
  }

  window.saveAll();
  window.syncTablesToSheets();
  window.closeModal("tableModal");
  renderTables();
  window.renderStats();
  window.showToast(window.t("toast_table_saved"), "success");
}

function deleteTable(id) {
  if (!window._authUser || !window._authUser.isAdmin) return;
  if (!confirm(window.t("confirm_delete"))) return;
  window._guests.forEach(function (g) {
    if (g.tableId === id) g.tableId = "";
  });
  window._tables = window._tables.filter(function (tbl) {
    return tbl.id !== id;
  });
  window.saveAll();
  window.syncTablesToSheets();
  window.syncGuestsToSheets();
  renderTables();
  window.renderGuests();
  window.renderStats();
  window.showToast(window.t("toast_table_deleted"), "error");
}

function getTableName(id) {
  const tbl = window._tables.find(function (x) {
    return x.id === id;
  });
  return tbl ? tbl.name : "";
}

function populateTableSelect() {
  const sel = document.getElementById("guestTableSelect");
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = window.t("no_table");
  sel.replaceChildren(defaultOpt);
  window._tables.forEach(function (tbl) {
    const opt = document.createElement("option");
    opt.value = tbl.id;
    opt.textContent = tbl.name;
    sel.appendChild(opt);
  });
}

/* ── Seating Chart Print / PDF Export ── */

/**
 * Opens a new browser window with a print-ready seating-chart layout and
 * immediately triggers window.print() so the user can save as PDF or print.
 *
 * Zero dependencies — uses only the browser Print API.
 */
function printSeatingChart() {
  const isHe = window._currentLang === "he";
  const dir = isHe ? "rtl" : "ltr";
  const wi = window._weddingInfo || {};

  /* ── header strings (baked in at export time, no live i18n needed) ── */
  const titleStr = window.t("seating_chart_title");
  const unassignedStr = window.t("unassigned_title");
  const seatsStr = window.t("seats");
  const mealMap = {
    regular: isHe ? "רגיל" : "Regular",
    vegetarian: isHe ? "צמחוני" : "Vegetarian",
    vegan: isHe ? "טבעוני" : "Vegan",
    kosher: isHe ? "כשר" : "Kosher",
    gluten_free: isHe ? "ללא גלוטן" : "Gluten-free",
  };

  /* ── build table cards HTML ── */
  let tableCardsHtml = "";
  window._tables.forEach(function (tbl) {
    const seated = window._guests.filter(function (g) {
      return g.tableId === tbl.id;
    });
    const totalSeated = seated.reduce(function (s, g) {
      return s + (g.count || 1);
    }, 0);
    const full = totalSeated >= tbl.capacity;
    const shapeIcon = tbl.shape === "rect" ? "▬" : "⬤";
    const shapeClass = tbl.shape === "rect" ? "shape-rect" : "shape-round";

    let guestRows = "";
    seated.forEach(function (g) {
      const sideIcon =
        g.side === "groom" ? "🤵" : g.side === "bride" ? "👰" : "🤝";
      const mealIcon =
        g.meal === "vegetarian"
          ? "🥗"
          : g.meal === "vegan"
            ? "🌿"
            : g.meal === "kosher"
              ? "✡️"
              : g.meal === "gluten_free"
                ? "🚫"
                : "";
      const mealLabel = mealMap[g.meal] ? mealMap[g.meal] : "";
      const count = g.count && g.count > 1 ? ` ×${g.count}` : "";
      guestRows +=
        `<tr><td>${sideIcon} ${window.escapeHtml(window.guestFullName(g))}${
          count
        }</td>` +
        `<td style="text-align:center;">${mealIcon}${
          mealIcon && mealLabel ? " " : ""
        }${window.escapeHtml(mealLabel)}</td></tr>`;
    });

    tableCardsHtml +=
      `<div class="table-card${full ? " full" : ""}">` +
      `<div class="table-header">` +
      `<span class="shape-badge ${shapeClass}">${shapeIcon}</span>` +
      `<strong>${window.escapeHtml(tbl.name)}</strong>` +
      `<span class="capacity">${totalSeated} / ${
        tbl.capacity
      } ${window.escapeHtml(seatsStr)}</span>` +
      `</div>` +
      `<table class="guest-list"><tbody>${
        guestRows || '<tr><td colspan="2" class="empty-table">—</td></tr>'
      }</tbody></table>` +
      `</div>`;
  });

  /* ── unassigned guests ── */
  const unassigned = window._guests.filter(function (g) {
    return !g.tableId && g.status !== "declined";
  });
  let unassignedHtml = "";
  if (unassigned.length > 0) {
    const chips = unassigned
      .map(function (g) {
        return `<span class="chip">${window.escapeHtml(
          window.guestFullName(g),
        )} (${g.count || 1})</span>`;
      })
      .join("");
    unassignedHtml =
      `<div class="unassigned-section">` +
      `<h2 class="section-heading">⚠ ${window.escapeHtml(unassignedStr)} (${
        unassigned.length
      })</h2>` +
      `<div class="chip-group">${chips}</div>` +
      `</div>`;
  }

  /* ── wedding header ── */
  const groomName = window.escapeHtml(
    (isHe ? wi.groom : wi.groomEn) || wi.groom || "",
  );
  const brideName = window.escapeHtml(
    (isHe ? wi.bride : wi.brideEn) || wi.bride || "",
  );
  const dateStr = window.escapeHtml(wi.date || "");
  const hebrewDate = window.escapeHtml(wi.hebrewDate || "");
  const venueName = window.escapeHtml(wi.venue || "");
  const venueAddr = window.escapeHtml(wi.address || "");
  const coupleStr =
    groomName && brideName
      ? `${groomName} & ${brideName}`
      : groomName || brideName;

  /* ── full HTML document (auto-print script embedded) ── */
  const html =
    `<!DOCTYPE html>` +
    `<html dir="${dir}" lang="${isHe ? "he" : "en"}">` +
    `<head>` +
    `<meta charset="UTF-8">` +
    `<title>${window.escapeHtml(titleStr)} \u2014 ${coupleStr}</title>` +
    `<style>` +
    `*{box-sizing:border-box;margin:0;padding:0;}` +
    `body{font-family:"Segoe UI",tahoma,arial,sans-serif;font-size:11pt;color:#1a1a1a;background:#fff;padding:1.5cm 1.5cm;direction:${
      dir
    };}` +
    `.page-header{text-align:center;margin-bottom:1.2cm;border-bottom:2px solid #6d3a73;padding-bottom:0.6cm;}` +
    `.page-title{font-size:22pt;font-weight:700;color:#6d3a73;letter-spacing:0.03em;}` +
    `.couple-names{font-size:16pt;margin:0.2cm 0;}` +
    `.wedding-meta{font-size:10pt;color:#555;margin-top:0.2cm;}` +
    `.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(7cm,1fr));gap:0.6cm;margin-top:0.5cm;}` +
    `.table-card{border:1px solid #ccc;border-radius:6px;padding:0.5cm;break-inside:avoid;}` +
    `.table-card.full{border-color:#6d3a73;background:#fdf8f5;}` +
    `.table-header{display:flex;align-items:center;gap:0.3cm;margin-bottom:0.3cm;flex-wrap:wrap;}` +
    `.table-header strong{font-size:12pt;flex:1;}` +
    `.capacity{font-size:9pt;color:#777;white-space:nowrap;}` +
    `.shape-badge{font-size:14pt;color:#6d3a73;}` +
    `.guest-list{width:100%;border-collapse:collapse;font-size:9.5pt;}` +
    `.guest-list td{padding:0.08cm 0.1cm;border-bottom:1px solid #eee;vertical-align:middle;}` +
    `.guest-list tr:last-child td{border-bottom:none;}` +
    `.empty-table{color:#aaa;text-align:center;}` +
    `.unassigned-section{margin-top:1cm;padding-top:0.8cm;border-top:1px dashed #ccc;break-inside:avoid;}` +
    `.section-heading{font-size:12pt;font-weight:600;color:#b45309;margin-bottom:0.4cm;}` +
    `.chip-group{display:flex;flex-wrap:wrap;gap:0.3cm;}` +
    `.chip{border:1px solid #d1d5db;border-radius:4px;padding:0.05cm 0.25cm;font-size:9.5pt;background:#f9f9f9;}` +
    `.footer{text-align:center;margin-top:1.2cm;padding-top:0.4cm;border-top:1px solid #eee;font-size:8.5pt;color:#aaa;}` +
    `@media print{body{padding:1cm;}@page{margin:1.5cm;}}` +
    `</style>` +
    `<script>window.onload=function(){window.print();}</script>` +
    `</head>` +
    `<body>` +
    `<div class="page-header">` +
    `<div class="page-title">${window.escapeHtml(titleStr)}</div>${
      coupleStr
        ? `<div class="couple-names">\ud83d\udc8d ${coupleStr}</div>`
        : ""
    }<div class="wedding-meta">${dateStr ? dateStr : ""}${
      hebrewDate ? `&nbsp;&nbsp;|&nbsp;&nbsp;${hebrewDate}` : ""
    }${venueName ? `&nbsp;&nbsp;|&nbsp;&nbsp;${venueName}` : ""}${
      venueAddr ? `, ${venueAddr}` : ""
    }</div>` +
    `</div>` +
    `<div class="grid">${tableCardsHtml}</div>${
      unassignedHtml
    }<div class="footer">Wedding Manager &nbsp;&middot;&nbsp; ${new Date().toLocaleDateString()}</div>` +
    `</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    URL.revokeObjectURL(url);
    window.showToast(window.t("toast_popup_blocked"), "error");
    return;
  }
  /* Release the object URL after 2 minutes — plenty of time to print */
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 120000);
}
