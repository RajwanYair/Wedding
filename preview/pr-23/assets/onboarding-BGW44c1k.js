var e=`<div class="card onboarding-wizard" id="onboardingWizard">
        <div class="card-header">
          <span class="icon">🎊</span> <span data-i18n="onboarding_title">ברוכים הבאים!</span>
        </div>
        <!-- Step indicator -->
        <div class="onboarding-steps" id="onboardingStepList" role="list">
          <span class="onboarding-step onboarding-step--active" data-step="1" role="listitem">1</span>
          <span class="onboarding-step" data-step="2" role="listitem">2</span>
          <span class="onboarding-step" data-step="3" role="listitem">3</span>
          <span class="onboarding-step" data-step="4" role="listitem">4</span>
        </div>

        <!-- Step 1: Wedding Info -->
        <div class="onboarding-panel" id="onboardingStep1">
          <h3 data-i18n="onboarding_step1_title">פרטי החתונה</h3>
          <p class="text-note" data-i18n="onboarding_step1_desc">מלאו את הפרטים הבסיסיים — ניתן לשנות בכל עת בהגדרות.</p>
          <div class="form-group">
            <label data-i18n="label_groom">שם החתן</label>
            <input id="obGroomName" type="text" class="form-control" autocomplete="off" />
          </div>
          <div class="form-group">
            <label data-i18n="label_bride">שם הכלה</label>
            <input id="obBrideName" type="text" class="form-control" autocomplete="off" />
          </div>
          <div class="form-group">
            <label data-i18n="label_date">תאריך החתונה</label>
            <input id="obDate" type="date" class="form-control" />
          </div>
          <div class="form-group">
            <label data-i18n="label_venue">מקום האירוע</label>
            <input id="obVenue" type="text" class="form-control" autocomplete="off" />
          </div>
        </div>

        <!-- Step 2: Guest Import -->
        <div class="onboarding-panel u-hidden" id="onboardingStep2">
          <h3 data-i18n="onboarding_step2_title">ייבוא אורחים</h3>
          <p class="text-note" data-i18n="onboarding_step2_desc">ניתן לדלג ולהוסיף אורחים ידנית מאוחר יותר.</p>
          <div class="form-group">
            <label data-i18n="onboarding_guest_csv_label">קובץ CSV (שם, טלפון, מספר מושבים)</label>
            <input id="obGuestCSV" type="file" accept=".csv" class="form-control" />
          </div>
          <p class="text-note" data-i18n="onboarding_guest_csv_hint">אין קובץ? לחץ "הבא" לדלג.</p>
        </div>

        <!-- Step 3: Table Count -->
        <div class="onboarding-panel u-hidden" id="onboardingStep3">
          <h3 data-i18n="onboarding_step3_title">מספר שולחנות</h3>
          <p class="text-note" data-i18n="onboarding_step3_desc">כמה שולחנות יש באולם? ניתן לשנות בכל עת.</p>
          <div class="form-group">
            <label data-i18n="onboarding_table_count_label">מספר שולחנות</label>
            <input id="obTableCount" type="number" min="1" max="200" value="10" class="form-control" />
          </div>
        </div>

        <!-- Step 4: Theme -->
        <div class="onboarding-panel u-hidden" id="onboardingStep4">
          <h3 data-i18n="onboarding_step4_title">בחרו ערכת נושא</h3>
          <div class="theme-grid" id="obThemeGrid">
            <button class="theme-swatch" data-action="onboardingPickTheme" data-action-arg="" data-i18n="theme_default">סגול</button>
            <button class="theme-swatch" data-action="onboardingPickTheme" data-action-arg="rosegold" data-i18n="theme_rosegold">רוז גולד</button>
            <button class="theme-swatch" data-action="onboardingPickTheme" data-action-arg="gold" data-i18n="theme_gold">זהב</button>
            <button class="theme-swatch" data-action="onboardingPickTheme" data-action-arg="emerald" data-i18n="theme_emerald">אמרלד</button>
            <button class="theme-swatch" data-action="onboardingPickTheme" data-action-arg="royal" data-i18n="theme_royal">רויאל</button>
          </div>
        </div>

        <!-- Navigation -->
        <div class="onboarding-nav">
          <button class="btn btn-ghost" id="onboardingBackBtn" data-action="onboardingBack" hidden>
            <span data-i18n="btn_back">חזור</span>
          </button>
          <button class="btn btn-primary" id="onboardingNextBtn" data-action="onboardingNext">
            <span data-i18n="btn_next">הבא</span>
          </button>
          <button class="btn btn-success u-hidden" id="onboardingFinishBtn" data-action="onboardingFinish">
            <span data-i18n="btn_finish">סיום!</span>
          </button>
        </div>
      </div>
`;export{e as default};
//# sourceMappingURL=onboarding-BGW44c1k.js.map