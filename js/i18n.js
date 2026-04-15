// @ts-check
"use strict";

/* ── i18n Translations ── */
/* Hebrew loaded eagerly (primary language). English lazy-loaded on first toggle. */
const I18N = {
  he: window.I18N_HE || {},
  en: window.I18N_EN || null,
};

/**
 * Ensure the requested locale is loaded. Hebrew is always available synchronously.
 * English is lazy-loaded from en.json on first access.
 * @param {string} lang - 'he' or 'en'
 * @returns {Promise<void>}
 */
async function loadLocale(lang) {
  if (I18N[lang]) return;
  try {
    const mod = await import("./i18n/en.json");
    I18N.en = mod.default;
  } catch (_e) {
    /* fallback: keys displayed as-is */
  }
}
