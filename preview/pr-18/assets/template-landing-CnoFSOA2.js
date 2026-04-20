import{t as e}from"./rolldown-runtime-lhHHWwHU.js";var t=e({default:()=>n}),n=`<!-- Hero: couple names + date + venue -->
      <div class="guest-landing-hero card">
        <div class="landing-couple-name" id="landingCoupleName">חתן &amp; כלה</div>
        <div class="landing-hebrew-date" id="landingHebrewDate"></div>
        <div class="landing-date" id="landingDate"></div>
        <div class="landing-venue" id="landingVenue"></div>
        <div class="landing-address" id="landingAddress"></div>
        <div class="landing-actions">
          <button class="btn btn-primary" data-action="showSection" data-action-arg="rsvp">
            💌 <span data-i18n="landing_rsvp_cta">אשר הגעתך</span>
          </button>
          <a id="landingWazeLink" class="btn btn-secondary u-hidden" href="#" target="_blank" rel="noopener noreferrer">
            <span data-i18n="landing_waze_btn">נווט בוויז 📍</span>
          </a>
        </div>
      </div>

      <!-- Timeline (read-only) -->
      <div class="card">
        <div class="card-header">
          <span class="icon">📅</span>
          <span data-i18n="landing_timeline_title">לוח האירוע</span>
        </div>
        <div class="timeline-list" id="landingTimeline"></div>
      </div>

      <!-- Registry Links (guest-facing) -->
      <div class="card u-hidden u-mt-md" id="landingRegistrySection">
        <div class="card-header">
          <span class="icon">🎁</span> <span data-i18n="registry_title">אתרי מתנות</span>
        </div>
        <div id="landingRegistryList" class="registry-cards-list"></div>
      </div>

      <!-- Table Finder (inline on landing for guests) -->
      <div class="card u-mt-md">
        <div class="card-header">
          <span class="icon">🪑</span> <span data-i18n="tablefinder_title">מצא את השולחן שלך</span>
        </div>
        <p class="card-subtitle" data-i18n="tablefinder_subtitle">הזן שמך / טלפון לעיל ונבדוק איפה השולחן שלך</p>
        <div class="form-row form-row--mt-sm">
          <div class="form-group u-flex-1">
            <input type="text" id="tablefinderInput" data-i18n-placeholder="tablefinder_ph"
              placeholder="הזן שם או טלפון..."
              data-on-input="findTable" class="u-w-full">
          </div>
          <div class="tablefinder-btn-wrap">
            <button class="btn btn-primary" data-action="findTable" data-i18n="tablefinder_btn">חפש</button>
          </div>
        </div>
        <div id="tablefinderResult" class="tablefinder-result u-hidden" aria-live="polite"></div>
      </div>
`;export{t};
//# sourceMappingURL=template-landing-CnoFSOA2.js.map