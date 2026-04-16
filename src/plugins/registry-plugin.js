/**
 * src/plugins/registry-plugin.js — F5.2.2 Registry as plugin demo
 *
 * Non-core section wrapped in plugin API for lazy-loading.
 */

import { registerPlugin } from "../core/plugins.js";
import { mount, unmount } from "../sections/registry.js";

registerPlugin({
  name: "registry",
  mount,
  unmount,
  routes: ["registry"],
  i18n: {
    he: { plugin_registry: "רשימת מתנות" },
    en: { plugin_registry: "Gift Registry" },
  },
});
