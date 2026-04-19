import{t as e}from"./rolldown-runtime-lhHHWwHU.js";var t=e({default:()=>n}),n=`<div class="card">
        <div class="card-header">
          <span class="icon">🏪</span> <span data-i18n="vendors_title">ספקים ותשלומים</span>
          <div class="section-toolbar-start" id="vendorAdminBar">
            <button class="btn btn-primary btn-small" data-action="openAddVendorModal">
              <span>➕</span> <span data-i18n="vendor_add">הוסף ספק</span>
            </button>
            <!-- S24.2 Export vendor payments CSV -->
            <button class="btn btn-ghost btn-small u-mr-xs" data-action="exportVendorPaymentsCSV" data-i18n="export_vendor_payments">📊 ייצוא תשלומים</button>
            <!-- S23.5 Overdue chip -->
            <span id="vendorOverdueChip" class="badge badge--danger" hidden></span>
          </div>
        </div>
        <div class="vendor-total-banner" id="vendorTotalBanner"></div>
        <div class="table-responsive">
          <table class="guest-table vendor-table" id="vendorList">
            <thead>
              <tr>
                <th data-i18n="label_vendor_category">קטגוריה</th>
                <th data-i18n="label_vendor_name">שם הספק</th>
                <th data-i18n="label_vendor_phone">טלפון</th>
                <th data-i18n="label_vendor_price">מחיר (₪)</th>
                <th data-i18n="label_vendor_paid">שולם (₪)</th>
                <th data-i18n="label_vendor_notes">הערות</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="vendorTableBody"></tbody>
          </table>
        </div>
        <div class="empty-state" id="vendorsEmpty" hidden>
          <div class="icon">🏪</div>
          <p data-i18n="vendors_empty">עדיין לא הוספת ספקים.</p>
        </div>
      </div>
`;export{t};
//# sourceMappingURL=template-vendors-b2gEcp2c.js.map