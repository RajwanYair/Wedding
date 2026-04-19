/**
 * src/services/supabase-realtime.js — Supabase Realtime channel management (S17)
 *
 * Subscribes to Supabase Realtime WebSocket channels for live collaborative editing.
 * Replaces 30s polling with push-based updates when Supabase is configured.
 *
 * Two strategies:
 *   - SDK path  (`activateSDKRealtime`)   — uses @supabase/supabase-js RealtimeChannel
 *   - Raw path  (`subscribeRealtime`)     — uses native WebSocket + Phoenix protocol
 *
 * SDK path is preferred when Supabase client is available.
 *
 * Channels:
 *   - `guests`   — INSERT/UPDATE/DELETE triggers `onGuestsChange(payload)`
 *   - `config`   — UPDATE triggers `onConfigChange(payload)` (wedding info sync)
 *
 * Offline handling:
 *   - On disconnect, queues local writes to offline-queue.js
 *   - On reconnect, reconciles remote state vs local (last-write-wins by updated_at)
 */

import { getSupabaseAnonKey, getSupabaseUrl } from "../core/app-config.js";
import { storeGet, storeSet } from "../core/store.js";

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
  const callbacks = _listeners.get(table);
  if (!callbacks) return;
  callbacks.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      console.error("[realtime] Listener error:", err);
    }
  });
}

/**
 * Activate Supabase Realtime using the SDK client's `RealtimeChannel` API.
 * Preferred over the raw WebSocket path — handles auth, reconnect, and
 * presence automatically.
 *
 * Call this once after the Supabase client is initialised.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} client
 * @param {string[]} [tables] — which tables to subscribe to (default: guests + config)
 */
export function activateSDKRealtime(
  client,
  tables = ["guests", "tables", "config"]
) {
  // Tear down any existing SDK channels before creating new ones
  deactivateSDKRealtime(client);

  for (const table of tables) {
    const channelName = `public:${table}`;

    const channel = client
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          _dispatch(table, {
            type: /** @type {'INSERT'|'UPDATE'|'DELETE'} */ (payload.eventType),
            table,
            record: /** @type {Record<string, unknown>} */ (payload.new ?? {}),
            old_record: /** @type {Record<string, unknown> | null} */ (payload.old ?? null),
          });
        }
      )
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
export async function deactivateSDKRealtime(client) {
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

