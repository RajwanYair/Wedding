/**
 * src/utils/plugin/index.ts — Plugin domain module (S680)
 *
 * Consolidated from:
 *   plugin-permission.js  · plugin-sandbox.js
 *
 * @module plugin
 * @owner plugin-runtime
 */

import { listScopes } from "../plugin-manifest.js";

// ── Permission types ──────────────────────────────────────────────────────

export type PermissionScope =
  | "read:guests"
  | "write:guests"
  | "read:tables"
  | "write:tables"
  | "read:vendors"
  | "write:vendors"
  | "read:settings"
  | "write:settings"
  | "ui:modal"
  | "ui:notification"
  | "network:fetch"
  | "storage:local";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  permissions: PermissionScope[];
  author: string;
  trusted: boolean;
}

export interface PermissionCheck {
  granted: boolean;
  scope: PermissionScope;
  reason: string;
}

// ── Sandbox types ─────────────────────────────────────────────────────────

export type SandboxMessageType = "invoke" | "response" | "event" | "error";

export interface SandboxMessage {
  type: SandboxMessageType;
  id: string;
  method: string;
  payload?: unknown;
}

export interface SandboxInstance {
  pluginId: string;
  grants: ReadonlySet<string>;
  state: "idle" | "running" | "terminated";
  createdAt: string;
}

/** Manifest shape expected by the sandbox runtime (from plugin-manifest.js). */
export interface SandboxManifest {
  id: string;
  name?: string;
  permissions: string[];
}

// ── Permission private data ───────────────────────────────────────────────

const SCOPE_DESCRIPTIONS: Record<PermissionScope, string> = {
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

const DANGEROUS_SCOPES = new Set<PermissionScope>([
  "write:settings",
  "network:fetch",
  "storage:local",
]);

// ── Sandbox private state ─────────────────────────────────────────────────

let _counter = 0;

// ── Permission exports ────────────────────────────────────────────────────

export function validateManifest(manifest: Partial<PluginManifest>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!manifest.id || typeof manifest.id !== "string") errors.push("Missing or invalid id");
  if (!manifest.name || typeof manifest.name !== "string") errors.push("Missing or invalid name");
  if (!manifest.version || typeof manifest.version !== "string")
    errors.push("Missing or invalid version");
  if (!Array.isArray(manifest.permissions)) {
    errors.push("permissions must be an array");
  } else {
    for (const p of manifest.permissions) {
      if (!(p in SCOPE_DESCRIPTIONS)) errors.push(`Unknown permission: ${p}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function checkPermission(
  manifest: PluginManifest,
  scope: PermissionScope,
): PermissionCheck {
  const granted = manifest.permissions.includes(scope);
  return {
    granted,
    scope,
    reason: granted
      ? "Permission declared in manifest"
      : `Plugin "${manifest.name}" lacks "${scope}" permission`,
  };
}

export function checkPermissions(
  manifest: PluginManifest,
  scopes: PermissionScope[],
): { allGranted: boolean; results: PermissionCheck[] } {
  const results = scopes.map((s) => checkPermission(manifest, s));
  return {
    allGranted: results.every((r) => r.granted),
    results,
  };
}

export function getDangerousPermissions(manifest: PluginManifest): PermissionScope[] {
  return manifest.permissions.filter((p) => DANGEROUS_SCOPES.has(p));
}

export function isSandboxed(manifest: PluginManifest): boolean {
  if (manifest.trusted) return false;
  return getDangerousPermissions(manifest).length === 0;
}

export function getPermissionDescription(scope: PermissionScope): string {
  return SCOPE_DESCRIPTIONS[scope] || "Unknown permission";
}

export function getAllScopes(): Array<{
  scope: string;
  description: string;
  dangerous: boolean;
}> {
  return Object.entries(SCOPE_DESCRIPTIONS).map(([scope, description]) => ({
    scope,
    description,
    dangerous: DANGEROUS_SCOPES.has(scope as PermissionScope),
  }));
}

export function getRiskScore(manifest: PluginManifest): number {
  if (manifest.trusted) return 0;
  const dangerous = getDangerousPermissions(manifest).length;
  const writePerms = manifest.permissions.filter((p) => p.startsWith("write:")).length;
  const score = dangerous * 25 + writePerms * 15;
  return Math.min(100, score);
}

export function getPermissionSummary(manifest: PluginManifest): {
  total: number;
  read: number;
  write: number;
  ui: number;
  dangerous: number;
  riskScore: number;
} {
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

// ── Sandbox exports ───────────────────────────────────────────────────────

export function nextMessageId(): string {
  return `msg_${(++_counter).toString(36)}_${Date.now().toString(36)}`;
}

export function createSandbox(manifest: SandboxManifest): {
  ok: boolean;
  instance?: SandboxInstance;
  error?: string;
} {
  if (!manifest?.id) return { ok: false, error: "manifest with id is required" };
  if (!Array.isArray(manifest.permissions)) {
    return { ok: false, error: "manifest.permissions must be an array" };
  }
  const allowed = new Set(listScopes() as string[]);
  const invalid = manifest.permissions.filter((p) => !allowed.has(p));
  if (invalid.length > 0) {
    return { ok: false, error: `disallowed scopes: ${invalid.join(", ")}` };
  }
  return {
    ok: true,
    instance: {
      pluginId: manifest.id,
      grants: new Set(manifest.permissions),
      state: "idle",
      createdAt: new Date().toISOString(),
    },
  };
}

export function hasPermission(instance: SandboxInstance, method: string): boolean {
  if (!instance?.grants) return false;
  const [ns, action] = method.split(".");
  if (!ns) return false;
  const scope =
    action === "list" || action === "get" || action === "count"
      ? `${ns}:read`
      : `${ns}:write`;
  return instance.grants.has(scope);
}

export function buildInvokeMessage(method: string, payload?: unknown): SandboxMessage {
  return { type: "invoke", id: nextMessageId(), method, payload };
}

export function buildResponseMessage(
  correlationId: string,
  payload: unknown,
): SandboxMessage {
  return { type: "response", id: correlationId, method: "", payload };
}

export function buildErrorMessage(
  correlationId: string,
  errorText: string,
): SandboxMessage {
  return { type: "error", id: correlationId, method: "", payload: errorText };
}

export function terminateSandbox(instance: SandboxInstance): SandboxInstance {
  if (!instance) return instance;
  return { ...instance, state: "terminated" };
}
