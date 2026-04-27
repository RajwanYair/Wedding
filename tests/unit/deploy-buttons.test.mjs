/**
 * tests/unit/deploy-buttons.test.mjs — S129 one-click deploy URLs.
 */
import { describe, it, expect } from "vitest";
import {
  buildVercelDeployUrl,
  buildNetlifyDeployUrl,
  buildCloudflarePagesUrl,
  buildRenderDeployUrl,
  buildAllDeployButtons,
} from "../../src/utils/deploy-buttons.js";

const REPO = "https://github.com/RajwanYair/Wedding";

describe("S129 — deploy-buttons", () => {
  it("Vercel URL contains repo + env vars", () => {
    const u = buildVercelDeployUrl({
      repoUrl: REPO,
      envVars: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
      projectName: "wedding",
    });
    expect(u).toContain("vercel.com/new/clone");
    expect(u).toContain("repository-url=https%3A%2F%2Fgithub.com");
    expect(u).toContain("env=SUPABASE_URL%2CSUPABASE_ANON_KEY");
    expect(u).toContain("project-name=wedding");
  });

  it("Netlify URL has repository param", () => {
    expect(buildNetlifyDeployUrl({ repoUrl: REPO })).toContain(
      "app.netlify.com/start/deploy?repository=",
    );
  });

  it("Cloudflare Pages URL has url param", () => {
    expect(buildCloudflarePagesUrl({ repoUrl: REPO })).toContain(
      "deploy.workers.cloudflare.com/?url=",
    );
  });

  it("Render URL appends branch path", () => {
    const u = buildRenderDeployUrl({ repoUrl: REPO, branch: "main" });
    expect(u).toContain("render.com/deploy?repo=");
    expect(u).toContain("tree%2Fmain");
  });

  it("buildAllDeployButtons returns all 4 keys", () => {
    const all = buildAllDeployButtons({ repoUrl: REPO });
    expect(Object.keys(all).sort()).toEqual([
      "cloudflare",
      "netlify",
      "render",
      "vercel",
    ]);
  });

  it("rejects empty / non-http repos", () => {
    expect(() => buildVercelDeployUrl({ repoUrl: "" })).toThrow();
    expect(() => buildNetlifyDeployUrl({ repoUrl: "git@x.com:y/z.git" })).toThrow();
  });
});
