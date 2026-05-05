/**
 * src/utils/plugin-permission.js — Plugin permission checking & scope validation (S671)
 *
 * @module plugin-permission
 * @owner plugin-runtime
 */

/**
 * @typedef {"read:guests"|"write:guests"|"read:tables"|"write:tables"|"read:vendors"|"write:vendors"|"read:settings"|"write:settings"|"ui:modal"|"ui:notification"|"network:fetch"|"storage:local"} PermissionScope
 */

/**
 * @typedef {object} PluginManifest
 * @property {string} id
 * @property {string} name
 * @property {string} version
 * @property {PermissionScope[]} permissions
 * @property {string} author
 * @property {boolean} trusted
 */

/**
 * @typedef {object} PermissionCheck
 * @property {boolean} granted
 * @property {PermissionScope} scope
 * @property {string} reason
 */

const SCOPE_DESCRIPTIONS = {
  "read:guests": "Read guest list data",
  "write:guests": "Modify guest data",
  "read:tables": "Read table assignments",
  "write:tables": "Modify table assignments",
  "read:vendors": "Read vendor information",
  "write:vendors": "Modify vendor data",
  "read:settings": "Read app settings",
  "write:settings": "Modify app settings",
  "ui:modal": "Display modal dialogs",
  "ui:notification": "Show notifications",
  "network:fetch": "Make network requests",
  "storage:local": "Access local storage",
};

const DANGEROUS_SCOPES = new Set([
  "write:settings",
  "network:fetch",
  "storage:local",
]);

/**
 * Validate a plugin manifest.
 * @param {object} manifest
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateManifest(manifest) {
  const errors = [];
  if (!manifest.id || typeof manifest.id !== "string") errors.push("Missing or invalid id");
  if (!manifest.name || typeof manifest.name !== "string") errors.push("Missing or invalid name");
  if (!manifest.version || typeof manifest.version !== "string") errors.push("Missing or invalid version");
  if (!Array.isArray(manifest.permissions)) errors.push("permissions must be an array");
  else {
    for (const p of manifest.permissions) {
      if (!SCOPE_DESCRIPTIONS[p]) errors.push(`Unknown permission: ${p}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Check if plugin has a specific permission.
 * @param {PluginManifest} manifest
 * @param {PermissionScope} scope
 * @returns {PermissionCheck}
 */
export function checkPermission(manifest, scope) {
  const granted = manifest.permissions.includes(scope);
  return {
    granted,
    scope,
    reason: granted ? "Permission declared in manifest" : `Plugin "${manifest.name}" lacks "${scope}" permission`,
  };
}

/**
 * Check multiple permissions at once.
 * @param {PluginManifest} manifest
 * @param {PermissionScope[]} scopes
 * @returns {{ allGranted: boolean, results: PermissionCheck[] }}
 */
export function checkPermissions(manifest, scopes) {
  const results = scopes.map((s) => checkPermission(manifest, s));
  return {
    allGranted: results.every((r) => r.granted),
    results,
  };
}

/**
 * Get dangerous permissions in manifest.
 * @param {PluginManifest} manifest
 * @returns {PermissionScope[]}
 */
export function getDangerousPermissions(manifest) {
  return manifest.permissions.filter((p) => DANGEROUS_SCOPES.has(p));
}

/**
 * Check if plugin is sandboxed (no dangerous perms + not trusted).
 * @param {PluginManifest} manifest
 * @returns {boolean}
 */
export function isSandboxed(manifest) {
  if (manifest.trusted) return false;
  return getDangerousPermissions(manifest).length === 0;
}

/**
 * Get permission description.
 * @param {PermissionScope} scope
 * @returns {string}
 */
export function getPermissionDescription(scope) {
  return SCOPE_DESCRIPTIONS[scope] || "Unknown permission";
}

/**
 * Get all available scopes.
 * @returns {Array<{ scope: string, description: string, dangerous: boolean }>}
 */
export function getAllScopes() {
  return Object.entries(SCOPE_DESCRIPTIONS).map(([scope, description]) => ({
    scope,
    description,
    dangerous: DANGEROUS_SCOPES.has(scope),
  }));
}

/**
 * Calculate permission risk score (0-100).
 * @param {PluginManifest} manifest
 * @returns {number}
 */
export function getRiskScore(manifest) {
  if (manifest.trusted) return 0;
  const dangerous = getDangerousPermissions(manifest).length;
  const writePerms = manifest.permissions.filter((p) => p.startsWith("write:")).length;
  const score = dangerous * 25 + writePerms * 15;
  return Math.min(100, score);
}

/**
 * Generate permission summary for UI display.
 * @param {PluginManifest} manifest
 * @returns {{ total: number, read: number, write: number, ui: number, dangerous: number, riskScore: number }}
 */
export function getPermissionSummary(manifest) {
  const read = manifest.permissions.filter((p) => p.startsWith("read:")).length;
  const write = manifest.permissions.filter((p) => p.startsWith("write:")).length;
  const ui = manifest.permissions.filter((p) => p.startsWith("ui:")).length;
  const dangerous = getDangerousPermissions(manifest).length;

  return {
    total: manifest.permissions.length,
    read,
    write,
    ui,
    dangerous,
    riskScore: getRiskScore(manifest),
  };
}
