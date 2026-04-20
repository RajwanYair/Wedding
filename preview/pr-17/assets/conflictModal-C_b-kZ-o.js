var e=`<div class="modal-overlay" id="conflictModal" role="dialog" aria-modal="true" aria-labelledby="conflictModalTitle">
  <div class="modal-content modal-lg">
    <div class="modal-header">
      <h3 id="conflictModalTitle" data-i18n="conflict_title">התנגשויות סנכרון</h3>
      <button class="modal-close" data-action="closeModal" aria-label="סגור" data-i18n-aria="btn_close">&times;</button>
    </div>
    <div class="modal-body">
      <p data-i18n="conflict_description">נמצאו שינויים שונים בין הגרסה המקומית לגיליון. בחר איזו גרסה לשמור:</p>
      <div id="conflictList" class="conflict-list"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-action="conflictAcceptAllLocal" data-i18n="conflict_keep_local">שמור מקומי</button>
      <button class="btn btn-secondary" data-action="conflictAcceptAllRemote" data-i18n="conflict_keep_remote">שמור מרוחק</button>
      <button class="btn btn-primary" data-action="conflictApplySelected" data-i18n="conflict_apply_selected">החל בחירות</button>
    </div>
  </div>
</div>
`;export{e as default};
//# sourceMappingURL=conflictModal-C_b-kZ-o.js.map