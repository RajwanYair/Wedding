/**
 * src/core/whats-new.js — What's New popup on version bump (S148)
 *
 * Shows a modal overlay listing recent changes when the app version
 * is newer than the user's last-seen version. Uses the pure engine
 * from `whats-new-engine.js` for version comparison and entry filtering.
 */

import { APP_VERSION } from "./config.js";
import { STORAGE_KEYS } from "./constants.js";
import { t } from "./i18n.js";
import { readBrowserStorage, writeBrowserStorage } from "./storage.js";
import {
  shouldShowWhatsNew,
  collectNewerEntries,
  flattenItems,
} from "../services/workspace.js";

/**
 * Release manifest — each version lists user-visible i18n item keys.
 * Newest first. Only the entries *newer than lastSeen* are shown.
 * @type {import('../services/workspace.js').WhatsNewEntry[]}
 */
const RELEASE_ENTRIES = [
  {
    version: "13.2.0",
    date: "2026-04-29",
    items: [
      "whats_new_deploy_buttons",
      "whats_new_dns_ui",
      "whats_new_idb_queue",
      "whats_new_print_preview",
      "whats_new_glitchtip",
      "whats_new_notif_panel",
    ],
  },
  {
    version: "13.1.0",
    date: "2026-04-10",
    items: [
      "whats_new_pii_encryption",
      "whats_new_icu_plurals",
      "whats_new_fr_es_locale",
      "whats_new_service_worker",
    ],
  },
  {
    version: "12.8.0",
    date: "2026-04-28",
    items: [
      "whats_new_run_of_show",
      "whats_new_budget_projection",
      "whats_new_rsvp_funnel",
      "whats_new_vendor_timeline",
      "whats_new_theme_picker",
      "whats_new_website_builder",
      "whats_new_notification_centre",
    ],
  },
  {
    version: "12.7.0",
    date: "2026-04-20",
    items: [
      "whats_new_item_budget_sync",
      "whats_new_item_checkin_sync",
      "whats_new_item_whatsapp_templates",
      "whats_new_item_status_bar",
      "whats_new_item_popup",
      "whats_new_item_changelog",
    ],
  },
];

/**
 * Show What's New dialog if the user hasn't seen the current version.
 * Only shown for admin users.
 * @param {import('../services/auth.js').AuthUser | null} user
 */
export function maybeShowWhatsNew(user) {
  const lastSeen = readBrowserStorage(STORAGE_KEYS.LAST_SEEN_VERSION, "") ?? "";
  if (!shouldShowWhatsNew({ currentVersion: APP_VERSION, lastSeenVersion: lastSeen, isAdmin: user?.isAdmin })) return;

  const newer = collectNewerEntries(RELEASE_ENTRIES, lastSeen);
  const items = flattenItems(newer).map((key) => t(key) || key);

  if (items.length === 0) {
    writeBrowserStorage(STORAGE_KEYS.LAST_SEEN_VERSION, APP_VERSION);
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText =
    "display:flex;z-index:10000;position:fixed;inset:0;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px)";
  const card = document.createElement("div");
  card.className = "card";
  card.style.cssText = "max-width:420px;width:90%;padding:1.5rem;max-height:80vh;overflow-y:auto";

  const title = document.createElement("h3");
  title.style.cssText = "margin:0 0 0.75rem;text-align:center";
  title.textContent = `\uD83C\uDD95 ${t("whats_new_title") || "What's New"} \u2014 v${APP_VERSION}`;
  card.appendChild(title);

  const list = document.createElement("ul");
  list.style.cssText = "padding-inline-start:1.2rem;margin:0 0 1rem;line-height:1.8";
  items.forEach((txt) => {
    const li = document.createElement("li");
    li.textContent = txt;
    list.appendChild(li);
  });
  card.appendChild(list);

  const btn = document.createElement("button");
  btn.className = "btn btn-primary";
  btn.style.cssText = "display:block;margin:0 auto";
  btn.textContent = t("whats_new_dismiss") || "Got it!";
  btn.addEventListener("click", () => {
    writeBrowserStorage(STORAGE_KEYS.LAST_SEEN_VERSION, APP_VERSION);
    overlay.remove();
  });
  card.appendChild(btn);
  overlay.appendChild(card);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      writeBrowserStorage(STORAGE_KEYS.LAST_SEEN_VERSION, APP_VERSION);
      overlay.remove();
    }
  });
  document.body.appendChild(overlay);
}
