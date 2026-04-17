/**
 * tests/unit/event-handlers.test.mjs — Sprint 198
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(), showConfirmDialog: vi.fn(),
}));
vi.mock("../../src/core/state.js", () => ({
  getActiveEventId: vi.fn(() => "default"),
  setActiveEvent: vi.fn(),
  listEvents: vi.fn(() => []),
  addEvent: vi.fn(),
  removeEvent: vi.fn(),
  clearEventData: vi.fn(),
}));
vi.mock("../../src/core/store.js", () => ({ reinitStore: vi.fn() }));
vi.mock("../../src/core/defaults.js", () => ({ buildStoreDefs: vi.fn(() => []) }));
vi.mock("../../src/services/auth.js", () => ({ currentUser: vi.fn(() => null) }));
vi.mock("../../src/core/section-resolver.js", () => ({
  resolveSection: vi.fn(() => Promise.resolve(null)),
  switchSection: vi.fn(() => Promise.resolve()),
}));

import { registerEventHandlers } from "../../src/handlers/event-handlers.js";
import { on } from "../../src/core/events.js";

describe("registerEventHandlers", () => {
  it("is a function", () => {
    expect(typeof registerEventHandlers).toBe("function");
  });

  it("registers handlers via on()", () => {
    vi.mocked(on).mockClear();
    registerEventHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });

  it("does not throw", () => {
    expect(() => registerEventHandlers()).not.toThrow();
  });

  it("registers switchEvent handler", () => {
    vi.mocked(on).mockClear();
    registerEventHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("switchEvent");
  });

  it("registers deleteEvent handler", () => {
    vi.mocked(on).mockClear();
    registerEventHandlers();
    const actions = vi.mocked(on).mock.calls.map((c) => c[0]);
    expect(actions).toContain("deleteEvent");
  });
});
