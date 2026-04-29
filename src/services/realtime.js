/**
 * src/services/realtime.js — Unified realtime & presence service (S237)
 *
 * Merged from:
 *   - presence-service.js  (S187) — heartbeat presence + badge helpers + Supabase presence channel
 *   - supabase-realtime.js (S17)  — Supabase Realtime WebSocket + SDK subscription management
 *
 * Public API:
 *   Presence:  startPresence · stopPresence · getPresence · onPresenceChange
 *   Badges:    isFresh · groupByViewing · badgeFor · countOnline
 *   Channel:   createPresenceChannel
 *   Realtime:  subscribeRealtime · subscribeGuestChanges · isRealtimeConnected
 *              disconnectRealtime · activateRealtimeSync
 */

import { sheetsPost } from "./sheets.js";
import { currentUser } from "./auth.js";
import { load, save } from "../core/state.js";
import { getSupabaseAnonKey, getSupabaseUrl } from "../core/app-config.js";
import { storeGet, storeSet } from "../core/store.js";
import { reportError } from "./observability.js";

// ═══════════════════════════════════════════════════════════════════════════
// § 1 — Heartbeat presence (from presence-service.js, S187)
// ═══════════════════════════════════════════════════════════════════════════

/** Heartbeat interval: 60 seconds */
const _HEARTBEAT_MS = 60_000;

/** Presence is considered stale after 2 minutes */
const _STALE_MS = 120_000;

/** @type {ReturnType<typeof setInterval> | null} */
let _heartbeatTimer = null;

/** @type {Array<{ email: string, name: string, lastSeen: string }>} */
let _presenceList = [];

/** @type {Set<Function>} */
const _presenceListeners = new Set();

/**
 * Subscribe to presence updates.
 * @param {(users: Array<{ email: string, name: string, lastSeen: string }>) => void} fn
 * @returns {() => void} Unsubscribe
 */
export function onPresenceChange(fn) {
  _presenceListeners.add(fn);
  return () => _presenceListeners.delete(fn);
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

  _presenceListeners.forEach((fn) => {
    try {
      fn(_presenceList);
    } catch {
      // Presence is best-effort; do not block on errors
    }
  });

  try {
    await sheetsPost(entry);
  } catch {
    // Best-effort
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// § 2 — Badge helpers (from presence-service.js, S112)
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// § 3 — Supabase Presence channel (from presence-service.js, S91)
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// § 4 — Supabase Realtime WebSocket (from supabase-realtime.js, S17)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {{
 *   type: 'INSERT'|'UPDATE'|'DELETE',
 *   table: string,
 *   record: Record<string, unknown>,
 *   old_record: Record<string, unknown> | null
 * }} RealtimePayload
 */

// ── Runtime credential resolution ────────────────────────────────────────

function _url() {
  return getSupabaseUrl();
}

function _key() {
  return getSupabaseAnonKey();
}

// ── Channel registry ─────────────────────────────────────────────────────

/** @type {WebSocket | null} */
let _ws = null;

/** @type {Map<string, Set<(payload: RealtimePayload) => void>>} */
const _realtimeListeners = new Map();

/** @type {boolean} */
let _connected = false;

/** @type {ReturnType<typeof setInterval> | null} */
let _wsHeartbeatTimer = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let _reconnectTimer = null;

let _reconnectAttempts = 0;
const _MAX_RECONNECT_ATTEMPTS = 5;

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Subscribe to realtime events for a table.
 * @param {string} table    e.g. "guests", "config"
 * @param {(payload: RealtimePayload) => void} callback
 * @returns {() => void}  Unsubscribe function
 */
export function subscribeRealtime(table, callback) {
  if (!_realtimeListeners.has(table)) _realtimeListeners.set(table, new Set());
  /** @type {Set<(payload: RealtimePayload) => void>} */ (_realtimeListeners.get(table)).add(callback);

  // Auto-connect on first subscription
  if (!_ws || _ws.readyState > 1) _connect();

  return () => {
    _realtimeListeners.get(table)?.delete(callback);
    if ([..._realtimeListeners.values()].every((s) => s.size === 0)) _disconnect();
  };
}

/**
 * Returns true if the Realtime connection is open.
 * @returns {boolean}
 */
export function isRealtimeConnected() {
  return _connected;
}

/**
 * Manually disconnect (e.g. on page unload or when switching to polling mode).
 */
export function disconnectRealtime() {
  _disconnect();
}

// ── Connection management ─────────────────────────────────────────────────

function _getWsUrl() {
  const base = _url().replace("https://", "wss://").replace("http://", "ws://");
  const key = _key();
  if (!base || !key) return null;
  return `${base}/realtime/v1/websocket?apikey=${key}&vsn=1.0.0`;
}

function _connect() {
  const wsUrl = _getWsUrl();
  if (!wsUrl) {
    console.warn("[realtime] Supabase not configured — Realtime unavailable");
    return;
  }

  _ws = new WebSocket(wsUrl);

  _ws.addEventListener("open", () => {
    _connected = true;
    _reconnectAttempts = 0;
    console.warn("[realtime] Connected");
    _startWsHeartbeat();
    _joinChannels();
  });

  _ws.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(/** @type {string} */ (event.data));
      _handleMessage(msg);
    } catch {}
  });

  _ws.addEventListener("close", () => {
    _connected = false;
    _stopWsHeartbeat();
    _scheduleReconnect();
  });

  _ws.addEventListener("error", () => {
    _connected = false;
    _stopWsHeartbeat();
  });
}

function _disconnect() {
  _stopWsHeartbeat();
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  if (_ws) {
    _ws.close();
    _ws = null;
  }
  _connected = false;
}

// ── WS Heartbeat ─────────────────────────────────────────────────────────

function _startWsHeartbeat() {
  _wsHeartbeatTimer = setInterval(() => {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: null }));
    }
  }, 30_000);
}

function _stopWsHeartbeat() {
  if (_wsHeartbeatTimer) {
    clearInterval(_wsHeartbeatTimer);
    _wsHeartbeatTimer = null;
  }
}

// ── Reconnection with exponential backoff ─────────────────────────────────

function _scheduleReconnect() {
  if (_reconnectAttempts >= _MAX_RECONNECT_ATTEMPTS) {
    console.warn("[realtime] Max reconnect attempts reached. Falling back to polling.");
    return;
  }
  const delay = Math.min(1000 * Math.pow(2, _reconnectAttempts), 30_000);
  _reconnectAttempts++;
  console.warn(`[realtime] Reconnecting in ${delay}ms (attempt ${_reconnectAttempts})`);
  _reconnectTimer = setTimeout(() => _connect(), delay);
}

// ── Channel join / message handling ──────────────────────────────────────

function _joinChannels() {
  for (const table of _realtimeListeners.keys()) {
    _subscribeTable(table);
  }
}

/**
 * Send a Phoenix join message for a database change channel.
 * @param {string} table
 */
function _subscribeTable(table) {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  const msg = {
    topic: `realtime:public:${table}`,
    event: "phx_join",
    payload: {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: "" },
        postgres_changes: [{ event: "*", schema: "public", table }],
      },
    },
    ref: table,
  };
  _ws.send(JSON.stringify(msg));
}

/**
 * @param {Record<string, unknown>} msg
 */
function _handleMessage(msg) {
  if (msg.event !== "postgres_changes") return;
  const changes =
    /** @type {{ data?: { record?: unknown, old_record?: unknown, type?: string, table?: string } }} */ (
      msg.payload
    );
  const data = changes.data;
  if (!data) return;

  const payload = /** @type {RealtimePayload} */ ({
    type: /** @type {'INSERT'|'UPDATE'|'DELETE'} */ (data.type ?? "UPDATE"),
    table: String(data.table ?? ""),
    record: /** @type {Record<string, unknown>} */ (data.record ?? {}),
    old_record: /** @type {Record<string, unknown> | null} */ (data.old_record ?? null),
  });

  const callbacks = _realtimeListeners.get(payload.table);
  if (!callbacks) return;

  callbacks.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      reportError(err, { source: "realtime", op: "listener" });
    }
  });
}

// ── Store integration helpers ─────────────────────────────────────────────

/**
 * Subscribe to guests table and merge remote changes into local store.
 * Uses last-write-wins on `updated_at` for conflict resolution.
 * @returns {() => void}  Unsubscribe function
 */
export function subscribeGuestChanges() {
  return subscribeRealtime("guests", (payload) => {
    const guests = /** @type {any[]} */ ([
      .../** @type {any[]} */ (storeGet("guests") ?? []),
    ]);

    if (payload.type === "INSERT" || payload.type === "UPDATE") {
      const remote = _mapGuest(payload.record);
      const idx = guests.findIndex((g) => g.id === remote.id);
      if (idx === -1) {
        guests.push(remote);
      } else {
        // Last-write-wins on updatedAt
        const local = guests[idx];
        const localTs = new Date(local.updatedAt || 0).getTime();
        const remoteTs = new Date(String(payload.record.updated_at ?? 0)).getTime();
        if (remoteTs >= localTs) guests[idx] = remote;
      }
    } else if (payload.type === "DELETE" && payload.old_record) {
      const id = /** @type {string} */ (payload.old_record.id);
      const idx = guests.findIndex((g) => g.id === id);
      if (idx !== -1) guests.splice(idx, 1);
    }

    storeSet("guests", guests);
  });
}

// ── Column name mapping (snake_case DB → camelCase JS) ───────────────────

/**
 * Map a Supabase DB guest row to the local Guest model.
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
function _mapGuest(row) {
  return {
    id: String(row.id ?? ""),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    count: Number(row.count ?? 1),
    children: Number(row.children ?? 0),
    status: String(row.status ?? "pending"),
    side: String(row.side ?? "mutual"),
    group: String(row.group ?? "other"),
    meal: String(row.meal ?? "regular"),
    mealNotes: String(row.meal_notes ?? ""),
    accessibility: String(row.accessibility ?? ""),
    transport: String(row.transport ?? ""),
    tableId: row.table_id != null ? String(row.table_id) : null,
    gift: String(row.gift ?? ""),
    notes: String(row.notes ?? ""),
    sent: Boolean(row.sent),
    checkedIn: Boolean(row.checked_in),
    rsvpDate: row.rsvp_date ? String(row.rsvp_date) : null,
    vip: Boolean(row.vip),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

// ── SDK-based Realtime (preferred over raw WebSocket) ────────────────────

/**
 * @type {Map<string, import("@supabase/supabase-js").RealtimeChannel>}
 */
const _sdkChannels = new Map();

/**
 * Dispatch a realtime payload to all registered listeners for a table.
 * Used by both the raw WebSocket path and the SDK path.
 * @param {string} table
 * @param {RealtimePayload} payload
 */
function _dispatch(table, payload) {
  const callbacks = _realtimeListeners.get(table);
  if (!callbacks) return;
  callbacks.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      reportError(err, { source: "realtime", op: "dispatch-listener" });
    }
  });
}

/**
 * Activate Supabase Realtime using the SDK client's `RealtimeChannel` API.
 * Preferred over the raw WebSocket path.
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 * @param {string[]} [tables]
 */
function activateSDKRealtime(client, tables = ["guests", "tables", "config"]) {
  deactivateSDKRealtime(client);

  for (const table of tables) {
    const channelName = `public:${table}`;

    const channel = client
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        _dispatch(table, {
          type: /** @type {'INSERT'|'UPDATE'|'DELETE'} */ (payload.eventType),
          table,
          record: /** @type {Record<string, unknown>} */ (payload.new ?? {}),
          old_record: /** @type {Record<string, unknown> | null} */ (payload.old ?? null),
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          _connected = true;
          console.warn(`[realtime-sdk] Subscribed: ${table}`);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          console.warn(`[realtime-sdk] Channel ${status}: ${table}`);
        }
      });

    _sdkChannels.set(table, channel);
  }
}

/**
 * Remove all SDK-based realtime subscriptions.
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 */
async function deactivateSDKRealtime(client) {
  for (const [table, channel] of _sdkChannels.entries()) {
    try {
      await client.removeChannel(channel);
    } catch {
      // ignore errors during teardown
    }
    _sdkChannels.delete(table);
  }
  if (_sdkChannels.size === 0) _connected = false;
}

/**
 * Auto-activate SDK realtime using the configured Supabase client.
 * No-op if client is not configured.
 * @param {string[]} [tables]
 * @returns {Promise<boolean>} true if activated, false if client not configured
 */
export async function activateRealtimeSync(tables) {
  const { getSupabaseClient } = await import("../core/supabase-client.js");
  const client = getSupabaseClient();
  if (!client) {
    console.warn("[realtime] Supabase client not configured — realtime skipped");
    return false;
  }
  activateSDKRealtime(client, tables);
  return true;
}
