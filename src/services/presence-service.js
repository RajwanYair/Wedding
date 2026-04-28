/**
 * src/services/presence-service.js — Unified presence service (S187)
 *
 * Merged from:
 *   - presence.js          (S10.3) — heartbeat + local presence tracker
 *   - presence-badges.js   (S112)  — per-record badge helpers
 *   - realtime-presence.js (S91)   — Supabase Realtime channel wrapper
 */

import { sheetsPost } from "./sheets.js";
import { currentUser } from "./auth.js";
import { load, save } from "../core/state.js";

// ── Heartbeat presence (merged from presence.js) ────────────────────────

/** Heartbeat interval: 60 seconds */
const _HEARTBEAT_MS = 60_000;

/** Presence is considered stale after 2 minutes */
const _STALE_MS = 120_000;

/** @type {ReturnType<typeof setInterval> | null} */
let _heartbeatTimer = null;

/** @type {Array<{ email: string, name: string, lastSeen: string }>} */
let _presenceList = [];

/** @type {Set<Function>} */
const _listeners = new Set();

/**
 * Subscribe to presence updates.
 * @param {(users: Array<{ email: string, name: string, lastSeen: string }>) => void} fn
 * @returns {() => void} Unsubscribe
 */
export function onPresenceChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/**
 * Get the current list of active users.
 * @returns {Array<{ email: string, name: string, lastSeen: string }>}
 */
export function getPresence() {
  return _presenceList;
}

/**
 * Start sending heartbeats and polling for other users' presence.
 */
export function startPresence() {
  stopPresence();
  _sendHeartbeat();
  _heartbeatTimer = setInterval(_sendHeartbeat, _HEARTBEAT_MS);
}

/**
 * Stop presence tracking.
 */
export function stopPresence() {
  if (_heartbeatTimer !== null) {
    clearInterval(_heartbeatTimer);
    _heartbeatTimer = null;
  }
}

/**
 * Send a heartbeat to indicate this user is active.
 */
async function _sendHeartbeat() {
  const user = currentUser();
  if (!user?.isAdmin) return;

  const entry = {
    email: user.email || "unknown",
    name: /** @type {any} */ (user).displayName || user.email || "Admin",
    lastSeen: new Date().toISOString(),
  };

  const presence = /** @type {any[]} */ (load("presence", []) ?? []);
  const idx = presence.findIndex((p) => p.email === entry.email);
  if (idx >= 0) presence[idx] = entry;
  else presence.push(entry);
  save("presence", presence);

  const now = Date.now();
  _presenceList = presence.filter((p) => now - new Date(p.lastSeen).getTime() < _STALE_MS);

  _listeners.forEach((fn) => {
    try {
      fn(_presenceList);
    } catch {
      // Presence is best-effort; do not block on errors
    }
  });

  try {
    await sheetsPost("presence", entry);
  } catch {
    // Best-effort
  }
}

// ── Badge helpers (merged from presence-badges.js, S112) ─────────────────

/** @typedef {{ email: string, name: string, lastSeen: string, viewing?: string }} PresenceUser */

/**
 * Returns true if a presence entry is fresh (last-seen within `maxAgeMs`).
 * @param {PresenceUser} u
 * @param {number} [maxAgeMs=60000]
 * @param {number} [now=Date.now()]
 */
export function isFresh(u, maxAgeMs = 60_000, now = Date.now()) {
  const t = Date.parse(u.lastSeen);
  if (Number.isNaN(t)) return false;
  return now - t <= maxAgeMs;
}

/**
 * Group fresh presence entries by the record they are viewing.
 * @param {PresenceUser[]} users
 * @param {number} [maxAgeMs]
 * @param {number} [now]
 * @returns {Map<string, PresenceUser[]>}
 */
export function groupByViewing(users, maxAgeMs, now) {
  /** @type {Map<string, PresenceUser[]>} */
  const out = new Map();
  for (const u of users) {
    if (!u?.viewing) continue;
    if (!isFresh(u, maxAgeMs, now)) continue;
    const list = out.get(u.viewing) ?? [];
    list.push(u);
    out.set(u.viewing, list);
  }
  return out;
}

/**
 * Compose a short badge label for one record.
 * @param {PresenceUser[]} viewers
 * @param {number} [maxIcons=3]
 * @returns {{ initials: string[], overflow: number, total: number }}
 */
export function badgeFor(viewers, maxIcons = 3) {
  const sorted = [...viewers].sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email),
  );
  const total = sorted.length;
  const head = sorted.slice(0, maxIcons);
  const initials = head.map((u) => {
    const src = u.name?.trim() || u.email || "?";
    return src.charAt(0).toUpperCase();
  });
  return { initials, overflow: Math.max(0, total - maxIcons), total };
}

// ── Supabase Realtime channel (merged from realtime-presence.js, S91) ───

/**
 * @typedef {{ userId: string, displayName?: string, joinedAt: string }} PresencePayload
 * @typedef {Record<string, PresencePayload[]>} PresenceState
 * @typedef {(state: PresenceState) => void} PresenceListener
 * @typedef {{
 *   join(payload: PresencePayload): Promise<void>,
 *   leave(): Promise<void>,
 *   onPresenceChange(fn: PresenceListener): () => void,
 *   getState(): PresenceState,
 *   destroy(): void
 * }} PresenceChannel
 */

/**
 * Create a presence channel for admin coordination.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} [channelName]
 * @returns {PresenceChannel}
 */
export function createPresenceChannel(supabase, channelName = "admin-presence") {
  /** @type {PresenceListener[]} */
  const listeners = [];

  /** @type {PresenceState} */
  let state = {};

  const channel = supabase.channel(channelName, {
    config: { presence: { key: channelName } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      state = channel.presenceState();
      for (const fn of listeners) fn(state);
    })
    .on("presence", { event: "join" }, () => {
      state = channel.presenceState();
      for (const fn of listeners) fn(state);
    })
    .on("presence", { event: "leave" }, () => {
      state = channel.presenceState();
      for (const fn of listeners) fn(state);
    })
    .subscribe();

  return {
    async join(payload) {
      await channel.track({ ...payload, joinedAt: new Date().toISOString() });
    },
    async leave() {
      await channel.untrack();
    },
    onPresenceChange(fn) {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i !== -1) listeners.splice(i, 1);
      };
    },
    getState() {
      return state;
    },
    destroy() {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Count total online users across all presence slots.
 * @param {PresenceState} state
 * @returns {number}
 */
export function countOnline(state) {
  return Object.values(state).reduce((acc, arr) => acc + arr.length, 0);
}
