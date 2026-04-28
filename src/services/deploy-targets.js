/**
 * src/services/deploy-targets.js — S152 one-click deploy button targets.
 *
 * Each target has a name, icon, and URL-builder that takes a repo URL.
 * The settings section renders these as deploy buttons.
 */

/**
 * @typedef {{ key: string, name: string, icon: string, buildUrl: (repoUrl: string) => string }} DeployTarget
 */

/** @type {ReadonlyArray<DeployTarget>} */
export const DEPLOY_TARGETS = Object.freeze([
  {
    key: "vercel",
    name: "Vercel",
    icon: "▲",
    buildUrl: (repo) =>
      `https://vercel.com/new/clone?repository-url=${encodeURIComponent(repo)}`,
  },
  {
    key: "netlify",
    name: "Netlify",
    icon: "◆",
    buildUrl: (repo) =>
      `https://app.netlify.com/start/deploy?repository=${encodeURIComponent(repo)}`,
  },
  {
    key: "cloudflare",
    name: "Cloudflare Pages",
    icon: "☁",
    buildUrl: (repo) =>
      `https://dash.cloudflare.com/?to=/:account/pages/new/provider/gh&repository=${encodeURIComponent(repo)}`,
  },
  {
    key: "render",
    name: "Render",
    icon: "⬡",
    buildUrl: (repo) =>
      `https://render.com/deploy?repo=${encodeURIComponent(repo)}`,
  },
]);

/**
 * Build deploy-button data for the given repo URL.
 * @param {string} repoUrl
 * @returns {Array<{key: string, name: string, icon: string, url: string}>}
 */
export function getDeployButtons(repoUrl) {
  if (!repoUrl || typeof repoUrl !== "string") return [];
  return DEPLOY_TARGETS.map((t) => ({
    key: t.key,
    name: t.name,
    icon: t.icon,
    url: t.buildUrl(repoUrl),
  }));
}
