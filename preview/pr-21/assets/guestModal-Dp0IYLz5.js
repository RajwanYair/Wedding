var e=`<div
  class="modal-overlay"
  id="guestModal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="guestModalTitle"
>
  <div class="modal modal--wide">
    <div class="modal-header">
      <h2 id="guestModalTitle" data-i18n="modal_add_guest">הוסף אורח</h2>
      <button
        class="modal-close"
        data-action="closeModal"
        data-action-arg="guestModal"
      >
        &times;
      </button>
    </div>

    <!-- SECTION: פרטים אישיים -->
    <div class="modal-section-title">
      <span class="sec-icon">👤</span>
      <span data-i18n="section_personal">פרטים אישיים</span>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label data-i18n="label_first_name">שם פרטי</label>
        <input
          type="text"
          id="guestFirstName"
          data-i18n-placeholder="ph_first_name"
          placeholder="שם פרטי"
          autocomplete="given-name"
        />
      </div>
      <div class="form-group">
        <label data-i18n="label_last_name">שם משפחה</label>
        <input
          type="text"
          id="guestLastName"
          data-i18n-placeholder="ph_last_name"
          placeholder="שם משפחה"
          autocomplete="family-name"
        />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label data-i18n="label_guest_phone">טלפון</label>
        <input
          type="tel"
          id="guestPhone"
          data-i18n-placeholder="ph_phone"
          placeholder="050-0000000"
          dir="ltr"
          autocomplete="tel"
        />
      </div>
      <div class="form-group">
        <label data-i18n="label_email">אימייל</label>
        <input
          type="email"
          id="guestEmail"
          data-i18n-placeholder="ph_email"
          placeholder="example@email.com"
          dir="ltr"
          autocomplete="email"
        />
      </div>
    </div>

    <!-- SECTION: השתתפות -->
    <div class="modal-section-title">
      <span class="sec-icon">📋</span>
      <span data-i18n="section_attendance">השתתפות</span>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="guestStatus" data-i18n="label_guest_status">סטטוס</label>
        <select id="guestStatus">
          <option value="pending" data-i18n="status_pending">ממתין</option>
          <option value="confirmed" data-i18n="status_confirmed">
            אישר הגעה
          </option>
          <option value="declined" data-i18n="status_declined">לא מגיע</option>
          <option value="maybe" data-i18n="status_maybe">אעדכן בהמשך</option>
        </select>
      </div>
      <div class="form-group">
        <label for="guestRsvpSource" data-i18n="label_rsvp_source">מקור אישור</label>
        <select id="guestRsvpSource">
          <option value="manual" data-i18n="rsvp_source_manual">ידני</option>
          <option value="web" data-i18n="rsvp_source_web">אתר</option>
          <option value="whatsapp" data-i18n="rsvp_source_whatsapp">WhatsApp</option>
          <option value="phone" data-i18n="rsvp_source_phone">טלפון</option>
          <option value="other" data-i18n="rsvp_source_other">אחר</option>
        </select>
      </div>
      <div class="form-group">
        <label for="guestSide" data-i18n="label_side">צד</label>
        <select id="guestSide">
          <option value="groom" data-i18n="side_groom">צד חתן</option>
          <option value="bride" data-i18n="side_bride">צד כלה</option>
          <option value="mutual" data-i18n="side_mutual">משותף</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group" data-i18n-tooltip="tip_guest_count">
        <label for="guestCount2" data-i18n="label_guest_count">כמות מוזמנים (כולל)</label>
        <input
          type="number"
          id="guestCount2"
          min="1"
          max="30"
          value="1"
          inputmode="numeric"
        />
      </div>
      <div class="form-group" data-i18n-tooltip="tip_guest_children">
        <label for="guestChildren" data-i18n="label_children">ילדים</label>
        <input
          type="number"
          id="guestChildren"
          min="0"
          max="20"
          value="0"
          inputmode="numeric"
        />
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="guestGroup" data-i18n="label_guest_group">קבוצה</label>
        <select id="guestGroup">
          <option value="family" data-i18n="group_family">משפחה</option>
          <option value="friends" data-i18n="group_friends">חברים</option>
          <option value="work" data-i18n="group_work">עבודה</option>
          <option value="neighbors" data-i18n="group_neighbors">שכנים</option>
          <option value="other" data-i18n="group_other">אחר</option>
        </select>
      </div>
      <div class="form-group">
        <label data-i18n="label_relationship">קשר</label>
        <input
          type="text"
          id="guestRelationship"
          data-i18n-placeholder="ph_relationship"
          placeholder="למשל: דוד, חבר ישן..."
        />
      </div>
    </div>

    <!-- SECTION: העדפות -->
    <div class="modal-section-title">
      <span class="sec-icon">🍽️</span>
      <span data-i18n="section_preferences">העדפות</span>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="guestMeal" data-i18n="label_meal">ארוחה</label>
        <select id="guestMeal">
          <option value="regular" data-i18n="meal_regular">רגיל</option>
          <option value="vegetarian" data-i18n="meal_vegetarian">צמחוני</option>
          <option value="vegan" data-i18n="meal_vegan">טבעוני</option>
          <option value="kosher" data-i18n="meal_kosher">מהדרין</option>
          <option value="gluten_free" data-i18n="meal_gluten_free">
            ללא גלוטן
          </option>
          <option value="other" data-i18n="meal_other">אחר</option>
        </select>
      </div>
      <div
        class="form-group form-group--checkbox-col"
        data-i18n-tooltip="tip_guest_accessibility"
      >
        <label class="form-checkbox">
          <input type="checkbox" id="guestAccessibility" />
          <span data-i18n="label_accessibility">צרכי נגישות</span>
        </label>
      </div>
    </div>
    <div class="form-group" data-i18n-tooltip="tip_guest_transport">
      <label for="guestTransport" data-i18n="label_transport">הסעה</label>
      <select id="guestTransport">
        <option value="" data-i18n="transport_none">ללא הסעה</option>
        <option value="tefachot" data-i18n="transport_tefachot">
          ישיבת תפחות
        </option>
        <option value="jerusalem" data-i18n="transport_jerusalem">
          ירושלים
        </option>
      </select>
    </div>
    <div class="form-group">
      <label data-i18n="label_meal_notes">הערות ארוחה / אלרגיות</label>
      <input
        type="text"
        id="guestMealNotes"
        data-i18n-placeholder="ph_meal_notes"
        placeholder="פרט דרישות מזון מיוחדות..."
      />
    </div>

    <!-- SECTION: שיוך ופרטים -->
    <div class="modal-section-title">
      <span class="sec-icon">🪑</span>
      <span data-i18n="section_seating">שיוך לשולחן</span>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label for="guestTableSelect" data-i18n="label_guest_table">שולחן</label>
        <select id="guestTableSelect">
          <option value="" data-i18n="no_table">ללא שולחן</option>
        </select>
      </div>
      <div class="form-group" data-i18n-tooltip="tip_guest_gift">
        <label data-i18n="label_gift">מתנה</label>
        <input
          type="text"
          id="guestGift"
          data-i18n-placeholder="ph_gift"
          placeholder="תיאור המתנה..."
        />
      </div>
    </div>
    <div class="form-group">
      <label data-i18n="label_guest_notes">הערות כלליות</label>
      <textarea
        id="guestNotes"
        rows="2"
        data-i18n-placeholder="ph_notes"
        placeholder="הערות נוספות"
      ></textarea>
    </div>

    <input type="hidden" id="guestModalId" value="" />

    <div id="guestHistoryLog" class="guest-history-log"></div>

    <div class="modal-actions modal-actions--mt-lg">
      <button
        class="btn btn-secondary"
        data-action="closeModal"
        data-action-arg="guestModal"
        data-i18n="btn_cancel"
      >
        ביטול
      </button>
      <button
        class="btn btn-primary"
        id="btnSaveGuest"
        data-action="saveGuest"
        data-i18n="btn_save"
      >
        שמור
      </button>
    </div>
  </div>
</div>
`;export{e as default};
//# sourceMappingURL=guestModal-Dp0IYLz5.js.map