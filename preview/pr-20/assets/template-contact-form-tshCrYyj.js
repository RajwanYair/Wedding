import{t as e}from"./rolldown-runtime-lhHHWwHU.js";var t=e({default:()=>n}),n=`<div class="card card--narrow">
        <div class="card-header">
          <span class="icon">📋</span> <span data-i18n="contact_title">שלחו לנו את הפרטים שלכם</span>
        </div>
        <p class="section-subtitle" data-i18n="contact_subtitle">מלאו את הפרטים למטה ונוסיף אתכם לרשימת האורחים שלנו</p>

        <!-- Success state (hidden by default) -->
        <div id="contactFormSuccess" class="contact-success u-hidden">
          <div class="empty-emoji-xl">🎉</div>
          <p class="contact-success-title" data-i18n="contact_success_title">תודה רבה!</p>
          <p class="contact-success-sub" data-i18n="contact_success_sub">הפרטים שלכם נשלחו בהצלחה. נשמח לראותכם!</p>
        </div>

        <!-- Form fields -->
        <div id="contactFormFields">
          <div class="u-text-center u-mb-md">
            <span id="contactFormCoupleName"></span>
            <br>
            <span id="contactFormDate"></span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label data-i18n="label_first_name">שם פרטי *</label>
              <input type="text" id="ccFirstName" data-i18n-placeholder="ph_first_name" placeholder="שם פרטי" autocomplete="given-name" enterkeyhint="next" required minlength="2">
            </div>
            <div class="form-group">
              <label data-i18n="label_last_name">שם משפחה</label>
              <input type="text" id="ccLastName" data-i18n-placeholder="ph_last_name" placeholder="שם משפחה" autocomplete="family-name">
            </div>
          </div>
          <div class="form-group">
            <label data-i18n="label_guest_phone">טלפון</label>
            <input type="tel" id="ccPhone" data-i18n-placeholder="ph_phone" placeholder="050-0000000" dir="ltr" autocomplete="tel" inputmode="tel" enterkeyhint="next" required minlength="9" pattern="[0-9+\\-\\s]*">
          </div>
          <div class="form-group">
            <label data-i18n="label_email">אימייל</label>
            <input type="email" id="ccEmail" data-i18n-placeholder="ph_email" placeholder="example@email.com" dir="ltr" autocomplete="email" enterkeyhint="done">
          </div>
          <div class="form-group">
            <label data-i18n="label_side">צד</label>
            <select id="ccSide">
              <option value="groom"  data-i18n="side_groom">צד חתן</option>
              <option value="bride"  data-i18n="side_bride">צד כלה</option>
              <option value="mutual" data-i18n="side_mutual">משותף</option>
            </select>
          </div>
          <button class="btn btn-primary btn-submit-full u-mt-sm"
            data-action="submitContactForm">
            💌 <span data-i18n="contact_submit">שלח פרטים</span>
          </button>
          <p class="form-disclaimer"
            data-i18n="contact_privacy">הפרטים ישמשו לניהול האירוע בלבד ולא יועברו לצד שלישי</p>
        </div>
      </div>`;export{t};
//# sourceMappingURL=template-contact-form-tshCrYyj.js.map