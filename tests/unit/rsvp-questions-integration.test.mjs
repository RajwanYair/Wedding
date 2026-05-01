/**
 * S607 smoke test — conditional RSVP question engine wired into rsvp section.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initStore, storeSet } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: vi.fn(),
  appendToRsvpLog: vi.fn(() => Promise.resolve()),
  syncStoreKeyToSheets: vi.fn(() => Promise.resolve()),
}));

const SECTION = readFileSync("src/sections/rsvp.js", "utf8");

describe("S607 RSVP conditional question engine", () => {
  beforeEach(() => {
    initStore({ weddingInfo: { value: {} } });
  });

  it("imports rsvp-question-engine helpers", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/rsvp-question-engine\.js"/);
    expect(SECTION).toMatch(/visibleQuestions/);
    expect(SECTION).toMatch(/validateAnswers/);
    expect(SECTION).toMatch(/expandPlusOnes/);
  });

  it("getRsvpQuestions returns weddingInfo.rsvpQuestions array", async () => {
    const { getRsvpQuestions } = await import("../../src/sections/rsvp.js");
    storeSet("weddingInfo", {
      rsvpQuestions: [{ id: "q1", type: "text", label: "Test" }],
    });
    const qs = getRsvpQuestions();
    expect(qs).toHaveLength(1);
    expect(qs[0].id).toBe("q1");
  });

  it("getVisibleRsvpQuestions filters by showWhen", async () => {
    const { getVisibleRsvpQuestions } = await import("../../src/sections/rsvp.js");
    storeSet("weddingInfo", {
      rsvpQuestions: [
        { id: "veg", type: "boolean", label: "Vegan?" },
        {
          id: "vegDetails",
          type: "text",
          label: "Details",
          showWhen: { equals: { id: "veg", value: true } },
        },
      ],
    });
    expect(getVisibleRsvpQuestions({ veg: false })).toHaveLength(1);
    expect(getVisibleRsvpQuestions({ veg: true })).toHaveLength(2);
  });

  it("validateRsvpAnswers detects missing required answers", async () => {
    const { validateRsvpAnswers } = await import("../../src/sections/rsvp.js");
    storeSet("weddingInfo", {
      rsvpQuestions: [{ id: "diet", type: "text", label: "Diet", required: true }],
    });
    const r = validateRsvpAnswers({});
    expect(r.valid).toBe(false);
    expect(r.missing).toContain("diet");
  });

  it("expandRsvpPlusOnes builds synthetic stubs", async () => {
    const { expandRsvpPlusOnes } = await import("../../src/sections/rsvp.js");
    const stubs = expandRsvpPlusOnes("g1", 2);
    expect(stubs).toHaveLength(2);
    expect(stubs[0].parentId).toBe("g1");
    expect(stubs[0].kind).toBe("plus-one");
  });
});
