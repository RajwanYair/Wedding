/**
 * src/utils/state-machine.js — Lightweight finite state machine (Sprint 171)
 *
 * Provides a minimal FSM for managing multi-step UI flows
 * (e.g. RSVP flow states, form wizard steps, modal sequences).
 *
 * Usage:
 *   const fsm = createStateMachine({
 *     initial: "idle",
 *     states: {
 *       idle:       { on: { START: "loading" } },
 *       loading:    { on: { SUCCESS: "done", ERROR: "failed" } },
 *       done:       { on: { RESET: "idle" } },
 *       failed:     { on: { RETRY: "loading", RESET: "idle" } },
 *     },
 *   });
 *
 *   fsm.send("START");   // → "loading"
 *   fsm.current;         // → "loading"
 */

/**
 * @typedef {{ on: Record<string, string> }} StateConfig
 * @typedef {{ initial: string, states: Record<string, StateConfig> }} MachineConfig
 * @typedef {(current: string, event: string, next: string | null) => void} TransitionHook
 */

export class StateMachine {
  /**
   * @param {MachineConfig} config
   */
  constructor(config) {
    if (!config.states[config.initial]) {
      throw new Error(`Initial state "${config.initial}" not found in states`);
    }
    this._config = config;
    this._current = config.initial;
    /** @type {Set<TransitionHook>} */
    this._listeners = new Set();
    /** @type {{ from: string, event: string, to: string }[]} */
    this._history = [{ from: "", event: "INIT", to: config.initial }];
  }

  /** @returns {string} Current state name */
  get current() {
    return this._current;
  }

  /** @returns {string[]} Allowed events from current state */
  get events() {
    return Object.keys(this._config.states[this._current]?.on ?? {});
  }

  /**
   * Check if an event can be sent from the current state.
   * @param {string} event
   * @returns {boolean}
   */
  can(event) {
    return event in (this._config.states[this._current]?.on ?? {});
  }

  /**
   * Check if the machine is in a given state.
   * @param {string} state
   * @returns {boolean}
   */
  is(state) {
    return this._current === state;
  }

  /**
   * Send an event. Returns the new state, or current state if transition not allowed.
   * @param {string} event
   * @returns {string} new state
   */
  send(event) {
    const transitions = this._config.states[this._current]?.on ?? {};
    const next = transitions[event];
    if (!next) {
      for (const fn of this._listeners) fn(this._current, event, null);
      return this._current;
    }
    if (!this._config.states[next]) {
      throw new Error(`Target state "${next}" not found in states`);
    }
    const prev = this._current;
    this._current = next;
    this._history.push({ from: prev, event, to: next });
    for (const fn of this._listeners) fn(prev, event, next);
    return next;
  }

  /**
   * Subscribe to state transitions.
   * @param {TransitionHook} fn  Called with (from, event, to) — to is null if transition ignored
   * @returns {() => void} unsubscribe
   */
  onTransition(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /**
   * Returns the full transition history (immutable copy).
   * @returns {{ from: string, event: string, to: string }[]}
   */
  get history() {
    return [...this._history];
  }

  /** Reset to the initial state. */
  reset() {
    const prev = this._current;
    this._current = this._config.initial;
    this._history = [{ from: "", event: "INIT", to: this._config.initial }];
    for (const fn of this._listeners) fn(prev, "RESET", this._current);
  }
}

/**
 * Factory helper.
 * @param {MachineConfig} config
 * @returns {StateMachine}
 */
export function createStateMachine(config) {
  return new StateMachine(config);
}
