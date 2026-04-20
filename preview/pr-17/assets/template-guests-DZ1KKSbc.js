import{t as e}from"./rolldown-runtime-lhHHWwHU.js";var t=e({default:()=>n}),n=`<div class="card">
  <div class="card-header">
    <span class="icon">👥</span>
    <span data-i18n="guests_title">רשימת אורחים</span>
    <div class="u-mr-auto">
      <button class="btn btn-primary btn-small" data-action="openAddGuestModal">
        <span>➕</span> <span data-i18n="action_add_guest">הוסף אורח</span>
      </button>
    </div>
  </div>

  <!-- Toolbar -->
  <div class="guests-toolbar">
    <input
      type="search"
      class="search-box"
      id="guestSearch"
      data-i18n-placeholder="search_guests"
      placeholder="חיפוש שם, משפחה, טלפון..."
      data-on-input="searchGuests"
      data-i18n-tooltip="tip_search_guests"
    />
    <div class="toolbar-group">
      <span class="toolbar-label">סטטוס:</span>
      <button
        class="filter-btn active"
        data-filter="all"
        data-action="setFilter"
        data-action-arg="all"
        data-i18n="filter_all"
      >
        הכל
      </button>
      <button
        class="filter-btn"
        data-filter="confirmed"
        data-action="setFilter"
        data-action-arg="confirmed"
        data-i18n="filter_confirmed"
      >
        אישרו
      </button>
      <button
        class="filter-btn"
        data-filter="pending"
        data-action="setFilter"
        data-action-arg="pending"
        data-i18n="filter_pending"
      >
        ממתינים
      </button>
      <button
        class="filter-btn"
        data-filter="declined"
        data-action="setFilter"
        data-action-arg="declined"
        data-i18n="filter_declined"
      >
        לא מגיעים
      </button>
    </div>
    <div class="toolbar-group">
      <span class="toolbar-label">צד:</span>
      <button
        class="filter-btn active"
        data-side="all"
        data-action="setSideFilter"
        data-action-arg="all"
      >
        הכל
      </button>
      <button
        class="filter-btn"
        data-side="groom"
        data-action="setSideFilter"
        data-action-arg="groom"
        data-i18n="side_groom"
      >
        צד חתן
      </button>
      <button
        class="filter-btn"
        data-side="bride"
        data-action="setSideFilter"
        data-action-arg="bride"
        data-i18n="side_bride"
      >
        צד כלה
      </button>
      <button
        class="filter-btn"
        data-side="mutual"
        data-action="setSideFilter"
        data-action-arg="mutual"
        data-i18n="side_mutual"
      >
        משותפ
      </button>
    </div>
  </div>

  <!-- S11.4 Batch Action Toolbar -->
  <div class="batch-toolbar u-hidden" id="batchToolbar">
    <span id="batchCount" class="u-mr-sm"></span>
    <select id="batchStatusSelect" class="u-mr-sm">
      <option value="" data-i18n="batch_set_status">שנה סטטוס</option>
      <option value="confirmed" data-i18n="status_confirmed">אישרו</option>
      <option value="pending" data-i18n="status_pending">ממתינים</option>
      <option value="declined" data-i18n="status_declined">לא מגיעים</option>
      <option value="maybe" data-i18n="status_maybe">אולי</option>
    </select>
    <button class="btn btn-primary btn-small" data-action="batchSetStatus" data-i18n="batch_apply">החל</button>
    <button class="btn btn-danger btn-small" data-action="batchDeleteGuests" data-i18n="batch_delete">מחק נבחרים</button>
  </div>

  <!-- Table -->
  <div class="guest-table-wrap">
    <table class="guest-table" id="guestTable">
      <thead>
        <tr>
          <th class="th-checkbox"><input type="checkbox" id="selectAllGuests" data-action="toggleSelectAll" /></th>
          <th
            id="th-firstName"
            data-action="sortGuestsBy"
            data-action-arg="firstName"
            data-i18n="col_first_name"
          >
            שם פרטי <span class="sort-indicator" id="si-firstName">⇕</span>
          </th>
          <th
            id="th-lastName"
            data-action="sortGuestsBy"
            data-action-arg="lastName"
            data-i18n="col_last_name"
          >
            שם משפחה <span class="sort-indicator" id="si-lastName">⇕</span>
          </th>
          <th data-i18n="col_side">צד</th>
          <th data-i18n="col_phone">טלפון</th>
          <th data-i18n="col_guests_count">אורחים</th>
          <th data-i18n="col_meal">ארוחה</th>
          <th data-i18n="col_transport">הסעה</th>
          <th data-i18n="col_status">סטטוס</th>
          <th data-i18n="col_table">שולחן</th>
          <th data-i18n="col_actions">פעולות</th>
        </tr>
      </thead>
      <tbody id="guestTableBody"></tbody>
    </table>
  </div>

  <!-- Empty State -->
  <div class="empty-state" id="guestsEmpty">
    <div class="icon">🎊</div>
    <p data-i18n="guests_empty">
      עדיין לא הוספת אורחים. לחץ על "הוסף אורח" כדי להתחיל!
    </p>
    <p class="empty-sub">👆 ➕</p>
  </div>
</div>

<!-- S12.2 Duplicate Detection -->
<div class="card" id="duplicateDetectionCard">
  <div class="card-header">
    <span class="icon">🔍</span>
    <span data-i18n="duplicates_title">זיהוי כפילויות</span>
    <div class="section-toolbar-start">
      <button class="btn btn-secondary btn-small" data-action="scanDuplicates">
        <span>🔍</span> <span data-i18n="scan_duplicates">סרוק כפילויות</span>
      </button>
    </div>
  </div>
  <div id="duplicateResults"></div>
</div>
`;export{t};
//# sourceMappingURL=template-guests-DZ1KKSbc.js.map