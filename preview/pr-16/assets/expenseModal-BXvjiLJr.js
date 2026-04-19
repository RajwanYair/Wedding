var e=`<div
  class="modal-overlay"
  id="expenseModal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="expenseModalTitle"
>
  <div class="modal modal--narrow">
    <div class="modal-header">
      <h2 id="expenseModalTitle" data-i18n="expense_add">הוסף הוצאה</h2>
      <button
        class="modal-close"
        data-action="closeModal"
        data-action-arg="expenseModal"
        aria-label="סגור"
        data-i18n-aria="btn_close"
      >
        &times;
      </button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="expenseCategory" data-i18n="label_expense_category"
          >קטגוריה</label
        >
        <select id="expenseCategory"></select>
      </div>
      <div class="form-group">
        <label for="expenseAmount" data-i18n="label_expense_amount"
          >סכום (₪)</label
        >
        <input
          type="number"
          id="expenseAmount"
          min="0"
          step="1"
          placeholder="0"
          inputmode="numeric"
        />
      </div>
    </div>
    <div class="form-group">
      <label for="expenseDescription" data-i18n="label_expense_description"
        >תיאור</label
      >
      <input type="text" id="expenseDescription" placeholder="הערות..." />
    </div>
    <div class="form-group">
      <label for="expenseDate" data-i18n="label_expense_date">תאריך</label>
      <input type="date" id="expenseDate" />
    </div>
    <input type="hidden" id="expenseModalId" value="" />
    <div class="modal-footer">
      <button
        class="btn btn-secondary"
        data-action="closeModal"
        data-action-arg="expenseModal"
        data-i18n="btn_cancel"
      >
        ביטול
      </button>
      <button
        class="btn btn-primary"
        data-action="saveExpense"
        data-i18n="btn_save"
      >
        שמור
      </button>
    </div>
  </div>
</div>
`;export{e as default};
//# sourceMappingURL=expenseModal-BXvjiLJr.js.map