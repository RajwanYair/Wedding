/**
 * S609 smoke test — Cmd-K palette static command merge + reducer wiring.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const HANDLER = readFileSync("src/handlers/search-handler.js", "utf8");

describe("S609 Cmd-K palette wiring", () => {
  it("imports searchCommands and paletteReducer from utils", () => {
    expect(HANDLER).toMatch(/from\s+"\.\.\/utils\/command-palette-search\.js"/);
    expect(HANDLER).toMatch(/searchCommands/);
    expect(HANDLER).toMatch(/paletteReducer/);
  });

  it("declares a static command list", () => {
    expect(HANDLER).toMatch(/STATIC_COMMANDS\s*=/);
    expect(HANDLER).toMatch(/action:\s*"sync"/);
    expect(HANDLER).toMatch(/action:\s*"add-guest"/);
  });

  it("merges fuzzy-matched commands into the input results", () => {
    expect(HANDLER).toMatch(/searchCommands\(STATIC_COMMANDS,\s*input\.value\)/);
  });

  it("uses paletteReducer for state", () => {
    expect(HANDLER).toMatch(/_paletteState\s*=\s*paletteReducer/);
  });
});
