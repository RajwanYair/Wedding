/**
 * src/plugins/contact-plugin.js — F5.2.2 Contact Collector as plugin demo
 *
 * Non-core section wrapped in plugin API for lazy-loading.
 */

import { registerPlugin } from "../core/plugins.js";
import { mount, unmount } from "../sections/contact-collector.js";

registerPlugin({
  name: "contact-collector",
  mount,
  unmount,
  routes: ["contact-form"],
  i18n: {
    he: { plugin_contact: "איסוף פרטים" },
    en: { plugin_contact: "Contact Collector" },
  },
});
