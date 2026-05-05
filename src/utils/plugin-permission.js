/**
 * src/utils/plugin-permission.js — re-export barrel (S680: domain module plugin/index.ts)
 *
 * @module plugin-permission
 * @owner plugin-runtime
 */

export {
  validateManifest,
  checkPermission,
  checkPermissions,
  getDangerousPermissions,
  isSandboxed,
  getPermissionDescription,
  getAllScopes,
  getRiskScore,
  getPermissionSummary,
} from "./plugin/index.js";
