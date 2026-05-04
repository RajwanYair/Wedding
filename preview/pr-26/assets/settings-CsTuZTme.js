var e=`<div class="card">
  <div class="card-header">
    <span class="icon">⚙️</span>
    <span data-i18n="settings_title">הגדרות ונתונים</span>
  </div>
  <div class="settings-grid">
    <!-- Backend Selection -->
    <div class="settings-card">
      <h3>🔗 <span data-i18n="backend_title">בחירת מסד נתונים</span></h3>
      <p data-i18n="backend_desc">
        בחר היכן לשמור את הנתונים — Google Sheets (ברירת מחדל), Supabase, או שניהם במקביל
      </p>
      <div class="form-group">
        <label for="backendTypeSelect" data-i18n="backend_type_label"
          >סוג Backend</label
        >
        <select id="backendTypeSelect" class="form-input">
          <option value="sheets" data-i18n="backend_sheets">
            Google Sheets
          </option>
          <option value="supabase" data-i18n="backend_supabase">
            Supabase
          </option>
          <option value="both" data-i18n="backend_both">
            Google Sheets + Supabase (במקביל)
          </option>
          <option value="none" data-i18n="backend_none">
            בלי (localStorage בלבד)
          </option>
        </select>
      </div>
      <button class="btn btn-primary btn-small" data-action="saveBackendType">
        💾 <span data-i18n="backend_save">שמור</span>
      </button>
      <div id="backendStatusBadge" class="u-mt-xs"></div>
    </div>

    <!-- Google Sheets Sync -->
    <div class="settings-card">
      <h3>📊 <span data-i18n="sheets_title">Google Sheets סנכרון</span></h3>
      <p data-i18n="sheets_desc">
        הגיליון המשותף הוא מסד הנתונים הראשי — נטען ומסונכרן אוטומטית בכל 30
        שניות
      </p>
      <div id="sheetsBadge">
        &#x1F534;
        <span data-i18n="sheets_status_off">Google Sheets לא מחובר</span>
      </div>

      <!-- Apps Script Web App URL -->
      <label
        for="sheetsWebAppUrl"
        class="sheets-label"
        data-i18n="sheets_webapp_label"
        >כתובת Apps Script Web App</label
      >
      <div class="sheets-url-row">
        <input
          id="sheetsWebAppUrl"
          type="url"
          class="form-input"
          data-i18n-placeholder="ph_sheets_webapp_url"
          placeholder="https://script.google.com/macros/s/..."
        />
        <button
          class="btn btn-secondary"
          data-action="saveWebAppUrl"
          data-i18n="sheets_webapp_save"
        >
          שמור
        </button>
      </div>
      <label
        for="sheetsSpreadsheetId"
        class="sheets-label"
        data-i18n="sheets_id_input_label"
        >מזהה Google Sheets</label
      >
      <div class="sheets-url-row">
        <input
          id="sheetsSpreadsheetId"
          type="text"
          class="form-input"
          dir="ltr"
          data-i18n-placeholder="ph_sheets_spreadsheet_id"
          placeholder="1abc123..."
        />
      </div>
      <p class="text-hint" data-i18n="sheets_webapp_hint">
        פרוס את <code>.github/scripts/sheets-webapp.gs</code> כ-Web App ב-Google
        Apps Script, ולאחר מכן הדבק כאן את ה-URL
      </p>

      <!-- Action buttons -->
      <div class="sheets-actions">
        <button
          class="btn btn-secondary"
          data-action="syncSheetsNow"
          data-i18n-tooltip="tip_sheets_sync"
        >
          🔄 <span data-i18n="sheets_sync_btn">סנכרן עכשיו</span>
        </button>
        <button class="btn btn-primary" data-action="pushAllToSheets">
          📤 <span data-i18n="sheets_push_all">שלח הכל ל-Google Sheets</span>
        </button>
        <button class="btn btn-primary" data-action="pullFromSheets">
          📥 <span data-i18n="sheets_pull_btn">שלוף מ-Google Sheets</span>
        </button>
        <button class="btn btn-secondary" data-action="createMissingSheetTabs">
          ➕ <span data-i18n="sheets_create_tabs">צור טאבים חסרים</span>
        </button>
        <button class="btn btn-secondary" data-action="cleanConfigDuplicates">
          🧹 <span data-i18n="sheets_clean_config">נקה מפתחות כפולים</span>
        </button>
        <button class="btn btn-secondary" data-action="sheetsCheckConnection">
          🔌 <span data-i18n="sheets_test_btn">בדוק חיבור</span>
        </button>
        <!-- S10.1 Live sync toggle -->
        <div class="live-sync-row">
          <label class="toggle-label">
            <input type="checkbox" id="liveSyncToggle" data-action="toggleLiveSync">
            <span data-i18n="live_sync_label">סנכרון חי (כל 30 שניות)</span>
          </label>
        </div>
      </div>
      <!-- GS version / connectivity indicator -->
      <div id="sheetsGsVersion"></div>

      <!-- Sheet info -->
      <p class="sheets-info">
        <span data-i18n="sheets_id_label">Sheet ID:</span>
        <code class="sheets-code" id="sheetsSpreadsheetIdValue">—</code><br />
        <a
          id="sheetsSpreadsheetLink"
          class="u-hidden"
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          data-i18n="sheets_open_link"
          >פתח ב-Google Sheets ↗</a
        >
      </p>
    </div>

    <!-- Supabase -->
    <div class="settings-card">
      <h3>🟢 <span data-i18n="supabase_title">Supabase</span></h3>
      <p data-i18n="supabase_desc">
        חבר פרויקט Supabase לסנכרון בזמן אמת עם מסד נתונים PostgreSQL
      </p>
      <div class="form-group">
        <label for="supabaseUrl" data-i18n="supabase_url_label"
          >Supabase URL</label
        >
        <input
          id="supabaseUrl"
          type="url"
          class="form-input"
          dir="ltr"
          placeholder="https://xxxxx.supabase.co"
        />
      </div>
      <div class="form-group">
        <label for="supabaseAnonKey" data-i18n="supabase_key_label"
          >Anon Key</label
        >
        <input
          id="supabaseAnonKey"
          type="password"
          class="form-input"
          dir="ltr"
          placeholder="eyJhbGciOi..."
          autocomplete="off"
        />
      </div>
      <div class="settings-btn-row">
        <button
          class="btn btn-primary btn-small"
          data-action="saveSupabaseConfig"
        >
          💾 <span data-i18n="supabase_save">שמור</span>
        </button>
        <button
          class="btn btn-secondary btn-small"
          data-action="supabaseCheckConnection"
        >
          🔌 <span data-i18n="supabase_test_btn">בדוק חיבור</span>
        </button>
      </div>
      <p class="text-hint" data-i18n="supabase_hint">
        צור פרויקט חינמי ב-<a
          href="https://supabase.com"
          target="_blank"
          rel="noopener noreferrer"
          >supabase.com</a
        >, צור טבלאות (guests, tables, vendors, expenses, config, rsvp_log)
        והדבק כאן את ה-URL וה-Anon Key
      </p>
    </div>

    <!-- Backup & Restore -->
    <div class="settings-card">
      <h3>🗄️ <span data-i18n="backup_title">גיבוי ושחזור</span></h3>
      <p data-i18n="backup_desc">
        ייצא/ייבא גיבוי מלא של כל הנתונים בפורמט JSON
      </p>
      <button
        class="btn btn-primary"
        data-action="exportJSON"
        data-i18n-tooltip="tip_backup_export"
      >
        📦 <span data-i18n="backup_export">ייצוא גיבוי JSON</span>
      </button>
      <label
        class="btn btn-secondary btn-upload"
        data-i18n-tooltip="tip_backup_import"
      >
        📂 <span data-i18n="backup_import">ייבוא גיבוי JSON</span>
        <input
          type="file"
          id="importJsonFile"
          accept=".json"
          data-on-change="importJSON"
          class="u-hidden"
        />
      </label>
    </div>

    <!-- Auto-backup Scheduler (S217) -->
    <div class="settings-card">
      <h3>⏱️ <span data-i18n="autobackup_title">גיבוי אוטומטי</span></h3>
      <p data-i18n="autobackup_desc">גיבוי אוטומטי שומר תמונת מצב כל 30 דקות.</p>
      <div class="form-row">
        <label for="autoBackupInterval" data-i18n="autobackup_interval">מרווח (דקות)</label>
        <input type="number" id="autoBackupInterval" class="input-sm" value="30" min="5" max="120" />
      </div>
      <p class="u-text-muted u-text-sm">
        <span data-i18n="autobackup_never">טרם בוצע</span>:
        <span id="lastBackupTime">—</span>
      </p>
      <div class="btn-group">
        <button class="btn btn-primary btn-small" data-action="startAutoBackup" type="button">
          ▶ <span data-i18n="autobackup_start">הפעל גיבוי</span>
        </button>
        <button class="btn btn-secondary btn-small" data-action="stopAutoBackup" type="button">
          ■ <span data-i18n="autobackup_stop">עצור גיבוי</span>
        </button>
        <button class="btn btn-secondary btn-small" data-action="downloadAutoBackup" type="button">
          ⬇ <span data-i18n="autobackup_download">הורד גיבוי</span>
        </button>
        <button class="btn btn-secondary btn-small" data-action="restoreAutoBackup" type="button">
          ↩ <span data-i18n="autobackup_restore">שחזר מגיבוי</span>
        </button>
      </div>
    </div>

    <!-- CSV Import/Export -->
    <div class="settings-card">
      <h3>📊 <span data-i18n="import_csv_title">ייבוא / ייצוא CSV</span></h3>
      <p data-i18n="import_csv_desc">
        ייבא רשימת אורחים מקובץ אקסל / ייצא לאקסל
      </p>
      <button
        class="btn btn-secondary"
        data-action="downloadCSVTemplate"
        data-i18n-tooltip="tip_csv_template"
      >
        📋 <span data-i18n="import_csv_template">הורד תבנית CSV</span>
      </button>
      <label
        class="btn btn-secondary btn-upload"
        data-i18n-tooltip="tip_csv_import"
      >
        📥 <span data-i18n="import_csv_btn">ייבוא מ-CSV</span>
        <input
          type="file"
          id="importCsvFile"
          accept=".csv,.txt"
          data-on-change="importGuestsCSV"
          class="u-hidden"
        />
      </label>
      <button
        class="btn btn-secondary btn-upload"
        data-action="exportGuestsCSV"
      >
        📤 <span data-i18n="action_export">ייצוא CSV</span>
      </button>
    </div>

    <!-- Data Tools (S217) -->
    <div class="settings-card">
      <h3>🔧 <span data-i18n="data_tools_title">כלי נתונים</span></h3>
      <div class="btn-group">
        <button class="btn btn-secondary btn-small" data-action="exportAllCSV" type="button">
          📦 <span data-i18n="export_all_csv">ייצוא הכל ל-CSV</span>
        </button>
        <button class="btn btn-secondary btn-small" data-action="checkDataIntegrity" type="button">
          🔍 <span data-i18n="check_data_integrity">בדיקת תקינות נתונים</span>
        </button>
        <button class="btn btn-secondary btn-small" data-action="exportDebugReport" type="button">
          🐛 <span data-i18n="export_debug_report">ייצוא דוח ניפוי שגיאות</span>
        </button>
      </div>
    </div>

    <!-- S455: Guest Duplicate Detection -->
    <div class="settings-card" id="cardGuestDedup">
      <h3>👥 <span data-i18n="dedup_title">זיהוי כפילויות באורחים</span></h3>
      <p data-i18n="dedup_desc">חפש אורחים כפולים לפי טלפון או שם ומזג אותם.</p>
      <div class="btn-group">
        <button class="btn btn-secondary btn-small" data-action="findGuestDuplicates" type="button">
          🔍 <span data-i18n="dedup_find_btn">מצא כפילויות</span>
        </button>
      </div>
      <div id="dedupResults" class="u-mt-sm"></div>
    </div>

    <!-- QR Code for RSVP -->
    <div class="settings-card">
      <h3>📲 <span data-i18n="qr_title">QR Code לאישור הגעה</span></h3>
      <p class="qr-section-desc" data-i18n="qr_desc">
        שתף את הקוד עם האורחים לאישור הגעה מהיר מהנייד
      </p>
      <div class="u-text-center u-mb-sm">
        <img
          id="rsvpQrImage"
          alt="QR Code for RSVP"
          loading="lazy"
          decoding="async"
          width="180"
          height="180"
        />
      </div>
      <p class="qr-link-wrap">
        <a
          id="rsvpQrLink"
          href=""
          target="_blank"
          rel="noopener noreferrer"
          aria-label="RSVP link"
        ></a>
      </p>
      <div class="qr-actions">
        <button class="btn btn-secondary" data-action="printRsvpQr">
          🖨️ <span data-i18n="qr_print">הדפס QR</span>
        </button>
        <button class="btn btn-secondary" data-action="copyRsvpLink">
          📋 <span data-i18n="qr_copy_link">העתק קישור</span>
        </button>
      </div>
    </div>

    <!-- S429: Multi-locale selector -->
    <div class="settings-card">
      <h3>🌐 <span data-i18n="locale_picker_title">שפת הממשק</span></h3>
      <p class="section-desc" data-i18n="locale_picker_desc">בחר שפה לתצוגת האפליקציה</p>
      <div id="localeSelector" class="locale-selector" role="group" aria-label="language selector"></div>
    </div>

    <!-- Theme Picker (Sprint 74) -->
    <div class="settings-card">
      <h3>🎨 <span data-i18n="theme_picker_title">ערכת צבעים</span></h3>
      <p class="section-desc" data-i18n="theme_picker_desc">בחר ערכת עיצוב לאפליקציה</p>
      <div id="themePicker" class="theme-picker" role="radiogroup" aria-label="theme picker">
        <button
          class="theme-swatch theme-swatch--default"
          data-action="setTheme"
          data-action-arg="default"
          title="Default"
          aria-label="Default"
          type="button"
        ></button>
        <button
          class="theme-swatch theme-swatch--rosegold"
          data-action="setTheme"
          data-action-arg="rosegold"
          title="Rose Gold"
          aria-label="Rose Gold"
          type="button"
        ></button>
        <button
          class="theme-swatch theme-swatch--gold"
          data-action="setTheme"
          data-action-arg="gold"
          title="Gold"
          aria-label="Gold"
          type="button"
        ></button>
        <button
          class="theme-swatch theme-swatch--emerald"
          data-action="setTheme"
          data-action-arg="emerald"
          title="Emerald"
          aria-label="Emerald"
          type="button"
        ></button>
        <button
          class="theme-swatch theme-swatch--royal"
          data-action="setTheme"
          data-action-arg="royal"
          title="Royal"
          aria-label="Royal"
          type="button"
        ></button>
        <button
          class="theme-swatch theme-swatch--high-contrast"
          data-action="setTheme"
          data-action-arg="high-contrast"
          title="High Contrast"
          aria-label="High Contrast"
          type="button"
        ></button>
      </div>
    </div>

    <!-- Theme Customizer (Sprint 138) -->
    <div class="settings-card">
      <h3>🎛️ <span data-i18n="theme_customizer_title">התאמה אישית</span></h3>
      <p class="section-desc" data-i18n="theme_customizer_desc">כוונן צבעים, רדיוס ואפקטי שקיפות</p>
      <div id="themeVarsEditor" class="theme-vars-editor"></div>
      <div class="theme-vars-actions u-mt-sm">
        <button class="btn btn-secondary btn-small" data-action="resetThemeVars" type="button">
          ↺ <span data-i18n="theme_vars_reset">איפוס</span>
        </button>
        <button class="btn btn-secondary btn-small" data-action="exportThemeJson" type="button">
          📤 <span data-i18n="theme_vars_export">ייצוא</span>
        </button>
        <button class="btn btn-secondary btn-small" data-action="importThemeJson" type="button">
          📥 <span data-i18n="theme_vars_import">ייבוא</span>
        </button>
      </div>
      <input type="file" id="themeJsonFileInput" accept=".json" class="u-hidden" aria-label="Theme JSON file" title="Theme JSON file" data-i18n-aria-label="theme_json_file_aria" />
    </div>

    <!-- Theme Marketplace (S445) -->
    <div class="settings-card" id="cardThemeMarketplace">
      <h3>🛍️ <span data-i18n="theme_marketplace_title">מרקטפלייס ערכות נושא</span></h3>
      <p class="section-desc" data-i18n="theme_marketplace_desc">התקן ערכת נושא מהקהילה בלחיצה אחת.</p>
      <div id="themeMarketplaceList" class="theme-marketplace-list u-flex-row--lg"></div>
    </div>

    <!-- Plugin Manager (S141) -->
    <div class="settings-card" data-admin-only>
      <h3>🔌 <span data-i18n="plugin_manager_title">תוספים</span></h3>
      <p class="section-desc" data-i18n="plugin_manager_desc">התקן, הפעל או השבת תוספים</p>
      <div id="pluginList" class="plugin-list"></div>
      <div class="plugin-install-area u-mt-sm">
        <label class="btn btn-secondary btn-small" data-i18n="plugin_install_btn">
          📦 התקן תוסף
          <input type="file" id="pluginFileInput" accept=".json" class="u-hidden" data-action="installPlugin" />
        </label>
      </div>
    </div>

    <!-- App Info -->
    <div class="settings-card">
      <h3>ℹ️ <span>מידע</span></h3>
      <div id="dataSummary"></div>
    </div>

    <!-- Privacy / Telemetry -->
    <div class="settings-card">
      <h3>🛡️ <span data-i18n="privacy_settings_title">פרטיות וטלמטריה</span></h3>
      <p class="section-desc" data-i18n="privacy_settings_desc">
        ניטור שגיאות בייצור הוא אופציונלי ומופעל רק אם הוגדר DSN. כל מידע אישי
        (אימייל, טלפון, אסימון) מוסר לפני שליחה.
      </p>
      <div class="form-group u-mb-sm">
        <label class="form-checkbox">
          <input
            type="checkbox"
            id="telemetryOptOut"
            data-on-change="saveTelemetryOptOut"
          />
          <span data-i18n="telemetry_opt_out_label">השבת ניטור שגיאות (telemetry)</span>
        </label>
      </div>
    </div>

    <!-- Transportation Settings -->
    <div class="settings-card">
      <h3>🚌 <span data-i18n="transport_settings_title">הגדרות הסעות</span></h3>
      <p class="section-desc" data-i18n="transport_settings_desc">
        הגדר את נקודות היציאה של האוטובוס לחתונה
      </p>
      <div class="form-group u-mb-sm">
        <label class="form-checkbox">
          <input
            type="checkbox"
            id="transportEnabled"
            data-on-change="saveTransportSettings"
          />
          <span data-i18n="transport_enabled">אפשר הסעות</span>
        </label>
      </div>
      <div class="transport-grid">
        <div
          class="transport-section-title"
          data-i18n="transport_tefachot_label"
        >
          ישיבת תפחות
        </div>
        <div class="form-group">
          <label for="transportTefachotTime" class="transport-label" data-i18n="transport_time_ph"
            >שעת יציאה</label
          >
          <input type="time" id="transportTefachotTime" class="u-w-full" />
        </div>
        <div class="form-group">
          <label class="transport-label" data-i18n="transport_location_ph"
            >כתובת</label
          >
          <input
            type="text"
            id="transportTefachotAddress"
            data-i18n-placeholder="transport_location_ph"
            placeholder="לדוגמה: רחוב הישיבה 1"
          />
        </div>
        <div
          class="transport-section-title u-mt-xs"
          data-i18n="transport_jerusalem_label"
        >
          ירושלים
        </div>
        <div class="form-group">
          <label for="transportJerusalemTime" class="transport-label" data-i18n="transport_time_ph"
            >שעת יציאה</label
          >
          <input type="time" id="transportJerusalemTime" class="u-w-full" />
        </div>
        <div class="form-group">
          <label class="transport-label" data-i18n="transport_location_ph"
            >כתובת</label
          >
          <input
            type="text"
            id="transportJerusalemAddress"
            data-i18n-placeholder="transport_location_ph"
            placeholder="לדוגמה: רחוב יפו 5"
          />
        </div>
      </div>
      <button
        class="btn btn-primary btn-small"
        data-action="saveTransportSettings"
      >
        💾 <span data-i18n="transport_save">שמור הגדרות הסעות</span>
      </button>
    </div>

    <!-- Registry Links -->
    <div class="settings-card">
      <h3>🎁 <span data-i18n="registry_title">אתרי מתנות</span></h3>
      <div id="registrySettingsList"></div>
      <div class="form-row form-row--mt-md">
        <div class="form-group u-flex-1">
          <label for="registryInputName" data-i18n="registry_name"
            >שם הרשימה</label
          >
          <input
            type="text"
            id="registryInputName"
            placeholder="Amazon, Zola..."
            maxlength="60"
          />
        </div>
        <div class="form-group u-flex-2">
          <label for="registryInputUrl" data-i18n="registry_url"
            >קישור (https://...)</label
          >
          <input
            type="url"
            id="registryInputUrl"
            placeholder="https://"
            dir="ltr"
          />
        </div>
      </div>
      <button class="btn btn-primary btn-small" data-action="addRegistryLink">
        ➕ <span data-i18n="registry_add">הוסף אתר</span>
      </button>
    </div>

    <!-- Print Materials -->
    <div class="settings-card">
      <h3>
        🖨️ <span data-i18n="print_place_cards">הדפסת כרטיסיות שיבוש</span>
      </h3>
      <div class="wedding-settings-row">
        <button class="btn btn-secondary" data-action="printPlaceCards">
          🪑 <span data-i18n="print_place_cards">הדפסת כרטיסיות</span>
        </button>
        <button class="btn btn-secondary" data-action="printTableSigns">
          📋 <span data-i18n="print_table_signs">הדפסת שלטי שולחנות</span>
        </button>
        <!-- S422: QR table cards -->
        <button class="btn btn-secondary" data-action="printQrTableCards">
          📷 <span data-i18n="print_qr_table_cards">הדפסת QR לשולחנות</span>
        </button>
      </div>
    </div>

    <!-- User Access Management -->
    <div class="settings-card" id="cardUserManager">
      <h3>👥 <span data-i18n="user_mgr_title">ניהול גישה</span></h3>
      <p class="user-mgr-desc" data-i18n="user_mgr_desc">
        הוסף כאן אימיילים שיקבלו גישה מלאה לניהול החתונה. הכניסה נעשית דרך כפתור
        🔑 בפינה.
      </p>

      <div class="user-mgr-label" data-i18n="user_mgr_approved_label">
        אימיילים מורשים לגישה מלאה:
      </div>
      <div id="approvedEmailsList"></div>
      <div class="email-add-row">
        <input
          type="email"
          id="newApproveEmail"
          data-i18n-placeholder="ph_approve_email"
          placeholder="admin@example.com"
          data-on-enter="addApprovedEmail"
        />
        <button
          class="btn btn-primary btn-small"
          data-action="addApprovedEmail"
        >
          ➕ <span data-i18n="user_mgr_add">אשר גישה</span>
        </button>
      </div>
    </div>

    <!-- S433: WebAuthn Passkey scaffold -->
    <div class="settings-card" data-admin-only id="cardPasskey">
      <h3>🔑 <span data-i18n="passkey_title">כניסה עם Passkey</span></h3>
      <p class="section-desc" data-i18n="passkey_desc">השתמש בחיישן טביעת אצבע, Face ID או מכשיר FIDO2 לכניסה מאובטחת.</p>
      <div id="passkeyNotSupported" class="u-hidden">
        <p class="text-warn" data-i18n="passkey_not_supported">מכשיר זה אינו תומך ב-Passkeys.</p>
      </div>
      <div id="passkeySupported">
        <div id="passkeyList" class="u-mb-xs"></div>
        <div class="btn-group u-flex-row">
          <button class="btn btn-primary btn-small" data-action="registerPasskey">
            ➕ <span data-i18n="passkey_register">רשום Passkey חדש</span>
          </button>
          <button class="btn btn-secondary btn-small" data-action="authenticatePasskey">
            🔐 <span data-i18n="passkey_authenticate">כניסה עם Passkey</span>
          </button>
          <button class="btn btn-danger btn-small" data-action="clearPasskeys">
            🗑️ <span data-i18n="passkey_clear">מחק כל Passkey</span>
          </button>
        </div>
      </div>
    </div>

    <!-- API Key (S434) -->
    <div class="settings-card" data-admin-only id="cardApiKey">
      <h3>🔐 <span data-i18n="api_key_title">מפתח API</span></h3>
      <p class="section-desc" data-i18n="api_key_desc">צור מפתח API לגישה תכנותית לנתוני האירוע.</p>
      <div id="apiKeyDisplay" class="u-hidden">
        <code id="apiKeyValue" dir="ltr" class="u-break-all"></code>
        <button class="btn btn-secondary btn-small u-mr-sm" data-action="copyApiKey">
          <span data-i18n="api_key_copy">העתק</span>
        </button>
        <button class="btn btn-danger btn-small" data-action="revokeApiKey">
          <span data-i18n="api_key_revoke">בטל מפתח</span>
        </button>
      </div>
      <p id="apiKeyNone" class="text-hint"><span data-i18n="api_key_none">אין מפתח פעיל.</span></p>
      <button class="btn btn-primary u-mt-sm" data-action="generateApiKey">
        <span data-i18n="api_key_generate">צור מפתח חדש</span>
      </button>
      <p id="apiKeyStatus" aria-live="polite"></p>
    </div>

    <!-- Webhooks (S441) -->
    <div class="settings-card" data-admin-only id="cardWebhooks">
      <h3>🪝 <span data-i18n="webhook_title">מינויי Webhook</span></h3>
      <p class="section-desc" data-i18n="webhook_desc">קבל התראות POST בזמן אמת לכתובות URL חיצוניות בעת אירועי מפתח.</p>
      <div class="u-flex-row--mb">
        <input
          type="url"
          id="webhookUrlInput"
          class="input u-flex-1-min"
          data-i18n-placeholder="webhook_url_placeholder"
          placeholder="https://example.com/hook"
        />
        <div class="u-flex-row--sm">
          <label class="checkbox-inline">
            <input type="checkbox" name="webhookEvent" value="rsvp.confirmed" checked />
            <span data-i18n="webhook_event_rsvp_confirmed">RSVP אישר</span>
          </label>
          <label class="checkbox-inline">
            <input type="checkbox" name="webhookEvent" value="rsvp.declined" />
            <span data-i18n="webhook_event_rsvp_declined">RSVP דחה</span>
          </label>
          <label class="checkbox-inline">
            <input type="checkbox" name="webhookEvent" value="guest.added" />
            <span data-i18n="webhook_event_guest_added">אורח נוסף</span>
          </label>
        </div>
        <button class="btn btn-primary btn-small" data-action="addWebhook">
          <span data-i18n="webhook_add">הוסף</span>
        </button>
      </div>
      <ul id="webhookList" class="webhook-list" aria-live="polite"></ul>
      <p id="webhookStatus" class="section-desc" aria-live="polite"></p>
    </div>

    <!-- AI Assistant -->
    <div class="settings-card" id="cardAiAssistant">
      <h3>🤖 <span data-i18n="ai_title">עוזר AI</span></h3>
      <p class="section-desc" data-i18n="ai_desc">הכנס מפתח API משלך לשימוש ב-AI בכל חלקי האפליקציה.</p>
      <div class="form-group">
        <label for="aiProviderSelect" data-i18n="ai_provider_label">ספק</label>
        <select id="aiProviderSelect" class="form-input">
          <option value="openai" data-i18n="ai_provider_openai">OpenAI (GPT-4o mini)</option>
          <option value="anthropic" data-i18n="ai_provider_anthropic">Anthropic (Claude)</option>
          <option value="ollama" data-i18n="ai_provider_ollama">Ollama (מקומי)</option>
        </select>
      </div>
      <div class="form-group">
        <label for="aiApiKey" data-i18n="ai_key_label">מפתח API</label>
        <input type="password" id="aiApiKey" class="form-input"
          data-i18n-placeholder="ai_key_placeholder" placeholder="sk-…" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="aiModel" data-i18n="ai_model_label">מודל</label>
        <input type="text" id="aiModel" class="form-input"
          data-i18n-placeholder="ai_model_placeholder" placeholder="gpt-4o-mini" />
      </div>
      <div class="form-group u-flex-row u-gap-sm">
        <label class="u-flex-row u-gap-xs u-align-center">
          <input type="checkbox" id="aiEnabled" />
          <span data-i18n="ai_enabled">הפעל עוזר AI</span>
        </label>
      </div>
      <div class="settings-btn-row">
        <button class="btn btn-primary btn-small" data-action="saveAiSettings">
          💾 <span data-i18n="ai_save">שמור הגדרות AI</span>
        </button>
        <button class="btn btn-secondary btn-small" data-action="testAiConnection">
          🔗 <span data-i18n="ai_test">בדוק חיבור</span>
        </button>
      </div>
      <p id="aiStatus" class="section-desc" aria-live="polite"></p>
    </div>

    <!-- Contact Collector -->
    <div class="settings-card">
      <h3>📋 <span data-i18n="contact_settings_title">אסיפת פרטי קשר</span></h3>
      <p class="section-desc" data-i18n="contact_settings_desc">
        שתף קישור זה עם אורחים שמידע שלהם חסר — הם ימלאו טופס קצר
      </p>
      <p class="text-hint u-mb-sm">
        <a
          id="contactCollectorLink"
          href="#contact-form"
          target="_blank"
          rel="noopener noreferrer"
          >#contact-form</a
        >
      </p>
      <button class="btn btn-secondary btn-small" data-action="copyContactLink">
        📋 <span data-i18n="contact_copy_link">העתק קישור</span>
      </button>
    </div>

    <!-- Green API Settings -->
    <div class="settings-card">
      <h3>
        ⚡ <span data-i18n="green_api_title">Green API (שליחה אוטומטית)</span>
      </h3>
      <p class="section-desc" data-i18n="green_api_desc">
        חבר את
        <a
          href="https://green-api.com"
          target="_blank"
          rel="noopener noreferrer"
          >green-api.com</a
        >, סריקו QR עם וואטסאפ שלך, והדבק כאן את הפרטים
      </p>
      <div class="form-group">
        <label for="greenApiInstanceId" data-i18n="green_api_instance"
          >Instance ID</label
        >
        <input
          type="text"
          id="greenApiInstanceId"
          placeholder="1101234567"
          dir="ltr"
          autocomplete="off"
        />
      </div>
      <div class="form-group">
        <label for="greenApiToken" data-i18n="green_api_token">API Token</label>
        <input
          type="password"
          id="greenApiToken"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          dir="ltr"
          autocomplete="off"
        />
      </div>
      <div class="settings-btn-row">
        <button
          class="btn btn-primary"
          data-action="saveGreenApiConfig"
          data-i18n="green_api_save"
        >
          שמור
        </button>
        <button
          class="btn btn-secondary"
          data-action="checkGreenApiConnection"
          data-i18n="green_api_test"
        >
          בדוק חיבור
        </button>
      </div>
      <p id="greenApiStatus" class="status-msg u-hidden" aria-live="polite"></p>
    </div>

    <!-- Push Notifications -->
    <div class="settings-card">
      <h3>🔔 <span data-i18n="push_card_title">התראות Push</span></h3>
      <p class="section-desc" data-i18n="push_card_desc">
        קבל התראת דפדפן כאשר אורח שולח RSVP
      </p>
      <div id="pushSettingsCard"></div>
      <!-- S427: Test push button -->
      <div class="u-mt-sm">
        <button class="btn btn-ghost btn-small" data-action="sendTestPush">
          <span>🔔</span> <span data-i18n="push_send_test">שלח Push לדוגמה</span>
        </button>
        <span id="pushTestResult" class="text-note u-mr-xs"></span>
      </div>
    </div>

    <!-- Email Notifications -->
    <div class="settings-card">
      <h3>📧 <span data-i18n="email_card_title">התראות אימייל</span></h3>
      <p class="section-desc" data-i18n="email_card_desc">
        שלח אישורי הגעה לאורחים והתראות למנהל/ת
      </p>
      <div id="emailSettingsCard"></div>
    </div>

    <!-- Notification Preferences (Sprint 56) -->
    <div class="settings-card">
      <h3>🔕 <span data-i18n="notif_prefs_title">העדפות התראות</span></h3>
      <p class="section-desc" data-i18n="notif_prefs_desc">
        הגדר אילו ערוצים ואירועים מפעילים התראות
      </p>
      <div id="notifPrefsCard"></div>
    </div>

    <!-- Audit Log -->
    <div class="settings-card settings-card--full">
      <h3>📜 <span data-i18n="audit_title">יומן פעולות</span></h3>
      <p class="section-desc" data-i18n="audit_desc">
        רשימת כל הפעולות האחרונות שבוצעו במערכת (עד 200 פעולות)
      </p>
      <div class="u-overflow-x u-mb-sm">
        <table class="guest-table guest-table--compact">
          <thead>
            <tr>
              <th data-i18n="audit_col_time">זמן</th>
              <th data-i18n="audit_col_action">פעולה</th>
              <th data-i18n="audit_col_detail">פרט</th>
              <th data-i18n="audit_col_user">משתמש</th>
            </tr>
          </thead>
          <tbody id="auditLogBody"></tbody>
        </table>
      </div>
      <div class="settings-btn-row">
        <button class="btn btn-secondary btn-small" data-action="exportAuditLog">
          📥 <span data-i18n="audit_log_export_btn">ייצא יומן ביקורת</span>
        </button>
        <button class="btn btn-danger btn-small" data-action="clearAuditLog">
          🗑️ <span data-i18n="audit_clear_btn">נקה יומן</span>
        </button>
      </div>
    </div>

    <!-- Error Monitor -->
    <div class="settings-card settings-card--full">
      <h3>🐛 <span data-i18n="errors_title">יומן שגיאות</span></h3>
      <p class="section-desc" data-i18n="errors_desc">
        שגיאות JavaScript שנלכדו בדפדפן (עד 50 שגיאות)
      </p>
      <div class="u-overflow-x u-mb-sm">
        <table class="guest-table guest-table--xs">
          <thead>
            <tr>
              <th data-i18n="audit_col_time">זמן</th>
              <th data-i18n="errors_col_message">הודעה</th>
              <th data-i18n="errors_col_location">מיקום</th>
            </tr>
          </thead>
          <tbody id="errorLogBody"></tbody>
        </table>
      </div>
      <button class="btn btn-secondary btn-small" data-action="clearErrorLog">
        🗑️ <span data-i18n="errors_clear_btn">נקה שגיאות</span>
      </button>
    </div>

    <!-- S18.1 Sync Queue Monitor -->
    <div class="settings-card">
      <h3>🔄 <span data-i18n="sync_monitor_title">מוניטור סנכרון</span></h3>
      <p data-i18n="sync_monitor_desc">פריטים הממתינים לסנכרון עם Google Sheets.</p>
      <div class="sync-queue-monitor">
        <span data-i18n="sync_queue_pending">ממתינים לסנכרון:</span>
        <span id="syncQueueBadge" class="badge badge--warn">0</span>
        <!-- F2.4.3 Queue drain progress bar -->
        <div class="progress-bar u-mt-sm" id="syncProgressWrap" hidden>
          <div class="progress-fill" id="syncProgressBar"></div>
        </div>
        <p class="text-note u-mt-xs" id="syncProgressText"></p>
        <div id="syncQueueList" class="sync-queue-list u-text-muted"></div>
      </div>
    </div>

    <!-- One-click Deploy (S196 / Roadmap S152) -->
    <div class="settings-card" data-admin-only>
      <h3>🚀 <span data-i18n="deploy_title">פריסה מהירה</span></h3>
      <p class="section-desc" data-i18n="deploy_description">פרוס את האפליקציה בלחיצה אחת לשירות האירוח המועדף:</p>
      <div id="deployButtonsContainer" class="deploy-buttons u-flex-gap-sm u-mt-sm"></div>
    </div>

    <!-- Monitoring / Error Reporting (S205 / Roadmap S156) -->
    <div class="settings-card" data-admin-only>
      <h3>📡 <span data-i18n="monitoring_title">דיווח שגיאות</span></h3>
      <p class="section-desc" data-i18n="monitoring_description">בחר אם לשלוח דוחות שגיאות אנונימיים למנהל המערכת.</p>
      <label class="settings-toggle">
        <input type="checkbox" id="monitoringOptIn" data-action="toggleMonitoring" />
        <span data-i18n="monitoring_opt_in">אפשר דיווח שגיאות</span>
      </label>
      <!-- S432: Observability DSN (Sentry-compatible) -->
      <div class="form-group u-mt-form">
        <label for="observabilityDsn" data-i18n="observability_dsn_label">DSN לניטור שגיאות (Sentry / GlitchTip)</label>
        <input
          type="url"
          id="observabilityDsn"
          dir="ltr"
          data-i18n-placeholder="ph_observability_dsn"
          placeholder="https://key@sentry.io/project-id"
        />
        <button class="btn btn-secondary btn-small u-mt-btn" data-action="saveObservabilityDsn">
          <span data-i18n="observability_dsn_save">שמור DSN</span>
        </button>
        <button class="btn btn-secondary btn-small u-mt-btn" data-action="testErrorReport" id="testErrorReportBtn">
          <span data-i18n="observability_test_btn">שלח דוח שגיאה לניסיון</span>
        </button>
        <p id="observabilityDsnStatus" class="section-desc" aria-live="polite"></p>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="settings-card settings-card--danger">
      <h3>⚠️ <span data-i18n="clear_data_title">מחיקת נתונים</span></h3>
      <p data-i18n="clear_data_warning">
        פעולה זו מוחקת את כל נתוני האורחים והשולחנות ואינה הפיכה!
      </p>
      <button
        class="btn btn-danger"
        data-action="clearAllData"
        data-i18n-tooltip="tip_clear_data"
      >
        🗑️ <span data-i18n="clear_data_btn">מחק את כל הנתונים</span>
      </button>
      <!-- GDPR Erasure (S435) -->
      <hr class="hr-soft">
      <p class="section-desc" data-i18n="gdpr_erasure_desc">
        בקש מחיקת כל הנתונים האישיים (PII) בהתאם לתקנות GDPR.
      </p>
      <!-- GDPR Export (S443) -->
      <button
        class="btn btn-secondary u-mb-xs"
        data-action="exportPersonalData"
        id="gdprExportBtn"
      >
        📦 <span data-i18n="gdpr_export_btn">ייצא נתונים אישיים (GDPR)</span>
      </button>
      <button
        class="btn btn-danger"
        data-action="requestGdprErasure"
        id="gdprErasureBtn"
      >
        🛡️ <span data-i18n="gdpr_erasure_btn">בקש מחיקת נתונים אישיים (GDPR)</span>
      </button>
      <p id="gdprErasureStatus" aria-live="polite"></p>
    </div>
  </div>
</div>
`;export{e as default};
//# sourceMappingURL=settings-CsTuZTme.js.map