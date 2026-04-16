/**
 * src/core/plugins.js — F5.2.1 Plugin Architecture
 *
 * Lightweight plugin system for extending the Wedding Manager.
 * Plugins register via `registerPlugin()` and integrate with the existing
 * section lifecycle (mount/unmount), i18n, and navigation.
 *
 * @example
 *   registerPlugin({
 *     name: "my-plugin",
 *     mount(container) { container.textContent = "Hello"; },
 *     unmount() {},
 *     i18n: { he: { my_title: "שלום" }, en: { my_title: "Hello" } },
 *   });
 */

/** @typedef {{ name: string, mount: (container: HTMLElement) => void, unmount: () => void, routes?: string[], i18n?: Record<string, Record<string, string>> }} PluginDef */

/** @type {Map<string, PluginDef>} */
const _plugins = new Map();

/** @type {Set<string>} */
const _mountedPlugins = new Set();

/**
 * Register a plugin. Plugins are stored by name and can be mounted later.
 * @param {PluginDef} def
 * @throws {Error} if name is missing or already registered
 */
export function registerPlugin(def) {
  if (!def || !def.name) throw new Error("Plugin must have a name");
  if (_plugins.has(def.name))
    throw new Error(`Plugin "${def.name}" already registered`);
  if (typeof def.mount !== "function")
    throw new Error(`Plugin "${def.name}" must have a mount(container) function`);
  if (typeof def.unmount !== "function")
    throw new Error(`Plugin "${def.name}" must have an unmount() function`);

  _plugins.set(def.name, def);

  // Merge i18n keys if provided
  if (def.i18n) {
    _mergeI18n(def.i18n);
  }
}

/**
 * Unregister a plugin by name. Calls unmount if currently mounted.
 * @param {string} name
 */
export function unregisterPlugin(name) {
  if (_mountedPlugins.has(name)) {
    const def = _plugins.get(name);
    if (def) def.unmount();
    _mountedPlugins.delete(name);
  }
  _plugins.delete(name);
}

/**
 * Mount a plugin into a container element.
 * @param {string} name
 * @param {HTMLElement} container
 */
export function mountPlugin(name, container) {
  const def = _plugins.get(name);
  if (!def) throw new Error(`Plugin "${name}" not registered`);
  if (_mountedPlugins.has(name)) return; // already mounted
  def.mount(container);
  _mountedPlugins.add(name);
}

/**
 * Unmount a plugin.
 * @param {string} name
 */
export function unmountPlugin(name) {
  if (!_mountedPlugins.has(name)) return;
  const def = _plugins.get(name);
  if (def) def.unmount();
  _mountedPlugins.delete(name);
}

/**
 * Get all registered plugin names.
 * @returns {string[]}
 */
export function listPlugins() {
  return [..._plugins.keys()];
}

/**
 * Get a plugin definition by name.
 * @param {string} name
 * @returns {PluginDef | undefined}
 */
export function getPlugin(name) {
  return _plugins.get(name);
}

/**
 * Check if a plugin is currently mounted.
 * @param {string} name
 * @returns {boolean}
 */
export function isPluginMounted(name) {
  return _mountedPlugins.has(name);
}

/**
 * Get routes contributed by all plugins.
 * @returns {string[]}
 */
export function getPluginRoutes() {
  const routes = [];
  for (const def of _plugins.values()) {
    if (def.routes) routes.push(...def.routes);
  }
  return routes;
}

/**
 * Unmount all plugins and clear the registry. Useful for testing.
 */
export function resetPlugins() {
  for (const name of _mountedPlugins) {
    const def = _plugins.get(name);
    if (def) def.unmount();
  }
  _mountedPlugins.clear();
  _plugins.clear();
}

// ── Internal ──────────────────────────────────────────────────────────────

/**
 * Merge plugin i18n keys into the global locale data.
 * Uses dynamic import to access i18n internals.
 * @param {Record<string, Record<string, string>>} i18nMap
 */
function _mergeI18n(i18nMap) {
  // Lazy merge — will be picked up by t() on next call
  // Store on a global registry that i18n.js can read
  if (!globalThis.__pluginI18n) globalThis.__pluginI18n = {};
  for (const [lang, keys] of Object.entries(i18nMap)) {
    if (!globalThis.__pluginI18n[lang]) globalThis.__pluginI18n[lang] = {};
    Object.assign(globalThis.__pluginI18n[lang], keys);
  }
}
