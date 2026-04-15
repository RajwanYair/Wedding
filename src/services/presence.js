/**
 * src/services/presence.js — S10.3 Presence indicator
 *
 * Tracks which admin users are currently active by writing a heartbeat
 * to the Config sheet and reading other users' heartbeats.
 * Uses sheetsPost() to write presence records.
 */

import { sheetsPost } from "./sheets.js";
import { currentUser } from "./auth.js";
import { load, save } from "../core/state.js";

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
    name: user.displayName || user.email || "Admin",
    lastSeen: new Date().toISOString(),
  };

  // Store locally
  const presence = /** @type {any[]} */ (load("presence", []) ?? []);
  const idx = presence.findIndex((p) => p.email === entry.email);
  if (idx >= 0) presence[idx] = entry;
  else presence.push(entry);
  save("presence", presence);

  // Update in-memory list (filter stale entries)
  const now = Date.now();
  _presenceList = presence.filter(
    (p) => now - new Date(p.lastSeen).getTime() < _STALE_MS,
  );

  // Notify listeners
  _listeners.forEach((fn) => {
    try {
      fn(_presenceList);
    } catch {
      // ignore listener errors
    }
  });

  // Try to push to Config sheet (fire-and-forget)
  try {
    await sheetsPost({
      action: "replaceAll",
      sheet: "Presence",
      rows: [presence.map((p) => [p.email, p.name, p.lastSeen])],
    });
  } catch {
    // Presence is best-effort; do not block on errors
  }
}
