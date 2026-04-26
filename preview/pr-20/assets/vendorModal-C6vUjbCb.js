var e=`<div
  class="modal-overlay"
  id="vendorModal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="vendorModalTitle"
>
  <div class="modal">
    <div class="modal-header">
      <h2 id="vendorModalTitle" data-i18n="modal_add_vendor">הוסף ספק</h2>
      <button
        class="modal-close"
        data-action="closeModal"
        data-action-arg="vendorModal"
      >
        &times;
      </button>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label data-i18n="label_vendor_category">קטגוריה</label>
        <select id="vendorCategory">
          <option value="venue" data-i18n="vendor_cat_venue">אולם</option>
          <option value="catering" data-i18n="vendor_cat_catering">
            קייטרינג
          </option>
          <option value="photography" data-i18n="vendor_cat_photography">
            צילום
          </option>
          <option value="video" data-i18n="vendor_cat_video">וידאו</option>
          <option value="flowers" data-i18n="vendor_cat_flowers">פרחים</option>
          <option value="music" data-i18n="vendor_cat_music">מוזיקה</option>
          <option value="cake" data-i18n="vendor_cat_cake">עוגת חתונה</option>
          <option value="attire" data-i18n="vendor_cat_attire">ביגוד</option>
          <option value="transport" data-i18n="vendor_cat_transport">
            הסעות
          </option>
          <option value="other" data-i18n="vendor_cat_other">אחר</option>
        </select>
      </div>
      <div class="form-group">
        <label data-i18n="label_vendor_name">שם הספק</label>
        <input
          type="text"
          id="vendorName"
          data-i18n-placeholder="label_vendor_name"
          placeholder="שם הספק"
        />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label data-i18n="label_vendor_contact">איש קשר</label>
        <input
          type="text"
          id="vendorContact"
          data-i18n-placeholder="label_vendor_contact"
          placeholder="שם איש קשר"
        />
      </div>
      <div class="form-group">
        <label data-i18n="label_vendor_phone">טלפון</label>
        <input
          type="tel"
          id="vendorPhone"
          inputmode="tel"
          dir="ltr"
          placeholder="05X-XXXXXXX"
        />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label data-i18n="label_vendor_price">מחיר מוסכם (₪)</label>
        <input
          type="number"
          id="vendorPrice"
          min="0"
          inputmode="numeric"
          placeholder="0"
        />
      </div>
      <div class="form-group">
        <label data-i18n="label_vendor_paid">שולם (₪)</label>
        <input
          type="number"
          id="vendorPaid"
          min="0"
          inputmode="numeric"
          placeholder="0"
        />
      </div>
    </div>
    <div class="form-group">
      <label data-i18n="label_vendor_due_date">תאריך תשלום</label>
      <input
        type="date"
        id="vendorDueDate"
      />
    </div>
    <div class="form-group">
      <label data-i18n="label_vendor_notes">הערות</label>
      <textarea
        id="vendorNotes"
        rows="2"
        placeholder="הערות נוספות..."
      ></textarea>
    </div>
    <!-- S21.2 Contract URL -->
    <div class="form-group">
      <label data-i18n="label_vendor_contract_url">קישור לחוזה</label>
      <input
        type="url"
        id="vendorContractUrl"
        dir="ltr"
        placeholder="https://..."
      />
    </div>
    <!-- Sprint 6: Vendor rating -->
    <div class="form-group">
      <label data-i18n="label_vendor_rating">דירוג (1-5)</label>
      <input
        type="number"
        id="vendorRating"
        min="0"
        max="5"
        value="0"
        inputmode="numeric"
      />
    </div>
    <input type="hidden" id="vendorModalId" value="" />
    <div class="modal-actions modal-actions--mt">
      <button
        class="btn btn-secondary"
        data-action="closeModal"
        data-action-arg="vendorModal"
        data-i18n="btn_cancel"
      >
        ביטול
      </button>
      <button
        class="btn btn-primary"
        data-action="saveVendor"
        data-i18n="btn_save"
      >
        שמור
      </button>
    </div>
  </div>
</div>
`;export{e as default};
//# sourceMappingURL=vendorModal-C6vUjbCb.js.map