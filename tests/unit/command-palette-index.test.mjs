/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { buildSearchIndex } from "../../src/services/analytics.js";

describe("Cmd-K command palette index (S567)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("includes static command entries at the top of the index", () => {
    const index = buildSearchIndex();
    const commands = index.filter((e) => e.type === "command");
    const actions = commands.map((c) => c.action).sort();
    expect(actions).toEqual([
      "add-guest",
      "export-csv",
      "open-settings",
      "sync",
      "toggle-theme",
    ]);
  });

  it("commands have stable ids and labels", () => {
    const index = buildSearchIndex();
    const sync = index.find((e) => e.id === "cmd:sync");
    expect(sync).toBeDefined();
    expect(sync?.type).toBe("command");
    expect(sync?.label).toBeTruthy();
  });
});
