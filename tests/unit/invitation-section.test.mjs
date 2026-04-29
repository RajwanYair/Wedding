/**
 * tests/unit/invitation-section.test.mjs — S308: section-module coverage for
 * @vitest-environment happy-dom
 * src/sections/invitation.js.
 *
 * Tests updateWeddingDetails(), batchMarkInvitationSent(), and mount/unmount
 * lifecycle with store integration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("../../src/core/i18n.js", () => ({
  t: (/** @type {string} */ k) => k,
}));

vi.mock("../../src/core/dom.js", () => ({
  el: new Proxy(
    {},
    {
      get: (/** @type {object} */ _t, /** @type {string} */ prop) =>
        document.getElementById(prop),
    },
  ),
  clearDomCache: vi.fn(),
  warmDom: vi.fn(),
}));

const mockMarkInvitationSent = vi.fn().mockResolvedValue(undefined);
vi.mock("../../src/services/guest-service.js", () => ({
  markInvitationSent: (.../** @type {unknown[]} */ args) =>
    mockMarkInvitationSent(...args),
}));

// ── Module under test ────────────────────────────────────────────────────

import { initStore, storeGet, storeSet } from "../../src/core/store.js";
import {
  mount,
  unmount,
  updateWeddingDetails,
  batchMarkInvitationSent,
  capabilities,
} from "../../src/sections/invitation.js";

// ── DOM helpers ───────────────────────────────────────────────────────────

/** Build the minimal DOM expected by invitation.js. */
function buildInvitationDom() {
  document.body.innerHTML = `
    <input id="groomName"          value="" />
    <input id="brideName"          value="" />
    <input id="groomNameEn"        value="" />
    <input id="brideNameEn"        value="" />
    <input id="weddingDate"        value="" />
    <input id="weddingHebrewDate"  value="" />
    <input id="weddingTime"        value="" />
    <input id="weddingCeremonyTime" value="" />
    <input id="rsvpDeadline"       value="" />
    <input id="venueName"          value="" />
    <input id="venueAddress"       value="" />
    <input id="venueWaze"          value="" />
    <div   id="venueMapContainer"  class="u-hidden"></div>
    <iframe id="venueMapFrame"     src=""></iframe>
    <a     id="venueMapFallback"   href=""  class="u-hidden"></a>
    <div   id="invitationImage"></div>
  `;
}

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(async () => {
  initStore({
    guests: { value: [] },
    weddingInfo: { value: {} },
  });
  buildInvitationDom();
  mockMarkInvitationSent.mockClear();
  unmount();
  await mount();
});

// ── Lifecycle ─────────────────────────────────────────────────────────────

describe("S308 — InvitationSection — lifecycle", () => {
  it("capabilities is defined", () => {
    expect(capabilities).toBeDefined();
  });

  it("mount does not throw", async () => {
    unmount();
    await expect(mount()).resolves.toBeUndefined();
  });
});

// ── updateWeddingDetails ──────────────────────────────────────────────────

describe("S308 — updateWeddingDetails", () => {
  it("reads form inputs and writes them to the store", () => {
    document.getElementById("groomName").value = "David";
    document.getElementById("brideName").value = "Sarah";
    document.getElementById("weddingDate").value = "2025-06-15";

    updateWeddingDetails();

    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo"));
    expect(info.groom).toBe("David");
    expect(info.bride).toBe("Sarah");
    expect(info.date).toBe("2025-06-15");
  });

  it("merges with existing store values (all inputs written)", () => {
    storeSet("weddingInfo", { groom: "Existing", venue: "Hall A" });
    // Populate the groomName input so it is preserved; change venueName.
    document.getElementById("groomName").value = "Existing";
    document.getElementById("venueName").value = "Hall B";

    updateWeddingDetails();

    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo"));
    expect(info.groom).toBe("Existing"); // preserved via input
    expect(info.venue).toBe("Hall B"); // updated
  });

  it("stores venueAddress from the input", () => {
    document.getElementById("venueAddress").value = "123 Main St";
    updateWeddingDetails();

    const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo"));
    expect(info.venueAddress).toBe("123 Main St");
  });

  it("does not throw when all inputs are empty", () => {
    expect(() => updateWeddingDetails()).not.toThrow();
  });
});

// ── batchMarkInvitationSent ───────────────────────────────────────────────

describe("S308 — batchMarkInvitationSent", () => {
  it("delegates to markInvitationSent with provided ids", async () => {
    await batchMarkInvitationSent(["g1", "g2"]);
    expect(mockMarkInvitationSent).toHaveBeenCalledWith(["g1", "g2"]);
  });

  it("handles an empty id list", async () => {
    await batchMarkInvitationSent([]);
    expect(mockMarkInvitationSent).toHaveBeenCalledWith([]);
  });
});
