import { describe, it, expect } from "vitest";
import {
  parseCommand,
  getCommandDef,
  validateCommand,
  autocomplete,
  helpText,
  buildCommand,
  COMMANDS,
} from "../../src/utils/ai-commands.js";

describe("ai-commands", () => {
  describe("COMMANDS", () => {
    it("has at least 10 commands", () => {
      expect(COMMANDS.length).toBeGreaterThanOrEqual(10);
    });

    it("is frozen", () => {
      expect(Object.isFrozen(COMMANDS)).toBe(true);
    });
  });

  describe("parseCommand", () => {
    it("parses a simple command", () => {
      const result = parseCommand("/stats");
      expect(result.name).toBe("stats");
      expect(result.args).toEqual([]);
    });

    it("parses args and flags", () => {
      const result = parseCommand("/add-guest Alice --table=5");
      expect(result.name).toBe("add-guest");
      expect(result.args).toEqual(["Alice"]);
      expect(result.flags.table).toBe("5");
    });

    it("parses boolean flags", () => {
      const result = parseCommand("/export csv --verbose");
      expect(result.flags.verbose).toBe("true");
    });

    it("returns null for non-slash input", () => {
      expect(parseCommand("hello")).toBeNull();
    });

    it("returns null for non-string", () => {
      expect(parseCommand(null)).toBeNull();
    });

    it("is case-insensitive", () => {
      expect(parseCommand("/STATS").name).toBe("stats");
    });
  });

  describe("getCommandDef", () => {
    it("finds a command definition", () => {
      expect(getCommandDef("stats").description).toBe("Show guest/RSVP stats");
    });

    it("returns null for unknown", () => {
      expect(getCommandDef("nope")).toBeNull();
    });
  });

  describe("validateCommand", () => {
    it("validates a correct command", () => {
      const parsed = parseCommand("/stats");
      expect(validateCommand(parsed).valid).toBe(true);
    });

    it("rejects missing args", () => {
      const parsed = parseCommand("/add-guest");
      const result = validateCommand(parsed);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("requires at least");
    });

    it("rejects unknown command", () => {
      const parsed = parseCommand("/xyz");
      expect(validateCommand(parsed).valid).toBe(false);
    });

    it("rejects null", () => {
      expect(validateCommand(null).valid).toBe(false);
    });
  });

  describe("autocomplete", () => {
    it("returns all commands for empty input", () => {
      expect(autocomplete("/").length).toBe(COMMANDS.length);
    });

    it("filters by prefix", () => {
      const results = autocomplete("/st");
      expect(results.length).toBe(1);
      expect(results[0].name).toBe("stats");
    });

    it("returns empty for no match", () => {
      expect(autocomplete("/zzz")).toEqual([]);
    });
  });

  describe("helpText", () => {
    it("returns help for a specific command", () => {
      const text = helpText("stats");
      expect(text).toContain("/stats");
      expect(text).toContain("Show guest");
    });

    it("returns all commands when no arg", () => {
      const text = helpText();
      expect(text).toContain("/add-guest");
      expect(text).toContain("/export");
    });

    it("handles unknown command", () => {
      expect(helpText("nope")).toContain("Unknown");
    });
  });

  describe("buildCommand", () => {
    it("builds a command string", () => {
      const result = buildCommand("add-guest", ["Alice"], { table: "5" });
      expect(result).toBe("/add-guest Alice --table=5");
    });

    it("builds a boolean flag command", () => {
      const result = buildCommand("export", ["csv"], { verbose: "true" });
      expect(result).toBe("/export csv --verbose");
    });

    it("builds a bare command", () => {
      expect(buildCommand("undo")).toBe("/undo");
    });
  });
});
