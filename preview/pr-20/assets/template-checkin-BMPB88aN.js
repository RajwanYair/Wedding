import{t as e}from"./rolldown-runtime-lhHHWwHU.js";var t=e({default:()=>n}),n=`<div class="card">
  <div class="card-header">
    <span class="icon">✅</span>
    <span data-i18n="checkin_title">ציון אורחים</span>
  </div>
  <!-- Stats bar -->
  <div class="checkin-stats" aria-live="polite">
    <div class="checkin-stat">
      <span class="checkin-stat-num" id="checkinArrived">0</span>
      <span class="checkin-stat-label" data-i18n="checkin_arrived">הגיעו</span>
    </div>
    <div class="checkin-stat">
      <span class="checkin-stat-num" id="checkinConfirmed">0</span>
      <span class="checkin-stat-label" data-i18n="checkin_confirmed"
        >אישרו הגעה</span
      >
    </div>
    <div class="checkin-stat">
      <span class="checkin-stat-num" id="checkinTotal">0</span>
      <span class="checkin-stat-label" data-i18n="checkin_total"
        >סה"כ מוזמנים</span
      >
    </div>
    <div class="checkin-stat">
      <span class="checkin-stat-num" id="checkinPct">0%</span>
      <span class="checkin-stat-label">%</span>
    </div>
    <!-- S11.5 Gift Total -->
    <div class="checkin-stat" id="giftStatBox">
      <span class="checkin-stat-num" id="checkinGiftTotal">₪0</span>
      <span class="checkin-stat-label" data-i18n="gift_total">סה״כ מתנות</span>
    </div>
  </div>
  <!-- Progress bar -->
  <div class="checkin-progress-track">
    <div class="checkin-progress-fill" id="checkinProgressBar"></div>
  </div>
  <!-- Toolbar: Search + Gift Mode + QR Scanner -->
  <div class="checkin-toolbar">
    <input
      type="search"
      id="checkinSearch"
      data-i18n-placeholder="checkin_search_ph"
      placeholder="חפש לפי שם או טלפון..."
      data-on-input="checkinSearch"
      class="u-flex-1"
    />
    <label class="checkin-gift-toggle">
      <input type="checkbox" id="giftModeToggle" data-action="toggleGiftMode" />
      <span data-i18n="gift_mode">💰 מתנות</span>
    </label>
    <button class="btn btn-secondary btn-small" data-action="startQrScan" id="qrScanBtn">
      <span>📷</span> <span data-i18n="qr_scan">סרוק QR</span>
    </button>
  </div>
  <!-- S12.3 QR Scanner Viewport -->
  <div id="qrScannerBox" class="qr-scanner-box u-hidden">
    <video id="qrVideo" autoplay playsinline class="qr-video"></video>
    <button class="btn btn-danger btn-small qr-close-btn" data-action="stopQrScan">✕</button>
  </div>
  <!-- Guest table -->
  <div class="u-overflow-x">
    <table class="guest-table u-w-full">
      <thead>
        <tr>
          <th data-i18n="col_name">שם</th>
          <th data-i18n="col_phone">טלפון</th>
          <th data-i18n="col_count">מוזמנים</th>
          <th data-i18n="col_table">שולחן</th>
          <th data-i18n="col_gift" class="gift-col u-hidden">מתנה ₪</th>
          <th data-i18n="col_arrived">הגיע?</th>
        </tr>
      </thead>
      <tbody id="checkinList"></tbody>
    </table>
  </div>
</div>
`;export{t};
//# sourceMappingURL=template-checkin-BMPB88aN.js.map