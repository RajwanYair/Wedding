/**
 * src/utils/deploy-buttons.js — S129 one-click deploy URL builders.
 *
 * Builds "Deploy to Vercel / Netlify / Cloudflare Pages / Render" button
 * URLs from a public Git repository URL plus optional env-var hints.
 *
 * All functions are pure. They do NOT make network calls.
 */

/** @typedef {{ repoUrl: string, branch?: string, envVars?: string[], projectName?: string }} DeployInput */

function _assertRepo(/** @type {string} */ repoUrl) {
  if (typeof repoUrl !== "string" || repoUrl.length === 0) {
    throw new Error("repoUrl_required");
  }
  if (!/^https?:\/\//.test(repoUrl)) {
    throw new Error("repoUrl_must_be_http");
  }
}

/** Vercel: https://vercel.com/new/clone?repository-url=...&env=KEY1,KEY2 */
export function buildVercelDeployUrl({ repoUrl, envVars = /** @type {string[]} */ ([]), projectName = /** @type {string|undefined} */ (undefined) } = /** @type {DeployInput} */ ({})) {
  _assertRepo(repoUrl);
  const params = new URLSearchParams();
  params.set("repository-url", repoUrl);
  if (envVars.length > 0) params.set("env", envVars.join(","));
  if (projectName) params.set("project-name", projectName);
  return `https://vercel.com/new/clone?${params.toString()}`;
}

/** Netlify: https://app.netlify.com/start/deploy?repository=... */
export function buildNetlifyDeployUrl({ repoUrl = /** @type {string} */ ("") } = /** @type {DeployInput} */ ({})) {
  _assertRepo(repoUrl);
  const params = new URLSearchParams();
  params.set("repository", repoUrl);
  return `https://app.netlify.com/start/deploy?${params.toString()}`;
}

/** Cloudflare Pages: https://deploy.workers.cloudflare.com/?url=... */
export function buildCloudflarePagesUrl({ repoUrl = /** @type {string} */ ("") } = /** @type {DeployInput} */ ({})) {
  _assertRepo(repoUrl);
  const params = new URLSearchParams();
  params.set("url", repoUrl);
  return `https://deploy.workers.cloudflare.com/?${params.toString()}`;
}

/** Render: https://render.com/deploy?repo=... */
export function buildRenderDeployUrl({ repoUrl = /** @type {string} */ (""), branch = /** @type {string|undefined} */ (undefined) } = /** @type {DeployInput} */ ({})) {
  _assertRepo(repoUrl);
  const u = branch ? `${repoUrl}/tree/${encodeURIComponent(branch)}` : repoUrl;
  const params = new URLSearchParams();
  params.set("repo", u);
  return `https://render.com/deploy?${params.toString()}`;
}

/** Returns all four buttons keyed by provider. */
/** Returns all four buttons keyed by provider.
 * @param {DeployInput} input
 */
export function buildAllDeployButtons(/** @type {any} */ input) {
  return {
    vercel: buildVercelDeployUrl(input),
    netlify: buildNetlifyDeployUrl(input),
    cloudflare: buildCloudflarePagesUrl(input),
    render: buildRenderDeployUrl(input),
  };
}
