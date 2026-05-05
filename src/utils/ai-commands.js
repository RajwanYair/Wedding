/**
 * src/utils/ai-commands.js — S660 AI inline commands for Cmd-K
 *
 * Parses and executes inline AI command strings typed into the
 * command palette. Each command is a slash-prefixed action with args.
 *
 * @module ai-commands
 * @owner ai
 */

/**
 * @typedef {object} ParsedCommand
 * @property {string} name - Command name without slash
 * @property {string[]} args - Positional arguments
 * @property {Record<string, string>} flags - --key=value flags
 * @property {string} raw - Original input
 */

/**
 * Built-in command definitions.
 * @type {ReadonlyArray<{ name: string, description: string, usage: string, minArgs: number }>}
 */
export const COMMANDS = Object.freeze([
  { name: "add-guest", description: "Add a guest by name", usage: "/add-guest <name> [--table=N]", minArgs: 1 },
  { name: "find-guest", description: "Search for a guest", usage: "/find-guest <query>", minArgs: 1 },
  { name: "set-table", description: "Assign guest to table", usage: "/set-table <guestId> <tableNum>", minArgs: 2 },
  { name: "stats", description: "Show guest/RSVP stats", usage: "/stats [--type=guests|rsvp|budget]", minArgs: 0 },
  { name: "export", description: "Export data", usage: "/export <format> [--section=guests]", minArgs: 1 },
  { name: "theme", description: "Switch theme", usage: "/theme <name>", minArgs: 1 },
  { name: "lang", description: "Switch language", usage: "/lang <code>", minArgs: 1 },
  { name: "goto", description: "Navigate to section", usage: "/goto <section>", minArgs: 1 },
  { name: "undo", description: "Undo last action", usage: "/undo", minArgs: 0 },
  { name: "help", description: "List commands", usage: "/help [command]", minArgs: 0 },
]);

/**
 * Parse a slash command string into structured parts.
 *
 * @param {string} input
 * @returns {ParsedCommand|null}
 */
export function parseCommand(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.split(/\s+/);
  const name = parts[0].slice(1).toLowerCase();
  if (!name) return null;

  /** @type {string[]} */
  const args = [];
  /** @type {Record<string, string>} */
  const flags = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith("--")) {
      const eq = part.indexOf("=");
      if (eq > 2) {
        flags[part.slice(2, eq)] = part.slice(eq + 1);
      } else {
        flags[part.slice(2)] = "true";
      }
    } else {
      args.push(part);
    }
  }

  return { name, args, flags, raw: trimmed };
}

/**
 * Lookup a command definition by name.
 *
 * @param {string} name
 * @returns {typeof COMMANDS[number]|null}
 */
export function getCommandDef(name) {
  return COMMANDS.find((c) => c.name === name) ?? null;
}

/**
 * Validate a parsed command against its definition.
 *
 * @param {ParsedCommand} parsed
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCommand(parsed) {
  if (!parsed) return { valid: false, error: "Invalid command" };

  const def = getCommandDef(parsed.name);
  if (!def) return { valid: false, error: `Unknown command: /${parsed.name}` };

  if (parsed.args.length < def.minArgs) {
    return { valid: false, error: `/${parsed.name} requires at least ${def.minArgs} argument(s). Usage: ${def.usage}` };
  }

  return { valid: true };
}

/**
 * Autocomplete suggestions for partial command input.
 *
 * @param {string} partial
 * @returns {Array<{ name: string, description: string }>}
 */
export function autocomplete(partial) {
  if (typeof partial !== "string") return [];
  const trimmed = partial.trim().toLowerCase();
  const query = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;

  if (!query) return COMMANDS.map(({ name, description }) => ({ name, description }));

  return COMMANDS
    .filter((c) => c.name.startsWith(query))
    .map(({ name, description }) => ({ name, description }));
}

/**
 * Format help text for a command (or all commands).
 *
 * @param {string} [commandName]
 * @returns {string}
 */
export function helpText(commandName) {
  if (commandName) {
    const def = getCommandDef(commandName);
    if (!def) return `Unknown command: /${commandName}`;
    return `${def.usage}\n  ${def.description}`;
  }

  return COMMANDS.map((c) => `${c.usage}  — ${c.description}`).join("\n");
}

/**
 * Build a command string from parts (inverse of parse).
 *
 * @param {string} name
 * @param {string[]} [args]
 * @param {Record<string, string>} [flags]
 * @returns {string}
 */
export function buildCommand(name, args = [], flags = {}) {
  const parts = [`/${name}`, ...args];
  for (const [key, val] of Object.entries(flags)) {
    parts.push(val === "true" ? `--${key}` : `--${key}=${val}`);
  }
  return parts.join(" ");
}
