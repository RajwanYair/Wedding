/**
 * src/sections/communication.js — Communication Hub section (Phase 10.2)
 *
 * Provides a centralized view for:
 *  - Thank-you message queue (pending / sent)
 *  - Communication log (delivered, failed, pending)
 *  - Quick-send test message via WA Cloud API Edge Function
 *
 * mount() / unmount() lifecycle follows the standard section pattern.
 */

import {
  storeGet,
  storeSet,
  storeSubscribeScoped,
  cleanupScope,
} from "../core/store.js";
import { t } from "../core/i18n.js";

const _SCOPE = "communication";

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Compute thank-you queue statistics.
 * @returns {{ total: number, sent: number, pending: number, failed: number }}
 */
export function getThankyouQueueStats() {
  const entries = /** @type {Array<Record<string, unknown>>} */ (
    storeGet("commLog") ?? []
  );
  let sent = 0,
    failed = 0;
  for (const e of entries) {
    if (e.status === "sent") sent++;
    else if (e.status === "failed") failed++;
  }
  return {
    total: entries.length,
    sent,
    failed,
    pending: entries.length - sent - failed,
  };
}

/**
 * Add an entry to the communication log.
 * @param {{ guestId: string, guestName: string, type: 'sms'|'whatsapp'|'email', message: string, status: 'pending'|'sent'|'failed' }} entry
 */
export function addCommLogEntry(entry) {
  const log = /** @type {unknown[]} */ (storeGet("commLog") ?? []);
  const newEntry = {
    ...entry,
    ts: new Date().toISOString(),
    id: `cl_${Date.now()}`,
  };
  storeSet("commLog", [...log, newEntry]);
}

// ── Render ────────────────────────────────────────────────────────────────

export function renderCommunicationStats() {
  const statsEl = document.getElementById("commStats");
  if (!statsEl) return;
  const { total, sent, pending, failed } = getThankyouQueueStats();
  statsEl.textContent = "";

  const items = [
    { label: t("comm_total"), value: total },
    { label: t("comm_sent"), value: sent },
    { label: t("comm_pending"), value: pending },
    { label: t("comm_failed"), value: failed },
  ];

  for (const { label, value } of items) {
    const box = document.createElement("div");
    box.className = "analytics-stat-box";
    const num = document.createElement("div");
    num.className = "analytics-stat-num";
    num.textContent = String(value);
    const lbl = document.createElement("div");
    lbl.className = "analytics-stat-lbl";
    lbl.textContent = label;
    box.appendChild(num);
    box.appendChild(lbl);
    statsEl.appendChild(box);
  }
}

export function renderCommLog() {
  const listEl = document.getElementById("commLogList");
  if (!listEl) return;
  const entries = /** @type {Array<Record<string, unknown>>} */ (
    storeGet("commLog") ?? []
  );
  listEl.textContent = "";

  if (entries.length === 0) {
    const p = document.createElement("p");
    p.className = "u-text-muted";
    p.textContent = t("comm_empty");
    listEl.appendChild(p);
    return;
  }

  const recent = [...entries].reverse().slice(0, 50);
  for (const e of recent) {
    const row = document.createElement("div");
    row.className = "comm-log-row";

    const badge = document.createElement("span");
    const status = String(e.status ?? "pending");
    badge.className = `badge badge--${status === "sent" ? "info" : status === "failed" ? "danger" : "warn"}`;
    badge.textContent = status;

    const name = document.createElement("span");
    name.className = "comm-log-name";
    name.textContent = String(e.guestName ?? "");

    const type = document.createElement("span");
    type.className = "comm-log-type u-text-muted";
    type.textContent = String(e.type ?? "");

    const msg = document.createElement("span");
    msg.className = "comm-log-msg";
    msg.textContent = String(e.message ?? "").slice(0, 80);

    const ts = document.createElement("span");
    ts.className = "comm-log-ts u-text-muted";
    ts.textContent = e.ts ? new Date(String(e.ts)).toLocaleString("he-IL") : "";

    row.appendChild(badge);
    row.appendChild(name);
    row.appendChild(type);
    row.appendChild(msg);
    row.appendChild(ts);
    listEl.appendChild(row);
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

export function mount() {
  storeSubscribeScoped("commLog", renderCommunicationStats, _SCOPE);
  storeSubscribeScoped("commLog", renderCommLog, _SCOPE);

  renderCommunicationStats();
  renderCommLog();
}

export function unmount() {
  cleanupScope(_SCOPE);
}
