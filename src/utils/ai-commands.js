/**
 * src/utils/ai-commands.js — re-export barrel (S681: domain module ai/index.ts)
 *
 * @module ai-commands
 * @owner ai
 */

export {
  COMMANDS,
  parseCommand,
  getCommandDef,
  validateCommand,
  autocomplete,
  helpText,
  buildCommand,
} from "./ai/index.js";
