/**
 * tests/unit/notification-preferences.test.mjs — Sprint 112
 */

import { describe, it, expect, beforeEach } from "vitest";
import { initStore } from "../../src/core/store.js";

import { vi } from "vitest";
vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  getPreferences, updatePreferences, isChannelEnabled,
  isEventEnabled, optOutAll, resetPreferences,
} = await import("../../src/services/notification-preferences.js");

function seed() {
  initStore({
    notificationPreferences: { value: {} },
    guests: { value: [] },
    weddingInfo: { value: {} },
  });
}

beforeEach(seed);

describe("getPreferences — defaults", () => {
  it("returns default prefs for unknown user", () => {
    const prefs = getPreferences("new_user");
    expect(prefs.channels.push).toBe(true);
    expect(prefs.channels.email).toBe(true);
    expect(prefs.channels.sms).toBe(false);
  });

  it("uses _default when no userId given", () => {
    const prefs = getPreferences();
    expect(prefs.userId).toBe("_default");
  });

  it("all events default to true", () => {
    const prefs = getPreferences("u1");
    expect(Object.values(prefs.events).every(Boolean)).toBe(true);
  });
});

describe("updatePreferences", () => {
  it("updates a channel preference", () => {
    updatePreferences("u1", { channels: { push: false } });
    expect(getPreferences("u1").channels.push).toBe(false);
  });

  it("does not overwrite other channels", () => {
    updatePreferences("u1", { channels: { sms: true } });
    expect(getPreferences("u1").channels.email).toBe(true);
  });

  it("updates an event preference", () => {
    updatePreferences("u1", { events: { campaign: false } });
    expect(getPreferences("u1").events.campaign).toBe(false);
  });

  it("sets updatedAt to non-zero", () => {
    const prefs = updatePreferences("u1", { channels: { push: false } });
    expect(prefs.updatedAt).toBeGreaterThan(0);
  });
});

describe("isChannelEnabled / isEventEnabled", () => {
  it("reflects updated channel preference", () => {
    updatePreferences("u1", { channels: { whatsapp: false } });
    expect(isChannelEnabled("u1", "whatsapp")).toBe(false);
    expect(isChannelEnabled("u1", "email")).toBe(true);
  });

  it("reflects updated event preference", () => {
    updatePreferences("u1", { events: { rsvp_reminder: false } });
    expect(isEventEnabled("u1", "rsvp_reminder")).toBe(false);
    expect(isEventEnabled("u1", "system")).toBe(true);
  });
});

describe("optOutAll", () => {
  it("disables all channels", () => {
    optOutAll("u1");
    const prefs = getPreferences("u1");
    expect(Object.values(prefs.channels).every((v) => !v)).toBe(true);
  });

  it("keeps system events enabled", () => {
    optOutAll("u1");
    expect(isEventEnabled("u1", "system")).toBe(true);
  });
});

describe("resetPreferences", () => {
  it("restores defaults", () => {
    updatePreferences("u1", { channels: { push: false, sms: true } });
    resetPreferences("u1");
    const prefs = getPreferences("u1");
    expect(prefs.channels.push).toBe(true);
    expect(prefs.channels.sms).toBe(false);
  });
});
