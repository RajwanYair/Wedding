# Plugin Authoring Guide

> How to extend the Wedding Manager with custom plugins.

## Quick Start

```js
// my-plugin.js
import { registerPlugin } from "../core/plugins.js";

registerPlugin({
  name: "my-plugin",
  mount(container) {
    container.innerHTML = ""; // clear previous content
    const h2 = document.createElement("h2");
    h2.textContent = "My Plugin";
    container.appendChild(h2);
  },
  unmount() {
    // cleanup: remove listeners, intervals, subscriptions
  },
  routes: ["my-plugin"], // optional hash routes
  i18n: {
    // optional i18n keys
    he: { my_title: "הפלאגין שלי" },
    en: { my_title: "My Plugin" },
  },
});
```

## Plugin API

### `registerPlugin(def)`

Register a plugin with the system. Called once at import time.

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | ✅ | Unique plugin identifier |
| `mount` | `(container: HTMLElement) => void` | ✅ | Called when the plugin section becomes active |
| `unmount` | `() => void` | ✅ | Called when navigating away — clean up listeners |
| `routes` | `string[]` | ❌ | Hash routes this plugin handles |
| `i18n` | `Record<lang, Record<key, string>>` | ❌ | Translation keys merged into global i18n |

### Other Functions

```js
import {
  registerPlugin,
  unregisterPlugin,
  mountPlugin,
  unmountPlugin,
  listPlugins,
  getPlugin,
  isPluginMounted,
  getPluginRoutes,
  resetPlugins,
} from "../core/plugins.js";
```

## Lifecycle

1. **Register** — Plugin imports `registerPlugin()` and self-registers
2. **Mount** — System calls `mount(container)` when navigating to the plugin's route
3. **Unmount** — System calls `unmount()` when navigating away
4. **Unregister** — Optional: call `unregisterPlugin(name)` to fully remove

## i18n Integration

Plugin i18n keys are merged into the global dictionary. Use `t('key')` as usual:

```js
import { t } from "../core/i18n.js";

mount(container) {
  const title = document.createElement("h2");
  title.setAttribute("data-i18n", "my_title");
  title.textContent = t("my_title");
  container.appendChild(title);
}
```

Supported languages: `he`, `en`, `ar`, `ru`

## Best Practices

1. **Always clean up** in `unmount()` — remove event listeners, clear intervals
2. **Use `storeSubscribe`** for reactive data — unsubscribe in `unmount()`
3. **Use `data-i18n`** attributes for all visible text
4. **Never use `innerHTML`** with unsanitized data — use `textContent` or DOM APIs
5. **Use CSS custom properties** for colors — never hardcode
6. **Keep plugins self-contained** — avoid importing from other sections

## Example: Wrapping an Existing Section

```js
import { registerPlugin } from "../core/plugins.js";
import { mount, unmount } from "../sections/gallery.js";

registerPlugin({
  name: "gallery",
  mount,
  unmount,
  routes: ["gallery"],
});
```

See `src/plugins/` for working examples.
