/**
 * src/utils/plugin-manifest.js — S599 Plugin manifest + permission scopes
 *
 * Pure validators for the upcoming third-party plugin runtime. Plugins
 * declare a manifest (name/version/entry/permissions) which we vet
 * before loading via dynamic `import()` inside a sandbox iframe.
 *
 * @owner platform
 */

const ALLOWED_SCOPES = /** @type {const} */ ([
  "guests:read",
  "guests:write",
  "vendors:read",
  "vendors:write",
  "rsvp:read",
  "rsvp:write",
  "events:read",
  "ui:section",
  "ui:modal",
  "net:fetch",
  "storage:local",
]);

/** @typedef {(typeof ALLOWED_SCOPES)[number]} PluginScope */

/**
 * @typedef {object} PluginManifest
 * @property {string} id              // reverse-DNS, lowercase
 * @property {string} name
 * @property {string} version         // semver
 * @property {string} entry           // relative ESM path
 * @property {readonly PluginScope[]} permissions
 * @property {string=} author
 * @property {string=} homepage
 */

const ID_RE = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;

/** @returns {readonly PluginScope[]} */
export function listScopes() {
  return ALLOWED_SCOPES;
}

/**
 * Validate a manifest. Returns a list of human-readable problems.
 * @param {Partial<PluginManifest>} m
 * @returns {string[]}
 */
export function validateManifest(m) {
  const errs = [];
  if (!m || typeof m !== "object") return ["manifest must be an object"];
  if (!m.id || !ID_RE.test(m.id)) errs.push("id must be reverse-DNS, lowercase (e.g. com.acme.plugin)");
  if (!m.name || typeof m.name !== "string") errs.push("name is required");
  if (!m.version || !SEMVER_RE.test(m.version)) errs.push("version must be valid semver");
  if (!m.entry || typeof m.entry !== "string") errs.push("entry is required");
  if (m.entry && (m.entry.startsWith("/") || m.entry.includes("..") || /^[a-z][a-z0-9+\-.]*:/i.test(m.entry))) {
    errs.push("entry must be a relative path inside the plugin bundle");
  }
  if (!Array.isArray(m.permissions)) {
    errs.push("permissions must be an array");
  } else {
    for (const p of m.permissions) {
      if (!ALLOWED_SCOPES.includes(/** @type {PluginScope} */ (p))) {
        errs.push(`unknown permission: ${String(p)}`);
      }
    }
  }
  return errs;
}

/**
 * Determine if a manifest grants the requested scope.
 * @param {Pick<PluginManifest, "permissions">} manifest
 * @param {PluginScope} scope
 */
export function hasScope(manifest, scope) {
  if (!manifest || !Array.isArray(manifest.permissions)) return false;
  return manifest.permissions.includes(scope);
}

/**
 * Compute the minimal allowed Content-Security-Policy `connect-src` and
 * `script-src` directives a plugin needs based on its declared scopes.
 * Returned shape is convenient to feed into a sandbox `<iframe>` srcdoc.
 *
 * @param {Pick<PluginManifest, "permissions">} manifest
 * @returns {{ "script-src": string[], "connect-src": string[], "default-src": string[] }}
 */
export function buildCsp(manifest) {
  const perms = manifest?.permissions ?? [];
  /** @type {{ "script-src": string[], "connect-src": string[], "default-src": string[] }} */
  const csp = {
    "default-src": ["'none'"],
    "script-src": ["'self'"],
    "connect-src": ["'self'"],
  };
  if (perms.includes("net:fetch")) csp["connect-src"].push("https:");
  return csp;
}
