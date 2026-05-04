var e=`<div class="card">
  <div class="card-header">
    <span class="icon">📋</span>
    <span data-i18n="audit_log_title">יומן פעולות</span>
  </div>

  <!-- Filters bar -->
  <div class="action-bar" style="margin-bottom: 1rem;">
    <div class="form-group" style="flex: 1; min-width: 160px;">
      <label for="auditLogActorFilter" data-i18n="audit_log_filter_actor">משתמש</label>
      <select id="auditLogActorFilter" class="form-input">
        <option value="" data-i18n="audit_log_all">הכל</option>
      </select>
    </div>
    <div class="form-group" style="flex: 1; min-width: 160px;">
      <label for="auditLogActionFilter" data-i18n="audit_log_filter_action">סוג פעולה</label>
      <select id="auditLogActionFilter" class="form-input">
        <option value="" data-i18n="audit_log_all">הכל</option>
        <option value="create" data-i18n="audit_log_action_create">יצירה</option>
        <option value="update" data-i18n="audit_log_action_update">עדכון</option>
        <option value="delete" data-i18n="audit_log_action_delete">מחיקה</option>
        <option value="login" data-i18n="audit_log_action_login">כניסה</option>
        <option value="export" data-i18n="audit_log_action_export">ייצוא</option>
      </select>
    </div>
    <div class="form-group" style="flex: 1; min-width: 160px;">
      <label for="auditLogDateRange" data-i18n="audit_log_filter_date">תאריך</label>
      <input type="date" id="auditLogDateRange" class="form-input" />
    </div>
  </div>

  <!-- Log entries table -->
  <div class="guest-table-wrap">
    <table class="guest-table" id="auditLogTable">
      <thead>
        <tr>
          <th data-i18n="audit_log_col_time">זמן</th>
          <th data-i18n="audit_log_col_actor">משתמש</th>
          <th data-i18n="audit_log_col_action">פעולה</th>
          <th data-i18n="audit_log_col_target">יעד</th>
          <th data-i18n="audit_log_col_details">פרטים</th>
        </tr>
      </thead>
      <tbody id="auditLogBody">
        <!-- Rows rendered by audit-log.js -->
      </tbody>
    </table>
  </div>

  <!-- Empty state -->
  <div id="auditLogEmpty" class="empty-state u-hidden">
    <span class="empty-icon">📋</span>
    <p data-i18n="audit_log_empty">אין פעולות בטווח הנבחר</p>
  </div>

  <!-- Pagination -->
  <div class="action-bar" id="auditLogPagination" style="justify-content: center; margin-top: 1rem;">
    <button class="btn btn-secondary btn-sm" data-action="audit-log:prev" data-i18n="audit_log_prev">הקודם</button>
    <span id="auditLogPageInfo" class="text-muted"></span>
    <button class="btn btn-secondary btn-sm" data-action="audit-log:next" data-i18n="audit_log_next">הבא</button>
  </div>
</div>
`;export{e as default};
//# sourceMappingURL=audit-log-CooYCgyK.js.map