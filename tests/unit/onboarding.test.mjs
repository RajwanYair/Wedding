/**
 * tests/unit/onboarding.test.mjs — S113 onboarding wizard.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const _store = new Map();

beforeEach(() => {
  vi.resetModules();
  _store.clear();
});

vi.mock("../../src/core/storage.js", () => ({
  readBrowserStorage: vi.fn((k) => _store.get(k) ?? null),
  writeBrowserStorage: vi.fn((k, v) => {
    _store.set(k, v);
  }),
}));

describe("S113 — onboarding", () => {
  it("getOnboardingState defaults to welcome", async () => {
    const m = await import("../../src/services/workspace.js");
    expect(m.getOnboardingState()).toEqual({ step: "welcome", completed: false });
    expect(m.isOnboardingNeeded()).toBe(true);
  });

  it("advanceOnboarding walks the step list", async () => {
    const m = await import("../../src/services/workspace.js");
    expect(m.advanceOnboarding().step).toBe("event_basics");
    expect(m.advanceOnboarding().step).toBe("import_guests");
    expect(m.advanceOnboarding().step).toBe("choose_theme");
    expect(m.advanceOnboarding().step).toBe("invite_collaborator");
    const last = m.advanceOnboarding();
    expect(last.step).toBe("done");
    expect(last.completed).toBe(true);
    expect(m.isOnboardingNeeded()).toBe(false);
  });

  it("advanceOnboarding is a no-op when already completed", async () => {
    const m = await import("../../src/services/workspace.js");
    m.dismissOnboarding();
    const before = m.getOnboardingState();
    m.advanceOnboarding();
    expect(m.getOnboardingState()).toEqual(before);
  });

  it("dismissOnboarding sets completed flag", async () => {
    const m = await import("../../src/services/workspace.js");
    m.dismissOnboarding();
    const s = m.getOnboardingState();
    expect(s.completed).toBe(true);
    expect(s.completedAt).toBeTruthy();
  });

  it("getOnboardingState recovers from corrupt JSON", async () => {
    _store.set("wedding_v1_onboarding_state", "{not-json");
    const m = await import("../../src/services/workspace.js");
    expect(m.getOnboardingState()).toEqual({ step: "welcome", completed: false });
  });

  it("ONBOARDING_STEPS is frozen with 6 entries", async () => {
    const m = await import("../../src/services/workspace.js");
    expect(m.ONBOARDING_STEPS.length).toBe(6);
    expect(Object.isFrozen(m.ONBOARDING_STEPS)).toBe(true);
  });
});
