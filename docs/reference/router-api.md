# Reference: router API (`src/core/router.js`)

> Status: ADR-025 R1 (parallel hash + pushState).
> All exports are pure ESM. No `window.*` side effects.

## Module map

```text
src/core/router.js   ← pushState API  (this reference)
src/core/nav.js      ← legacy hash router; re-exports navigate/etc.
```

`nav.js` re-exports `navigate`, `currentRoute`, `onRouteChange`, and
`initRouterListener` so callers can import either module during the
migration window.

## Exports

### `navigate(name, params?, opts?) → void`

Push a new history entry (or replace the current one) and notify all
`onRouteChange` subscribers.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | `string` | yes | Must be a member of `SECTION_LIST`. Throws `RangeError` otherwise. |
| `params` | `Record<string, string \| number \| undefined>` | no | Empty / undefined / null values are dropped. |
| `opts.replace` | `boolean` | no | When `true`, calls `history.replaceState` instead of `pushState`. |

**Throws** — `TypeError` for empty `name`, `RangeError` for unknown section.

**URL format**:

```text
#<section>?<key>=<value>&<key>=<value>
```

Example:

```js
import { navigate } from "../core/router.js";
navigate("guests", { id: "abc-123", filter: "pending" });
// → #guests?id=abc-123&filter=pending
```

### `currentRoute() → { section, params }`

Returns the parsed current URL hash. Falls back to
`{ section: "dashboard", params: {} }` for empty or unknown sections.

```js
import { currentRoute } from "../core/router.js";
const { section, params } = currentRoute();
```

### `onRouteChange(handler) → cleanup`

Subscribe to route changes. Fires on **both** programmatic
`navigate()` calls and browser-driven `popstate` events (after
`initRouterListener()` runs).

```js
import { onRouteChange } from "../core/router.js";
const off = onRouteChange(({ section, params }) => {
  console.log("now at", section, params);
});
// later: off();
```

| Arg | Type | Required |
| --- | --- | --- |
| `handler` | `(r: Route) => void` | yes |

Returns a function that removes the subscription. Subscriber errors are
logged via `console.error` and never propagate.

### `initRouterListener() → void`

Wire the popstate listener once. Idempotent. Called automatically by
`initRouter()` in [src/core/nav.js](../../src/core/nav.js); only call
manually in tests or alternate entry points.

### `_resetRouterForTests() → void`

Clear all subscribers and re-arm `initRouterListener()`. Test-only.

## Type aliases

```ts
type Route = {
  section: string;             // member of SECTION_LIST
  params: Record<string, string>;
};
```

## Examples

### Deep-link RSVP

```js
// in a section's mount()
import { onRouteChange, currentRoute } from "../core/router.js";

const { params } = currentRoute();
if (params.token) prefillFromToken(params.token);

const off = onRouteChange(({ params }) => {
  if (params.id) loadGuest(params.id);
});
return () => off();   // unmount cleanup
```

### Programmatic navigation with replace

```js
import { navigate } from "../core/router.js";
// after submitting RSVP, replace the history entry so back button skips the form
navigate("dashboard", {}, { replace: true });
```

## Migration checklist (ADR-025 R1 → R3)

- [x] R0 — ADR accepted
- [x] R1 — `navigate()` lands alongside hash router (this release)
- [ ] R2 — Migrate `src/main.js` and `src/services/supabase-auth.js` call sites (3 violations per `audit:router`)
- [ ] R3 — Hash fallback removed; pushState becomes sole router

## Related

- [ADR-025: pushState router migration](../adr/025-pushstate-router.md)
- [How-to: Deep-link RSVP](../how-to/deep-link-rsvp.md)
- [Reference: audit scripts](audit-scripts.md)
