/**
 * tests/unit/realtime-presence.test.mjs — Sprint 91
 */

import { describe, it, expect, vi } from "vitest";
import {
  createPresenceChannel,
  countOnline,
} from "../../src/services/realtime.js";

// Minimal Supabase Realtime channel mock
function makeSupabase(overrideState = {}) {
  const handlers = {};
  const presenceStateMock = vi.fn().mockReturnValue(overrideState);

  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    track: vi.fn().mockResolvedValue({}),
    untrack: vi.fn().mockResolvedValue({}),
    presenceState: presenceStateMock,
    _handlers: handlers,
  };

  return {
    channel: vi.fn().mockReturnValue(channel),
    removeChannel: vi.fn(),
    _channel: channel,
  };
}

describe("createPresenceChannel", () => {
  it("creates a presence channel with join/leave/onPresenceChange/getState/destroy", () => {
    const supabase = makeSupabase();
    const pc = createPresenceChannel(supabase);
    expect(typeof pc.join).toBe("function");
    expect(typeof pc.leave).toBe("function");
    expect(typeof pc.onPresenceChange).toBe("function");
    expect(typeof pc.getState).toBe("function");
    expect(typeof pc.destroy).toBe("function");
    pc.destroy();
  });

  it("calls supabase.channel with the channel name", () => {
    const supabase = makeSupabase();
    createPresenceChannel(supabase, "my-channel");
    expect(supabase.channel).toHaveBeenCalledWith("my-channel", expect.anything());
  });

  it("subscribes on creation", () => {
    const supabase = makeSupabase();
    createPresenceChannel(supabase);
    expect(supabase._channel.subscribe).toHaveBeenCalled();
  });

  it("join calls channel.track with joinedAt", async () => {
    const supabase = makeSupabase();
    const pc = createPresenceChannel(supabase);
    await pc.join({ userId: "u1", displayName: "Alice" });
    expect(supabase._channel.track).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", joinedAt: expect.any(String) })
    );
    pc.destroy();
  });

  it("leave calls channel.untrack", async () => {
    const supabase = makeSupabase();
    const pc = createPresenceChannel(supabase);
    await pc.leave();
    expect(supabase._channel.untrack).toHaveBeenCalled();
    pc.destroy();
  });

  it("destroy calls supabase.removeChannel", () => {
    const supabase = makeSupabase();
    const pc = createPresenceChannel(supabase);
    pc.destroy();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });

  it("onPresenceChange returns unsubscribe function", () => {
    const supabase = makeSupabase();
    const pc = createPresenceChannel(supabase);
    const unsub = pc.onPresenceChange(() => {});
    expect(typeof unsub).toBe("function");
    unsub(); // should not throw
    pc.destroy();
  });

  it("getState returns initial empty object", () => {
    const supabase = makeSupabase();
    const pc = createPresenceChannel(supabase);
    expect(pc.getState()).toEqual({});
    pc.destroy();
  });
});

describe("countOnline", () => {
  it("returns 0 for empty state", () => {
    expect(countOnline({})).toBe(0);
  });

  it("sums all presence arrays", () => {
    const state = {
      k1: [{ userId: "u1" }, { userId: "u2" }],
      k2: [{ userId: "u3" }],
    };
    expect(countOnline(state)).toBe(3);
  });
});
