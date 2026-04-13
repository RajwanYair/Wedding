'use strict';

/* ── Table Seating ── */
/* ── Tables ── */
function renderTables() {
  el.tablesEmpty.style.display = _tables.length === 0 ? 'block' : 'none';
  el.seatingFloor.innerHTML = '';
  const frag = document.createDocumentFragment();

  _tables.forEach(function(tbl) {
    const guests     = _guests.filter(function(g) { return g.tableId === tbl.id; });
    const totalSeated= guests.reduce(function(s, g) { return s + (g.count || 1); }, 0);
    const full       = totalSeated >= tbl.capacity;

    const card = document.createElement('div');
    card.className = 'table-card drop-zone' + (full ? ' highlight' : '');
    card.setAttribute('data-table-id', tbl.id);
    card.ondragover  = function(e) { e.preventDefault(); card.classList.add('drag-over'); };
    card.ondragleave = function()  { card.classList.remove('drag-over'); };
    card.ondrop      = function(e) { handleTableDrop(e, tbl.id); card.classList.remove('drag-over'); };

    let guestHtml = '';
    guests.forEach(function(g) {
      const sideIcon = SIDE_ICON[g.side || 'mutual'] || '';
      guestHtml += '<div class="tg-item">' + sideIcon + ' ' + escapeHtml(guestFullName(g)) + ' (' + (g.count || 1) + ')</div>';
    });

    const pctFull = tbl.capacity > 0 ? Math.round((totalSeated / tbl.capacity) * 100) : 0;
    const fillColor = full ? 'var(--positive)' : 'var(--accent)';

    card.innerHTML =
      '<div class="table-shape ' + (tbl.shape || 'round') + '">' + (tbl.shape === 'rect' ? '▬' : '⬤') + '</div>' +
      '<div class="table-name">' + escapeHtml(tbl.name) + '</div>' +
      '<div class="table-capacity">' + (full ? '✅ ' : '') + totalSeated + ' / ' + tbl.capacity + ' ' + t('seats') + '</div>' +
      '<div style="background:rgba(255,255,255,0.06);border-radius:4px;height:4px;margin:0.4rem 0;overflow:hidden;"><div style="height:100%;width:' + pctFull + '%;background:' + fillColor + ';border-radius:4px;transition:width 0.3s;"></div></div>' +
      '<div class="table-guests-list">' + guestHtml + '</div>' +
      '<div style="margin-top:0.8rem; display:flex; gap:0.3rem; justify-content:center;">' +
        '<button class="btn btn-secondary btn-small" onclick="editTable(\'' + tbl.id + '\')" title="' + t('btn_edit') + '">✏️</button>' +
        '<button class="btn btn-danger btn-small"    onclick="deleteTable(\'' + tbl.id + '\')" title="' + t('btn_delete') + '">🗑️</button>' +
      '</div>';

    frag.appendChild(card);
  });

  el.seatingFloor.appendChild(frag);
  renderUnassignedGuests();
}

function renderUnassignedGuests() {
  const unassigned = _guests.filter(function(g) { return !g.tableId && g.status !== 'declined'; });
  if (unassigned.length === 0) {
    el.unassignedGuests.innerHTML = '<span style="color:var(--text-muted); font-size:0.85em;">🎉 ' +
      (_currentLang === 'he' ? 'כל האורחים שובצו!' : 'All guests assigned!') + '</span>';
    return;
  }
  el.unassignedGuests.innerHTML = '';
  unassigned.forEach(function(g) {
    const chip = document.createElement('span');
    chip.className = 'btn btn-secondary btn-small guest-draggable';
    chip.draggable = true;
    const sideIcon = SIDE_ICON[g.side || 'mutual'] || '';
    chip.textContent = sideIcon + ' ' + guestFullName(g) + ' (' + (g.count || 1) + ')';
    chip.ondragstart = function(e) { e.dataTransfer.setData('text/plain', g.id); };
    el.unassignedGuests.appendChild(chip);
  });
}

function handleTableDrop(e, tableId) {
  e.preventDefault();
  const guestId = e.dataTransfer.getData('text/plain');
  if (!guestId) return;
  const g = _guests.find(function(x) { return x.id === guestId; });
  if (g) { g.tableId = tableId; saveAll(); syncGuestsToSheets(); renderTables(); renderGuests(); renderStats(); }
}

function openAddTableModal() {
  _editingTableId = null;
  document.getElementById('tableModalTitle').textContent = t('modal_add_table');
  document.getElementById('tableName').value      = '';
  document.getElementById('tableCapacity').value  = '10';
  document.getElementById('tableShape').value     = 'round';
  openModal('tableModal');
}

function editTable(id) {
  const tbl = _tables.find(function(x) { return x.id === id; });
  if (!tbl) return;
  _editingTableId = id;
  document.getElementById('tableModalTitle').textContent = t('modal_edit_table');
  document.getElementById('tableName').value     = tbl.name     || '';
  document.getElementById('tableCapacity').value = tbl.capacity || 10;
  document.getElementById('tableShape').value    = tbl.shape    || 'round';
  openModal('tableModal');
}

function saveTable() {
  const name = document.getElementById('tableName').value.trim();
  if (!name) return;
  const capacity = parseInt(document.getElementById('tableCapacity').value, 10) || 10;
  const shape    = document.getElementById('tableShape').value;

  if (_editingTableId) {
    const tbl = _tables.find(function(x) { return x.id === _editingTableId; });
    if (tbl) { tbl.name = name; tbl.capacity = capacity; tbl.shape = shape; }
  } else {
    _tables.push({ id: uid(), name, capacity, shape });
  }

  saveAll(); syncTablesToSheets(); closeModal('tableModal'); renderTables(); renderStats();
  showToast(t('toast_table_saved'), 'success');
}

function deleteTable(id) {
  if (!confirm(t('confirm_delete'))) return;
  _guests.forEach(function(g) { if (g.tableId === id) g.tableId = ''; });
  _tables = _tables.filter(function(tbl) { return tbl.id !== id; });
  saveAll(); syncTablesToSheets(); syncGuestsToSheets(); renderTables(); renderGuests(); renderStats();
  showToast(t('toast_table_deleted'), 'error');
}

function getTableName(id) {
  const tbl = _tables.find(function(x) { return x.id === id; });
  return tbl ? tbl.name : '';
}

function populateTableSelect() {
  const sel = document.getElementById('guestTableSelect');
  sel.innerHTML = '<option value="">' + t('no_table') + '</option>';
  _tables.forEach(function(tbl) {
    const opt = document.createElement('option');
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
  const isHe    = _currentLang === 'he';
  const dir     = isHe ? 'rtl' : 'ltr';
  const wi      = _weddingInfo || {};

  /* ── header strings (baked in at export time, no live i18n needed) ── */
  const titleStr      = t('seating_chart_title');
  const unassignedStr = t('unassigned_title');
  const seatsStr      = t('seats');
  const mealMap = {
    regular:     isHe ? 'רגיל'      : 'Regular',
    vegetarian:  isHe ? 'צמחוני'    : 'Vegetarian',
    vegan:       isHe ? 'טבעוני'    : 'Vegan',
    kosher:      isHe ? 'כשר'       : 'Kosher',
    gluten_free: isHe ? 'ללא גלוטן' : 'Gluten-free',
  };

  /* ── build table cards HTML ── */
  let tableCardsHtml = '';
  _tables.forEach(function(tbl) {
    const seated = _guests.filter(function(g) { return g.tableId === tbl.id; });
    const totalSeated = seated.reduce(function(s, g) { return s + (g.count || 1); }, 0);
    const full = totalSeated >= tbl.capacity;
    const shapeIcon = tbl.shape === 'rect' ? '▬' : '⬤';
    const shapeClass = tbl.shape === 'rect' ? 'shape-rect' : 'shape-round';

    let guestRows = '';
    seated.forEach(function(g) {
      const sideIcon = g.side === 'groom' ? '🤵' : g.side === 'bride' ? '👰' : '🤝';
      const mealIcon = g.meal === 'vegetarian' ? '🥗' :
                       g.meal === 'vegan'       ? '🌿' :
                       g.meal === 'kosher'      ? '✡️' :
                       g.meal === 'gluten_free' ? '🚫' : '';
      const mealLabel = mealMap[g.meal] ? mealMap[g.meal] : '';
      const count     = g.count && g.count > 1 ? ' ×' + g.count : '';
      guestRows +=
        '<tr><td>' + sideIcon + ' ' + escapeHtml(guestFullName(g)) + count + '</td>' +
        '<td style="text-align:center;">' + mealIcon + (mealIcon && mealLabel ? ' ' : '') + escapeHtml(mealLabel) + '</td></tr>';
    });

    tableCardsHtml +=
      '<div class="table-card' + (full ? ' full' : '') + '">' +
        '<div class="table-header">' +
          '<span class="shape-badge ' + shapeClass + '">' + shapeIcon + '</span>' +
          '<strong>' + escapeHtml(tbl.name) + '</strong>' +
          '<span class="capacity">' + totalSeated + ' / ' + tbl.capacity + ' ' + escapeHtml(seatsStr) + '</span>' +
        '</div>' +
        '<table class="guest-list"><tbody>' + (guestRows || '<tr><td colspan="2" class="empty-table">—</td></tr>') + '</tbody></table>' +
      '</div>';
  });

  /* ── unassigned guests ── */
  const unassigned = _guests.filter(function(g) { return !g.tableId && g.status !== 'declined'; });
  let unassignedHtml = '';
  if (unassigned.length > 0) {
    const chips = unassigned.map(function(g) {
      return '<span class="chip">' + escapeHtml(guestFullName(g)) + ' (' + (g.count || 1) + ')</span>';
    }).join('');
    unassignedHtml =
      '<div class="unassigned-section">' +
        '<h2 class="section-heading">⚠ ' + escapeHtml(unassignedStr) + ' (' + unassigned.length + ')</h2>' +
        '<div class="chip-group">' + chips + '</div>' +
      '</div>';
  }

  /* ── wedding header ── */
  const groomName  = escapeHtml((isHe ? wi.groom  : wi.groomEn)  || wi.groom  || '');
  const brideName  = escapeHtml((isHe ? wi.bride  : wi.brideEn)  || wi.bride  || '');
  const dateStr    = escapeHtml(wi.date    || '');
  const hebrewDate = escapeHtml(wi.hebrewDate || '');
  const venueName  = escapeHtml(wi.venue   || '');
  const venueAddr  = escapeHtml(wi.address || '');
  const coupleStr  = groomName && brideName ? groomName + ' & ' + brideName : groomName || brideName;

  /* ── full HTML document (auto-print script embedded) ── */
  const html =
    '<!DOCTYPE html>' +
    '<html dir="' + dir + '" lang="' + (isHe ? 'he' : 'en') + '">' +
    '<head>' +
      '<meta charset="UTF-8">' +
      '<title>' + escapeHtml(titleStr) + ' \u2014 ' + coupleStr + '</title>' +
      '<style>' +
        '*{box-sizing:border-box;margin:0;padding:0;}' +
        'body{font-family:"Segoe UI",tahoma,arial,sans-serif;font-size:11pt;color:#1a1a1a;background:#fff;padding:1.5cm 1.5cm;direction:' + dir + ';}' +
        '.page-header{text-align:center;margin-bottom:1.2cm;border-bottom:2px solid #6d3a73;padding-bottom:0.6cm;}' +
        '.page-title{font-size:22pt;font-weight:700;color:#6d3a73;letter-spacing:0.03em;}' +
        '.couple-names{font-size:16pt;margin:0.2cm 0;}' +
        '.wedding-meta{font-size:10pt;color:#555;margin-top:0.2cm;}' +
        '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(7cm,1fr));gap:0.6cm;margin-top:0.5cm;}' +
        '.table-card{border:1px solid #ccc;border-radius:6px;padding:0.5cm;break-inside:avoid;}' +
        '.table-card.full{border-color:#6d3a73;background:#fdf8f5;}' +
        '.table-header{display:flex;align-items:center;gap:0.3cm;margin-bottom:0.3cm;flex-wrap:wrap;}' +
        '.table-header strong{font-size:12pt;flex:1;}' +
        '.capacity{font-size:9pt;color:#777;white-space:nowrap;}' +
        '.shape-badge{font-size:14pt;color:#6d3a73;}' +
        '.guest-list{width:100%;border-collapse:collapse;font-size:9.5pt;}' +
        '.guest-list td{padding:0.08cm 0.1cm;border-bottom:1px solid #eee;vertical-align:middle;}' +
        '.guest-list tr:last-child td{border-bottom:none;}' +
        '.empty-table{color:#aaa;text-align:center;}' +
        '.unassigned-section{margin-top:1cm;padding-top:0.8cm;border-top:1px dashed #ccc;break-inside:avoid;}' +
        '.section-heading{font-size:12pt;font-weight:600;color:#b45309;margin-bottom:0.4cm;}' +
        '.chip-group{display:flex;flex-wrap:wrap;gap:0.3cm;}' +
        '.chip{border:1px solid #d1d5db;border-radius:4px;padding:0.05cm 0.25cm;font-size:9.5pt;background:#f9f9f9;}' +
        '.footer{text-align:center;margin-top:1.2cm;padding-top:0.4cm;border-top:1px solid #eee;font-size:8.5pt;color:#aaa;}' +
        '@media print{body{padding:1cm;}@page{margin:1.5cm;}}' +
      '</style>' +
      '<script>window.onload=function(){window.print();}<\/script>' +
    '</head>' +
    '<body>' +
      '<div class="page-header">' +
        '<div class="page-title">' + escapeHtml(titleStr) + '</div>' +
        (coupleStr ? '<div class="couple-names">\ud83d\udc8d ' + coupleStr + '</div>' : '') +
        '<div class="wedding-meta">' +
          (dateStr ? dateStr : '') +
          (hebrewDate ? '&nbsp;&nbsp;|&nbsp;&nbsp;' + hebrewDate : '') +
          (venueName  ? '&nbsp;&nbsp;|&nbsp;&nbsp;' + venueName  : '') +
          (venueAddr  ? ', ' + venueAddr : '') +
        '</div>' +
      '</div>' +
      '<div class="grid">' + tableCardsHtml + '</div>' +
      unassignedHtml +
      '<div class="footer">Wedding Manager &nbsp;&middot;&nbsp; ' + new Date().toLocaleDateString() + '</div>' +
    '</body></html>';

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const w    = window.open(url, '_blank');
  if (!w) {
    URL.revokeObjectURL(url);
    showToast(t('toast_popup_blocked'), 'error');
    return;
  }
  /* Release the object URL after 2 minutes — plenty of time to print */
  setTimeout(function() { URL.revokeObjectURL(url); }, 120000);
}

