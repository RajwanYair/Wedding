/**
 * src/plugins/gallery-plugin.js — F5.2.2 Gallery as plugin demo
 *
 * Example of wrapping an existing section module in the plugin API.
 * This shows how non-core sections can be lazy-loaded as plugins.
 *
 * @example
 *   import "./plugins/gallery-plugin.js"; // self-registering
 */

import { registerPlugin } from "../core/plugins.js";
import { mount, unmount } from "../sections/gallery.js";

registerPlugin({
  name: "gallery",
  mount,
  unmount,
  routes: ["gallery"],
  i18n: {
    he: { plugin_gallery: "גלריה" },
    en: { plugin_gallery: "Gallery" },
  },
});
