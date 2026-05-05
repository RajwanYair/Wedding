// tests/unit/command-palette-links.test.mjs — S633 Cmd-K deep-links + recent
import { describe, it, expect } from "vitest";
import {
  builtinDeepLinks,
  deepLinksToCommands,
  resolveDeepLink,
  mergeRecentSearches,
  registerDeepLink,
} from "../../src/utils/command-palette-links.js";

describe("command-palette-links", () => {
  describe("builtinDeepLinks", () => {
    it("returns at least 10 links", () => {
      expect(builtinDeepLinks().length).toBeGreaterThanOrEqual(10);
    });
    it("includes section, modal, and action types", () => {
      const types = new Set(builtinDeepLinks().map((d) => d.type));
      expect(types.has("section")).toBe(true);
      expect(types.has("modal")).toBe(true);
      expect(types.has("action")).toBe(true);
    });
  });

  describe("deepLinksToCommands", () => {
    it("converts deep links to commands", () => {
      const cmds = deepLinksToCommands(builtinDeepLinks());
      expect(cmds[0]).toHaveProperty("id");
      expect(cmds[0]).toHaveProperty("label");
      expect(cmds[0]).toHaveProperty("section");
    });
    it("handles null", () => {
      expect(deepLinksToCommands(null)).toEqual([]);
    });
  });

  describe("resolveDeepLink", () => {
    it("resolves section link", () => {
      const result = resolveDeepLink("dl:guests:all");
      expect(result.type).toBe("section");
      expect(result.target).toBe("guests");
    });
    it("resolves with params", () => {
      const result = resolveDeepLink("dl:guests:pending");
      expect(result.params.filter).toBe("pending");
    });
    it("resolves modal link", () => {
      const result = resolveDeepLink("dl:modal:add-guest");
      expect(result.type).toBe("modal");
    });
    it("returns null for unknown", () => {
      expect(resolveDeepLink("dl:nope")).toBeNull();
    });
    it("uses custom links", () => {
      const custom = [{ id: "dl:custom", type: "action", target: "custom-action", label: "Custom" }];
      expect(resolveDeepLink("dl:custom", custom).target).toBe("custom-action");
    });
  });

  describe("mergeRecentSearches", () => {
    it("prepends recent searches", () => {
      const cmds = [{ id: "cmd1", label: "Dashboard" }];
      const merged = mergeRecentSearches(cmds, ["wedding", "guests"]);
      expect(merged[0].label).toBe("wedding");
      expect(merged[1].label).toBe("guests");
      expect(merged[2].label).toBe("Dashboard");
    });
    it("returns commands when no recent", () => {
      const cmds = [{ id: "cmd1", label: "X" }];
      expect(mergeRecentSearches(cmds, [])).toEqual(cmds);
    });
    it("handles null commands", () => {
      const merged = mergeRecentSearches(null, ["test"]);
      expect(merged).toHaveLength(1);
    });
  });

  describe("registerDeepLink", () => {
    it("adds new link", () => {
      const links = [...builtinDeepLinks()];
      const len = links.length;
      const ok = registerDeepLink(links, { id: "dl:custom", type: "action", target: "x", label: "X" });
      expect(ok).toBe(true);
      expect(links).toHaveLength(len + 1);
    });
    it("rejects duplicate", () => {
      const links = [...builtinDeepLinks()];
      expect(registerDeepLink(links, { id: "dl:guests:all", type: "section", target: "y", label: "Y" })).toBe(false);
    });
    it("rejects null array", () => {
      expect(registerDeepLink(null, { id: "x", type: "action", target: "x", label: "X" })).toBe(false);
    });
  });
});
