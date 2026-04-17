/**
 * src/utils/command-palette.js — Command palette for power users (Sprint 104)
 *
 * Framework-agnostic, DOM-free command registry.  The UI layer (section code)
 * owns rendering; this module owns command registration, search/filtering,
 * scoring, and keyboard result cycling.
 *
 * Usage:
 *   import { createCommandPalette } from "../utils/command-palette.js";
 *   const palette = createCommandPalette();
 *   palette.register({ id: "nav:guests", label: "Go to Guests", action: () => navigate("guests"), group: "Navigation" });
 *   const results = palette.search("guest");
 *   palette.execute(results[0].id);
 */

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   id:       string,
 *   label:    string,
 *   group?:   string,
 *   shortcut?: string,
 *   keywords?: string[],
 *   action:   () => void | Promise<void>,
 *   disabled?: boolean,
 * }} Command
 *
 * @typedef {{ command: Command, score: number }} SearchResult
 * @typedef {{ onOpen?: () => void, onClose?: () => void, maxResults?: number }} PaletteOptions
 */

// ── Scoring ────────────────────────────────────────────────────────────────

/**
 * Score how well a command matches a query string.
 * Higher is better; 0 = no match.
 * @param {Command} cmd
 * @param {string}  query   already downcased and trimmed
 * @returns {number}
 */
function scoreCommand(cmd, query) {
  if (!query) return 1; // everything matches empty query
  const label    = cmd.label.toLowerCase();
  const group    = (cmd.group ?? "").toLowerCase();
  const keywords = (cmd.keywords ?? []).map((k) => k.toLowerCase());

  // Exact match on id
  if (cmd.id.toLowerCase() === query) return 100;
  // Starts-with on label
  if (label.startsWith(query)) return 80;
  // Contains on label
  if (label.includes(query)) return 60;
  // Keyword match
  if (keywords.some((k) => k.includes(query))) return 40;
  // Group match
  if (group.includes(query)) return 20;

  // Fuzzy: all characters of query appear in label in order
  let qi = 0;
  for (let i = 0; i < label.length && qi < query.length; i++) {
    if (label[i] === query[qi]) qi++;
  }
  if (qi === query.length) return 10;

  return 0;
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a command palette instance.
 * @param {PaletteOptions} [opts]
 */
export function createCommandPalette(opts = {}) {
  const { onOpen, onClose, maxResults = 20 } = opts;

  /** @type {Map<string, Command>} */
  const commands = new Map();
  let _open = false;

  return {
    // ── Registration ─────────────────────────────────────────────────────

    /**
     * Register a command.  Overwrites existing command with same id.
     * @param {Command} cmd
     */
    register(cmd) {
      commands.set(cmd.id, cmd);
    },

    /**
     * Remove a command by id.
     * @param {string} id
     */
    unregister(id) {
      commands.delete(id);
    },

    /**
     * Replace all commands in one group.
     * @param {string}    group
     * @param {Command[]} cmds
     */
    registerGroup(group, cmds) {
      for (const cmd of cmds) {
        commands.set(cmd.id, { ...cmd, group });
      }
    },

    // ── Search ───────────────────────────────────────────────────────────

    /**
     * Search commands by query string.
     * @param {string} rawQuery
     * @returns {SearchResult[]}
     */
    search(rawQuery) {
      const query = rawQuery.toLowerCase().trim();
      /** @type {SearchResult[]} */
      const results = [];

      for (const cmd of commands.values()) {
        if (cmd.disabled) continue;
        const score = scoreCommand(cmd, query);
        if (score > 0) results.push({ command: cmd, score });
      }

      results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.command.label.localeCompare(b.command.label);
      });

      return results.slice(0, maxResults);
    },

    // ── Execution ────────────────────────────────────────────────────────

    /**
     * Execute a command by id.
     * @param {string} id
     * @returns {Promise<void>}
     */
    async execute(id) {
      const cmd = commands.get(id);
      if (!cmd) throw new Error(`command-palette: unknown command "${id}"`);
      if (cmd.disabled) return;
      await cmd.action();
    },

    // ── State ────────────────────────────────────────────────────────────

    open() {
      _open = true;
      onOpen?.();
    },

    close() {
      _open = false;
      onClose?.();
    },

    toggle() {
      if (_open) this.close();
      else this.open();
    },

    isOpen() { return _open; },

    /** All registered commands (in registration order). */
    getAll() { return [...commands.values()]; },

    /** Unique group names. */
    getGroups() {
      const groups = new Set(
        [...commands.values()].map((c) => c.group ?? "")
      );
      return [...groups].filter(Boolean).sort();
    },

    /** Count of registered commands. */
    size() { return commands.size; },
  };
}
