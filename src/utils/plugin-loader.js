/**
 * src/utils/plugin-loader.js — S631 Plugin dynamic loader + permission gating
 *
 * Orchestrates the plugin lifecycle: validate manifest → create sandbox →
 * register API surface → load entry. Provides the bridge between the
 * manifest/review layer and the sandbox runtime.
 *
 * @module plugin-loader
 * @owner platform
 */

import { validateManifest } from "./plugin-manifest.js";
import { createSandbox, terminateSandbox, hasPermission } from "./plugin-sandbox.js";

/**
 * @typedef {import('./plugin-manifest.js').PluginManifest} PluginManifest
 * @typedef {import('./plugin-sandbox.js').SandboxInstance} SandboxInstance
 */

/**
 * @typedef {object} LoadedPlugin
 * @property {PluginManifest} manifest
 * @property {SandboxInstance} sandbox
 * @property {"loaded"|"failed"|"unloaded"} loadState
 * @property {string=} error
 */

/**
 * @typedef {object} PluginRegistry
 * @property {Map<string, LoadedPlugin>} plugins
 */

/**
 * Create an empty plugin registry.
 *
 * @returns {PluginRegistry}
 */
export function createRegistry() {
  return { plugins: new Map() };
}

/**
 * Attempt to register and prepare a plugin. Does NOT actually import the
 * entry file (that requires a real browser/worker context). Instead,
 * validates the manifest, creates the sandbox, and records it in the registry.
 *
 * @param {PluginRegistry} registry
 * @param {PluginManifest} manifest
 * @returns {{ ok: boolean, plugin?: LoadedPlugin, errors?: string[] }}
 */
export function registerPlugin(registry, manifest) {
  const manifestErrors = validateManifest(manifest);
  if (manifestErrors.length > 0) return { ok: false, errors: manifestErrors };

  if (registry.plugins.has(manifest.id)) {
    return { ok: false, errors: [`plugin "${manifest.id}" is already registered`] };
  }

  const { ok, instance, error } = createSandbox(manifest);
  if (!ok) return { ok: false, errors: [error ?? "sandbox creation failed"] };

  const plugin = {
    manifest,
    sandbox: instance,
    loadState: /** @type {const} */ ("loaded"),
  };
  registry.plugins.set(manifest.id, plugin);
  return { ok: true, plugin };
}

/**
 * Unregister a plugin by ID — terminates sandbox and removes from registry.
 *
 * @param {PluginRegistry} registry
 * @param {string} pluginId
 * @returns {boolean} — true if plugin was found and removed
 */
export function unregisterPlugin(registry, pluginId) {
  const entry = registry.plugins.get(pluginId);
  if (!entry) return false;
  if (entry.sandbox) terminateSandbox(entry.sandbox);
  registry.plugins.delete(pluginId);
  return true;
}

/**
 * Check whether a registered plugin has permission for a method.
 *
 * @param {PluginRegistry} registry
 * @param {string} pluginId
 * @param {string} method
 * @returns {boolean}
 */
export function pluginCanCall(registry, pluginId, method) {
  const entry = registry.plugins.get(pluginId);
  if (!entry?.sandbox) return false;
  return hasPermission(entry.sandbox, method);
}

/**
 * List all registered plugin IDs.
 *
 * @param {PluginRegistry} registry
 * @returns {string[]}
 */
export function listPlugins(registry) {
  return [...registry.plugins.keys()];
}

/**
 * Get summary info for all loaded plugins.
 *
 * @param {PluginRegistry} registry
 * @returns {{ id: string, name: string, version: string, loadState: string }[]}
 */
export function pluginSummaries(registry) {
  const result = [];
  for (const [, p] of registry.plugins) {
    result.push({
      id: p.manifest.id,
      name: p.manifest.name,
      version: p.manifest.version,
      loadState: p.loadState,
    });
  }
  return result;
}
