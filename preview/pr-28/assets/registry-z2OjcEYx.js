var e=`<!-- Guest-facing registry links -->
<div class="card card--narrow">
  <div class="card-header">
    <span class="icon">🎁</span>
    <span data-i18n="registry_title">אתרי מתנות</span>
  </div>
  <p class="section-subtitle" data-i18n="registry_subtitle">
    בחר אתר מתנות להציג לאורחים
  </p>
  <div id="registryLinks" class="registry-cards-list"></div>
</div>

<!-- S430: Admin — Add registry link with platform presets -->
<div class="card card--narrow u-mt-md" data-admin-only>
  <div class="card-header">
    <span class="icon">➕</span>
    <span data-i18n="registry_add_title">הוסף קישור מתנות</span>
  </div>
  <p class="section-desc" data-i18n="registry_add_desc">בחר פלטפורמה מוכרת או הכנס כתובת ידנית</p>

  <!-- Platform presets (S430) -->
  <div class="registry-platform-presets" id="registryPlatformPresets"></div>

  <!-- Manual URL entry -->
  <div class="registry-add-row u-mt-sm">
    <input
      type="url"
      id="registryLinkInput"
      class="input-field"
      data-i18n-placeholder="registry_url_placeholder"
      placeholder="https://..."
    />
    <input
      type="text"
      id="registryLinkName"
      class="input-field"
      data-i18n-placeholder="registry_name_placeholder"
      placeholder="שם האתר"
    />
    <button class="btn btn-primary btn-small" data-action="addRegistryLink" type="button">
      <span>➕</span> <span data-i18n="registry_add_btn">הוסף</span>
    </button>
  </div>
  <p id="registryAddError" class="text-error u-mt-xs" aria-live="polite"></p>
</div>
`;export{e as default};
//# sourceMappingURL=registry-z2OjcEYx.js.map