'use strict';

/* ── Guest Management ── */
/* ── Guests ── */
function renderGuests() {
  const q = (el.guestSearch.value || '').trim().toLowerCase();
  let list = _guests.slice();

  // Sort
  if (_sortCol) {
    list.sort(function(a, b) {
      const av = (a[_sortCol] || '').toString().toLowerCase();
      const bv = (b[_sortCol] || '').toString().toLowerCase();
      return _sortAsc ? av.localeCompare(bv, 'he') : bv.localeCompare(av, 'he');
    });
  }

  // Filter by status
  if (_currentFilter !== 'all') {
    list = list.filter(function(g) { return g.status === _currentFilter; });
  }
  // Filter by side
  if (_sideFilter !== 'all') {
    list = list.filter(function(g) { return (g.side || 'mutual') === _sideFilter; });
  }
  // Search
  if (q) {
    list = list.filter(function(g) {
      const full = ((g.firstName || '') + ' ' + (g.lastName || '')).toLowerCase();
      return full.includes(q) || (g.phone || '').includes(q) || (g.relationship || '').toLowerCase().includes(q);
    });
  }

  el.guestsEmpty.style.display = (list.length === 0 && !q && _currentFilter === 'all' && _sideFilter === 'all') ? 'block' : 'none';

  const frag = document.createDocumentFragment();
  list.forEach(function(g) {
    const tr = document.createElement('tr');
    const tableName   = g.tableId ? getTableName(g.tableId) : '—';
    const statusClass = 'status-' + g.status;
    const sideClass   = 'side-' + (g.side || 'mutual');
    const mealClass   = 'meal-' + (g.meal || 'regular');
    const sideKey     = g.side || 'mutual';
    const mealKey     = g.meal || 'regular';
    const statusKey   = g.status || 'pending';
    const accessHtml  = g.accessibility ? ' <span class="chip-access" title="' + t('label_accessibility') + '">♿</span>' : '';

    tr.innerHTML =
      '<td><strong>' + escapeHtml(g.firstName || '') + '</strong></td>' +
      '<td>' + escapeHtml(g.lastName || '') + '</td>' +
      '<td><span class="side-badge ' + sideClass + '"><span class="badge-icon">' + (SIDE_ICON[sideKey] || '') + '</span> ' + t('side_' + sideKey) + '</span></td>' +
      '<td dir="ltr" style="text-align:right;">' + (g.phone ? '📞 ' : '') + escapeHtml(g.phone || '') + '</td>' +
      '<td>' + (g.count || 1) + (g.children ? ' +' + g.children + '👶' : '') + '</td>' +
      '<td><span class="meal-badge ' + mealClass + '"><span class="badge-icon">' + (MEAL_ICON[mealKey] || '') + '</span> ' + t('meal_' + mealKey) + '</span>' + accessHtml + '</td>' +
      '<td><span class="status-badge ' + statusClass + '"><span class="badge-icon">' + (STATUS_ICON[statusKey] || '') + '</span> ' + t('status_' + statusKey) + '</span></td>' +
      '<td>' + (tableName !== '—' ? '🪑 ' : '') + escapeHtml(tableName) + '</td>' +
      '<td style="white-space:nowrap;">' +
        '<button class="btn btn-secondary btn-small" onclick="editGuest(\'' + g.id + '\')" title="' + t('btn_edit') + '">✏️</button> ' +
        '<button class="btn btn-danger btn-small"    onclick="deleteGuest(\'' + g.id + '\')" title="' + t('btn_delete') + '">🗑️</button> ' +
        '<button class="btn btn-whatsapp btn-small"  onclick="sendWhatsAppSingle(\'' + g.id + '\')" title="WhatsApp">📱</button>' +
      '</td>';
    frag.appendChild(tr);
  });

  el.guestTableBody.innerHTML = '';
  el.guestTableBody.appendChild(frag);
}

function filterGuests() { renderGuests(); }

function setFilter(f) {
  _currentFilter = f;
  document.querySelectorAll('[data-filter]').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === f);
  });
  renderGuests();
}

function setSideFilter(f) {
  _sideFilter = f;
  document.querySelectorAll('[data-side]').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-side') === f);
  });
  renderGuests();
}

function sortGuestsBy(col) {
  if (_sortCol === col) { _sortAsc = !_sortAsc; }
  else { _sortCol = col; _sortAsc = true; }
  // Update sort indicators
  document.querySelectorAll('[id^="si-"]').forEach(function(s) { s.textContent = '↕'; });
  const ind = document.getElementById('si-' + col);
  if (ind) ind.textContent = _sortAsc ? '↑' : '↓';
  renderGuests();
}

function openAddGuestModal() {
  _editingGuestId = null;
  document.getElementById('guestModalTitle').textContent = t('modal_add_guest');
  document.getElementById('guestFirstName').value   = '';
  document.getElementById('guestLastName').value    = '';
  document.getElementById('guestPhone').value       = '';
  document.getElementById('guestEmail').value       = '';
  document.getElementById('guestCount2').value      = '1';
  document.getElementById('guestChildren').value    = '0';
  document.getElementById('guestStatus').value      = 'pending';
  document.getElementById('guestSide').value        = 'groom';
  document.getElementById('guestGroup').value       = 'family';
  document.getElementById('guestRelationship').value= '';
  document.getElementById('guestMeal').value        = 'regular';
  document.getElementById('guestMealNotes').value   = '';
  document.getElementById('guestAccessibility').checked = false;
  document.getElementById('guestGift').value        = '';
  document.getElementById('guestNotes').value       = '';
  populateTableSelect();
  document.getElementById('guestTableSelect').value = '';
  openModal('guestModal');
}

function editGuest(id) {
  const g = _guests.find(function(x) { return x.id === id; });
  if (!g) return;
  _editingGuestId = id;
  document.getElementById('guestModalTitle').textContent = t('modal_edit_guest');
  document.getElementById('guestFirstName').value   = g.firstName  || '';
  document.getElementById('guestLastName').value    = g.lastName   || '';
  document.getElementById('guestPhone').value       = g.phone      || '';
  document.getElementById('guestEmail').value       = g.email      || '';
  document.getElementById('guestCount2').value      = g.count      || 1;
  document.getElementById('guestChildren').value    = g.children   || 0;
  document.getElementById('guestStatus').value      = g.status     || 'pending';
  document.getElementById('guestSide').value        = g.side       || 'groom';
  document.getElementById('guestGroup').value       = g.group      || 'family';
  document.getElementById('guestRelationship').value= g.relationship|| '';
  document.getElementById('guestMeal').value        = g.meal       || 'regular';
  document.getElementById('guestMealNotes').value   = g.mealNotes  || '';
  document.getElementById('guestAccessibility').checked = !!g.accessibility;
  document.getElementById('guestGift').value        = g.gift       || '';
  document.getElementById('guestNotes').value       = g.notes      || '';
  populateTableSelect();
  document.getElementById('guestTableSelect').value = g.tableId    || '';
  openModal('guestModal');
}

function saveGuest() {
  if (!_authUser || !_authUser.isAdmin) return;
  const firstName = sanitizeInput(document.getElementById('guestFirstName').value, 100);
  if (!firstName) { document.getElementById('guestFirstName').focus(); return; }

  const data = {
    firstName:   firstName,
    lastName:    sanitizeInput(document.getElementById('guestLastName').value, 100),
    phone:       sanitizeInput(document.getElementById('guestPhone').value, 20),
    email:       sanitizeInput(document.getElementById('guestEmail').value, 254),
    count:       Math.max(1, Math.min(50, parseInt(document.getElementById('guestCount2').value, 10) || 1)),
    children:    Math.max(0, Math.min(50, parseInt(document.getElementById('guestChildren').value, 10) || 0)),
    status:      document.getElementById('guestStatus').value,
    side:        document.getElementById('guestSide').value,
    group:       document.getElementById('guestGroup').value,
    relationship:sanitizeInput(document.getElementById('guestRelationship').value, 100),
    meal:        document.getElementById('guestMeal').value,
    mealNotes:   sanitizeInput(document.getElementById('guestMealNotes').value, 300),
    accessibility: document.getElementById('guestAccessibility').checked,
    tableId:     document.getElementById('guestTableSelect').value,
    gift:        sanitizeInput(document.getElementById('guestGift').value, 200),
    notes:       sanitizeInput(document.getElementById('guestNotes').value, 500),
    updatedAt:   new Date().toISOString(),
  };

  if (_editingGuestId) {
    const g = _guests.find(function(x) { return x.id === _editingGuestId; });
    if (g) Object.assign(g, data);
  } else {
    _guests.push(Object.assign({ id: uid(), sent: false, rsvpDate: '', createdAt: new Date().toISOString() }, data));
  }

  saveAll();
  syncGuestsToSheets();
  closeModal('guestModal');
  renderGuests();
  renderStats();
  showToast(t('toast_guest_saved'), 'success');
}

function deleteGuest(id) {
  if (!_authUser || !_authUser.isAdmin) return;
  if (!confirm(t('confirm_delete'))) return;
  _guests = _guests.filter(function(g) { return g.id !== id; });
  saveAll();
  syncGuestsToSheets();
  renderGuests();
  renderStats();
  showToast(t('toast_guest_deleted'), 'error');
}

