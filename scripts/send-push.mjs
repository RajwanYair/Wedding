#!/usr/bin/env node
/**
 * send-push.mjs — Send Web Push notifications to all subscribed admins.
 *
 * Fetches stored subscriptions from the GAS Web App endpoint, then sends a
 * push message to each one using the web-push library with VAPID authentication.
 *
 * Prerequisites:
 *   npm install              (installs web-push devDependency)
 *
 * Required environment variables:
 *   VAPID_PUBLIC_KEY         Base64url-encoded VAPID public key
 *   VAPID_PRIVATE_KEY        Base64url-encoded VAPID private key
 *   SHEETS_WEBAPP_URL        Google Apps Script Web App URL
 *
 * Optional:
 *   VAPID_SUBJECT            Email URI used in VAPID JWT (default: mailto:admin@example.com)
 *
 * Usage:
 *   VAPID_PUBLIC_KEY=xxx VAPID_PRIVATE_KEY=yyy SHEETS_WEBAPP_URL=zzz \
 *     node scripts/send-push.mjs "New RSVP" "Guest Name confirmed attendance"
 *
 * The GAS Web App exposes subscriptions via:
 *   GET  ?action=getPushSubscriptions   → { subscriptions: [...] }
 *   POST { action: "savePushSubscription", subscription: {...} }
 */

import webpush from "web-push";

const title = process.argv[2] || "Wedding Manager";
const body = process.argv[3] || "New notification";

const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  SHEETS_WEBAPP_URL,
  VAPID_SUBJECT = "mailto:admin@example.com",
} = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("Error: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set.");
  process.exit(1);
}
if (!SHEETS_WEBAPP_URL) {
  console.error("Error: SHEETS_WEBAPP_URL must be set.");
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/* Fetch subscriptions from GAS */
const subsUrl = `${SHEETS_WEBAPP_URL}?action=getPushSubscriptions`;
const res = await fetch(subsUrl);
if (!res.ok) {
  console.error(`Failed to fetch subscriptions: HTTP ${res.status}`);
  process.exit(1);
}
const json = await res.json();
const subscriptions = Array.isArray(json.subscriptions)
  ? json.subscriptions
  : [];

if (subscriptions.length === 0) {
  console.log("No push subscriptions found — nothing to send.");
  process.exit(0);
}

const payload = JSON.stringify({ title, body, icon: "./icon-192.png" });

let sent = 0;
for (const sub of subscriptions) {
  try {
    await webpush.sendNotification(sub, payload);
    sent++;
    console.log(`  ✓ Sent to ${String(sub.endpoint).slice(0, 50)}…`);
  } catch (err) {
    console.warn(
      `  ✗ Failed to send to ${String(sub.endpoint).slice(0, 50)}…: ${err.message}`,
    );
  }
}

console.log(`\nSent ${sent}/${subscriptions.length} push notification(s).`);
