/**
 * src/services/realtime-presence.js — Supabase Realtime presence wrapper (Sprint 91)
 *
 * Wraps the Supabase Realtime channel API to track which admin browsers
 * are currently online.  Listeners receive the full presence state on
 * every join/leave/sync.
 */

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
 *
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
    /**
     * Broadcast this user's presence.
     * @param {PresencePayload} payload
     */
    async join(payload) {
      await channel.track({ ...payload, joinedAt: new Date().toISOString() });
    },

    /** Stop broadcasting presence. */
    async leave() {
      await channel.untrack();
    },

    /**
     * Subscribe to presence changes.
     * @param {PresenceListener} fn
     * @returns {() => void} unsubscribe
     */
    onPresenceChange(fn) {
      listeners.push(fn);
      return () => {
        const i = listeners.indexOf(fn);
        if (i !== -1) listeners.splice(i, 1);
      };
    },

    /** Current presence state (keyed by presence key). */
    getState() {
      return state;
    },

    /** Unsubscribe from the channel. */
    destroy() {
      supabase.removeChannel(channel);
    },
  };
}

/**
 * Count of unique users currently online.
 * @param {PresenceState} state
 * @returns {number}
 */
export function countOnline(state) {
  return Object.values(state).reduce((acc, arr) => acc + arr.length, 0);
}
