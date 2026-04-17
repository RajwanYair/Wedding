/**
 * tests/unit/presence.test.mjs — Sprint 169
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/services/sheets.js", () => ({
  sheetsPost: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/services/auth.js", () => ({
  currentUser: vi.fn(),
}));

vi.mock("../../src/core/state.js", () => ({
  load: vi.fn((key, def) => def),
  save: vi.fn(),
}));

import {
  startPresence,
  stopPresence,
  getPresence,
  onPresenceChange,
} from "../../src/services/presence.js";
import { currentUser } from "../../src/services/auth.js";
import { load, save } from "../../src/core/state.js";

/** @type {import("vitest").MockInstance} */
const mockCurrentUser = /** @type {any} */ (currentUser);
/** @type {import("vitest").MockInstance} */
const mockLoad = /** @type {any} */ (load);
/** @type {import("vitest").MockInstance} */
const mockSave = /** @type {any} */ (save);

/** Flush promises without relying on setTimeout (safe with fake timers). */
const flush = () => new Promise((r) => queueMicrotask(r));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.clearAllMocks();
  stopPresence(); // ensure clean state
  mockLoad.mockImplementation((key, def) => def);
});

afterEach(() => {
  stopPresence();
  vi.useRealTimers();
});

describe("getPresence", () => {
  it("returns empty array by default", () => {
    expect(getPresence()).toEqual([]);
  });
});

describe("onPresenceChange", () => {
  it("registers a listener and returns unsubscribe fn", () => {
    const fn = vi.fn();
    const unsub = onPresenceChange(fn);
    expect(typeof unsub).toBe("function");
  });

  it("unsubscribe removes the listener", () => {
    const fn = vi.fn();
    const unsub = onPresenceChange(fn);
    unsub();
    // No heartbeat should fire fn after unsubscribe
    // We test this via startPresence below
    expect(typeof unsub).toBe("function");
  });
});

describe("startPresence / stopPresence", () => {
  it("sends heartbeat when user is admin", async () => {
    mockCurrentUser.mockReturnValue({ email: "admin@example.com", isAdmin: true, displayName: "Admin" });
    startPresence();
    await flush();
    expect(mockSave).toHaveBeenCalled();
  });

  it("does not send heartbeat for non-admin user", async () => {
    mockCurrentUser.mockReturnValue({ email: "guest@example.com", isAdmin: false });
    startPresence();
    await flush();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("does not send heartbeat when no user", async () => {
    mockCurrentUser.mockReturnValue(null);
    startPresence();
    await flush();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("stopPresence is no-op when not started", () => {
    expect(() => stopPresence()).not.toThrow();
  });

  it("updates presence list from saved state", async () => {
    const existing = [
      { email: "admin@example.com", name: "Admin", lastSeen: new Date().toISOString() },
    ];
    mockLoad.mockImplementation(() => existing);
    mockCurrentUser.mockReturnValue({ email: "admin@example.com", isAdmin: true, displayName: "Admin" });
    startPresence();
    await flush();
    // presence list is updated from saved state
    expect(mockSave).toHaveBeenCalled();
  });

  it("fires listeners on heartbeat", async () => {
    const listener = vi.fn();
    mockCurrentUser.mockReturnValue({ email: "a@b.com", isAdmin: true });
    const unsub = onPresenceChange(listener);
    startPresence();
    await flush();
    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it("does not fire listener after unsubscribe", async () => {
    const listener = vi.fn();
    mockCurrentUser.mockReturnValue({ email: "a@b.com", isAdmin: true });
    const unsub = onPresenceChange(listener);
    unsub();
    startPresence();
    await flush();
    expect(listener).not.toHaveBeenCalled();
  });
});
