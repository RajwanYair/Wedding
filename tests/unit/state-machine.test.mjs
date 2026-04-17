/**
 * tests/unit/state-machine.test.mjs — Sprint 171
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStateMachine, StateMachine } from "../../src/utils/state-machine.js";

const config = {
  initial: "idle",
  states: {
    idle:    { on: { START: "loading" } },
    loading: { on: { SUCCESS: "done", ERROR: "failed" } },
    done:    { on: { RESET: "idle" } },
    failed:  { on: { RETRY: "loading", RESET: "idle" } },
  },
};

/** @returns {StateMachine} */
function make() { return createStateMachine(config); }

describe("createStateMachine", () => {
  it("creates a StateMachine instance", () => expect(make()).toBeInstanceOf(StateMachine));
  it("starts in initial state", () => expect(make().current).toBe("idle"));
  it("throws if initial state is not defined", () => {
    expect(() => createStateMachine({ initial: "unknown", states: {} })).toThrow();
  });
});

describe("send", () => {
  it("transitions to next state on valid event", () => {
    const fsm = make();
    fsm.send("START");
    expect(fsm.current).toBe("loading");
  });

  it("returns the new state", () => {
    expect(make().send("START")).toBe("loading");
  });

  it("stays in current state on unknown event", () => {
    const fsm = make();
    fsm.send("UNKNOWN");
    expect(fsm.current).toBe("idle");
  });

  it("supports multi-hop transitions", () => {
    const fsm = make();
    fsm.send("START");
    fsm.send("SUCCESS");
    expect(fsm.current).toBe("done");
  });

  it("throws if target state is not defined in config", () => {
    const broken = createStateMachine({
      initial: "a",
      states: { a: { on: { GO: "unknown" } } },
    });
    expect(() => broken.send("GO")).toThrow();
  });
});

describe("can", () => {
  it("returns true for allowed event", () => expect(make().can("START")).toBe(true));
  it("returns false for disallowed event", () => expect(make().can("SUCCESS")).toBe(false));
});

describe("is", () => {
  it("returns true when in state", () => expect(make().is("idle")).toBe(true));
  it("returns false when not in state", () => expect(make().is("loading")).toBe(false));
});

describe("events", () => {
  it("returns available events from current state", () => {
    expect(make().events).toContain("START");
  });

  it("is empty for terminal-like states (no outgoing events)", () => {
    const fsm = createStateMachine({
      initial: "end",
      states: { end: { on: {} } },
    });
    expect(fsm.events).toHaveLength(0);
  });
});

describe("onTransition", () => {
  it("calls listener on valid transition", () => {
    const fn = vi.fn();
    const fsm = make();
    fsm.onTransition(fn);
    fsm.send("START");
    expect(fn).toHaveBeenCalledWith("idle", "START", "loading");
  });

  it("calls listener with null next on rejected event", () => {
    const fn = vi.fn();
    const fsm = make();
    fsm.onTransition(fn);
    fsm.send("NOPE");
    expect(fn).toHaveBeenCalledWith("idle", "NOPE", null);
  });

  it("unsubscribe stops notifications", () => {
    const fn = vi.fn();
    const fsm = make();
    const unsub = fsm.onTransition(fn);
    unsub();
    fsm.send("START");
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("history", () => {
  it("records initial INIT entry", () => {
    expect(make().history[0]).toMatchObject({ event: "INIT", to: "idle" });
  });

  it("records each transition", () => {
    const fsm = make();
    fsm.send("START");
    fsm.send("SUCCESS");
    expect(fsm.history).toHaveLength(3); // INIT + START + SUCCESS
  });

  it("returns an immutable copy", () => {
    const fsm = make();
    const h = fsm.history;
    h.push({ from: "x", event: "y", to: "z" });
    expect(fsm.history).toHaveLength(1);
  });
});

describe("reset", () => {
  it("returns to initial state", () => {
    const fsm = make();
    fsm.send("START");
    fsm.reset();
    expect(fsm.current).toBe("idle");
  });

  it("clears history to init entry only", () => {
    const fsm = make();
    fsm.send("START");
    fsm.reset();
    expect(fsm.history).toHaveLength(1);
  });
});
