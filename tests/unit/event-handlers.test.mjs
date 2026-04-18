/**
 * tests/unit/event-handlers.test.mjs — Sprint 198 + Sprint 7 (session)
 *
 * Expanded: tests now invoke handler callbacks and also test exported fns.
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/core/events.js", () => ({ on: vi.fn() }));
vi.mock("../../src/core/i18n.js", () => ({ t: vi.fn((k) => k) }));
vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn(), showConfirmDialog: vi.fn(),
}));
vi.mock("../../src/core/state.js", () => ({
  getActiveEventId: vi.fn(() => "default"),
  setActiveEvent: vi.fn(),
  listEvents: vi.fn(() => [{ id: "default", label: "Wedding" }]),
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

import {
  registerEventHandlers, doSwitchEvent, doDeleteEvent,
} from "../../src/handlers/event-handlers.js";
import { on } from "../../src/core/events.js";
import { showToast, showConfirmDialog } from "../../src/core/ui.js";
import { setActiveEvent, getActiveEventId, removeEvent, clearEventData } from "../../src/core/state.js";
import { reinitStore } from "../../src/core/store.js";
import { switchSection } from "../../src/core/section-resolver.js";

function getHandler(action) {
  const call = vi.mocked(on).mock.calls.find(([a]) => a === action);
  if (!call) throw new Error(`No handler for "${action}"`);
  return call[1];
}

describe("registerEventHandlers — registration", () => {
  beforeEach(() => { vi.mocked(on).mockClear(); });

  it("is a function", () => { expect(typeof registerEventHandlers).toBe("function"); });
  it("registers handlers via on()", () => {
    registerEventHandlers();
    expect(vi.mocked(on).mock.calls.length).toBeGreaterThan(0);
  });
  it("does not throw", () => { expect(() => registerEventHandlers()).not.toThrow(); });
  it("registers switchEvent handler", () => {
    registerEventHandlers();
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("switchEvent");
  });
  it("registers deleteEvent handler", () => {
    registerEventHandlers();
    expect(vi.mocked(on).mock.calls.map((c) => c[0])).toContain("deleteEvent");
  });
});

describe("registerEventHandlers — handler behavior", () => {
  beforeEach(() => {
    vi.mocked(on).mockClear();
    vi.mocked(showToast).mockReset();
    vi.mocked(showConfirmDialog).mockReset();
    registerEventHandlers();
  });

  it("switchEvent handler calls doSwitchEvent with element value", async () => {
    vi.mocked(getActiveEventId).mockReturnValue("default");
    const el = { value: "evt_abc" };
    await getHandler("switchEvent")(el);
    expect(setActiveEvent).toHaveBeenCalledWith("evt_abc");
  });

  it("switchEvent handler is a no-op when selecting same event", async () => {
    vi.mocked(getActiveEventId).mockReturnValue("default");
    vi.mocked(setActiveEvent).mockClear();
    const el = { value: "default" };
    await getHandler("switchEvent")(el);
    expect(setActiveEvent).not.toHaveBeenCalled();
  });
});

describe("doSwitchEvent", () => {
  beforeEach(() => {
    vi.mocked(getActiveEventId).mockReturnValue("default");
    vi.mocked(setActiveEvent).mockReset();
    vi.mocked(reinitStore).mockReset();
    vi.mocked(showToast).mockReset();
    vi.mocked(switchSection).mockReset();
  });

  it("calls setActiveEvent with the new id", async () => {
    await doSwitchEvent("evt_new");
    expect(setActiveEvent).toHaveBeenCalledWith("evt_new");
  });

  it("calls reinitStore after switching", async () => {
    await doSwitchEvent("evt_new");
    expect(reinitStore).toHaveBeenCalledOnce();
  });

  it("shows a toast after switching", async () => {
    await doSwitchEvent("evt_new");
    expect(showToast).toHaveBeenCalled();
  });

  it("returns early without state change when id is same", async () => {
    await doSwitchEvent("default");
    expect(setActiveEvent).not.toHaveBeenCalled();
  });
});

describe("doDeleteEvent", () => {
  beforeEach(() => {
    vi.mocked(getActiveEventId).mockReturnValue("default");
    vi.mocked(showToast).mockReset();
    vi.mocked(showConfirmDialog).mockReset();
    vi.mocked(removeEvent).mockReset();
    vi.mocked(clearEventData).mockReset();
  });

  it("shows toast and returns when active event is default", async () => {
    vi.mocked(getActiveEventId).mockReturnValue("default");
    await doDeleteEvent();
    expect(showToast).toHaveBeenCalled();
    expect(removeEvent).not.toHaveBeenCalled();
  });

  it("shows confirm dialog when event is not default", async () => {
    vi.mocked(getActiveEventId).mockReturnValue("evt_custom");
    vi.mocked(showConfirmDialog).mockReturnValue(false);
    await doDeleteEvent();
    expect(showConfirmDialog).toHaveBeenCalled();
  });
});

