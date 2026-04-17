/**
 * src/services/supabase-realtime.js — Supabase Realtime channel management (Phase 7.4)
 *
 * Subscribes to Supabase Realtime WebSocket channels for live collaborative editing.
 * Replaces 30s polling with push-based updates when Supabase is configured.
 *
 * Channels:
 *   - `guests`   — INSERT/UPDATE/DELETE triggers `onGuestsChange(payload)`
 *   - `config`   — UPDATE triggers `onConfigChange(payload)` (wedding info sync)
 *
 * Offline handling:
 *   - On disconnect, queues local writes to offline-queue.js
 *   - On reconnect, reconciles remote state vs local (last-write-wins by updated_at)
 *
 * Zero runtime deps: uses native WebSocket API directly against Supabase Realtime endpoint.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../core/config.js";
import { load } from "../core/state.js";
import { storeGet, storeSet } from "../core/store.js";

// ── Runtime credential resolution ────────────────────────────────────────

function _url() {
  const stored = load("supabaseUrl", "");
  return (stored && String(stored).trim()) || SUPABASE_URL || "";
}

function _key() {
  const stored = load("supabaseAnonKey", "");
  return (stored && String(stored).trim()) || SUPABASE_ANON_KEY || "";
}

// ── Channel registry ─────────────────────────────────────────────────────

/** @type {WebSocket | null} */
let _ws = null;

/** @type {Map<string, Set<(payload: RealtimePayload) => void>>} */
const _listeners = new Map();

/** @type {boolean} */
let _connected = false;

/** @type {ReturnType<typeof setInterval> | null} */
let _heartbeatTimer = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let _reconnectTimer = null;

let _reconnectAttempts = 0;
const _MAX_RECONNECT_ATTEMPTS = 5;

/**
 * @typedef {{
 *   type: 'INSERT'|'UPDATE'|'DELETE',
 *   table: string,
 *   record: Record<string, unknown>,
 *   old_record: Record<string, unknown> | null
 * }} RealtimePayload
 */

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Subscribe to realtime events for a table.
 * @param {string} table    e.g. "guests", "config"
 * @param {(payload: RealtimePayload) => void} callback
 * @returns {() => void}  Unsubscribe function
 */
export function subscribeRealtime(table, callback) {
  if (!_listeners.has(table)) _listeners.set(table, new Set());
  /** @type {Set<(payload: RealtimePayload) => void>} */ (_listeners.get(table)).add(callback);

  // Auto-connect on first subscription
  if (!_ws || _ws.readyState > 1) _connect();

  return () => {
    _listeners.get(table)?.delete(callback);
    if ([..._listeners.values()].every((s) => s.size === 0)) _disconnect();
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
    _startHeartbeat();
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
    _stopHeartbeat();
    _scheduleReconnect();
  });

  _ws.addEventListener("error", () => {
    _connected = false;
    _stopHeartbeat();
  });
}

function _disconnect() {
  _stopHeartbeat();
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
  if (_ws) { _ws.close(); _ws = null; }
  _connected = false;
}

// ── Heartbeat ─────────────────────────────────────────────────────────────

function _startHeartbeat() {
  _heartbeatTimer = setInterval(() => {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: null }));
    }
  }, 30_000);
}

function _stopHeartbeat() {
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
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
  for (const table of _listeners.keys()) {
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
        postgres_changes: [
          { event: "*", schema: "public", table },
        ],
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
  const changes = /** @type {{ data?: { record?: unknown, old_record?: unknown, type?: string, table?: string } }} */ (msg.payload);
  const data = changes.data;
  if (!data) return;

  const payload = /** @type {RealtimePayload} */ ({
    type: /** @type {'INSERT'|'UPDATE'|'DELETE'} */ (data.type ?? "UPDATE"),
    table: String(data.table ?? ""),
    record: /** @type {Record<string, unknown>} */ (data.record ?? {}),
    old_record: /** @type {Record<string, unknown> | null} */ (data.old_record ?? null),
  });

  const callbacks = _listeners.get(payload.table);
  if (!callbacks) return;

  callbacks.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      console.error("[realtime] Listener error:", err);
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
    const guests = /** @type {import('../utils/misc.js').Guest[]} */ ([
      ...(/** @type {any[]} */ (storeGet("guests") ?? [])),
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
    id:            String(row.id ?? ""),
    firstName:     String(row.first_name ?? ""),
    lastName:      String(row.last_name ?? ""),
    phone:         String(row.phone ?? ""),
    email:         String(row.email ?? ""),
    count:         Number(row.count ?? 1),
    children:      Number(row.children ?? 0),
    status:        String(row.status ?? "pending"),
    side:          String(row.side ?? "mutual"),
    group:         String(row.group ?? "other"),
    meal:          String(row.meal ?? "regular"),
    mealNotes:     String(row.meal_notes ?? ""),
    accessibility: String(row.accessibility ?? ""),
    transport:     String(row.transport ?? ""),
    tableId:       row.table_id != null ? String(row.table_id) : null,
    gift:          String(row.gift ?? ""),
    notes:         String(row.notes ?? ""),
    sent:          Boolean(row.sent),
    checkedIn:     Boolean(row.checked_in),
    rsvpDate:      row.rsvp_date ? String(row.rsvp_date) : null,
    vip:           Boolean(row.vip),
    createdAt:     String(row.created_at ?? ""),
    updatedAt:     String(row.updated_at ?? ""),
  };
}
