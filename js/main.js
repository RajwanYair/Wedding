// @ts-check
/**
 * Wedding Manager — ES Module Entry Point (Sprint 0)
 *
 * Imports all modules in dependency order (matching the original <script> tag order).
 * Each module self-registers its public API on `window` via the legacy-globals plugin.
 * Cross-module references use `window.xxx` during Sprint 0.
 *
 * Sprint 1 will migrate to proper import/export with a reactive store.
 */

import "./store.js";
import "./events.js";
import "./config.js";
import "./i18n.he.js";
import "./i18n.en.js";
import "./i18n.js";
import "./dom.js";
import "./state.js";
import "./utils.js";
import "./ui.js";
import "./nav.js";
import "./dashboard.js";
import "./guests.js";
import "./tables.js";
import "./invitation.js";
import "./whatsapp.js";
import "./rsvp.js";
import "./settings.js";
import "./budget.js";
import "./analytics.js";
import "./timeline.js";
import "./router.js";
import "./guest-landing.js";
import "./expenses.js";
import "./registry.js";
import "./checkin.js";
import "./gallery.js";
import "./vendors.js";
import "./contact-collector.js";
import "./offline-queue.js";
import "./audit.js";
import "./error-monitor.js";
import "./push.js";
import "./email.js";
import "./sheets.js";
import "./auth.js";
import "./app.js";
