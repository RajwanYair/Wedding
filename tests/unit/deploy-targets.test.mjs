/**
 * tests/unit/deploy-targets.test.mjs — Sprint 152 deploy button widget
 */

import { describe, it, expect } from "vitest";
import { DEPLOY_TARGETS, getDeployButtons } from "../../src/services/platform-ops.js";

const REPO = "https://github.com/RajwanYair/Wedding";

describe("Deploy Targets (Sprint 152)", () => {
  it("has 4 deploy targets", () => {
    expect(DEPLOY_TARGETS).toHaveLength(4);
  });

  it("targets include vercel, netlify, cloudflare, render", () => {
    const keys = DEPLOY_TARGETS.map((t) => t.key);
    expect(keys).toEqual(["vercel", "netlify", "cloudflare", "render"]);
  });

  it("each target has name, icon, and buildUrl function", () => {
    for (const target of DEPLOY_TARGETS) {
      expect(typeof target.name).toBe("string");
      expect(typeof target.icon).toBe("string");
      expect(typeof target.buildUrl).toBe("function");
    }
  });

  describe("getDeployButtons", () => {
    it("returns 4 buttons for a valid repo", () => {
      const buttons = getDeployButtons(REPO);
      expect(buttons).toHaveLength(4);
    });

    it("each button has key, name, icon, url", () => {
      const buttons = getDeployButtons(REPO);
      for (const btn of buttons) {
        expect(btn).toHaveProperty("key");
        expect(btn).toHaveProperty("name");
        expect(btn).toHaveProperty("icon");
        expect(btn).toHaveProperty("url");
        expect(btn.url).toContain("http");
      }
    });

    it("Vercel URL contains repository-url param", () => {
      const [vercel] = getDeployButtons(REPO);
      expect(vercel.url).toContain("vercel.com");
      expect(vercel.url).toContain(encodeURIComponent(REPO));
    });

    it("Netlify URL contains repository param", () => {
      const buttons = getDeployButtons(REPO);
      const netlify = buttons.find((b) => b.key === "netlify");
      expect(netlify.url).toContain("netlify.com");
      expect(netlify.url).toContain(encodeURIComponent(REPO));
    });

    it("returns empty array for empty repo URL", () => {
      expect(getDeployButtons("")).toEqual([]);
      expect(getDeployButtons(null)).toEqual([]);
    });
  });
});
