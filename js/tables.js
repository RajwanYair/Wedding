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

