---
mode: agent
description: "Wire an existing built feature into user-visible UI — the 'Built ≠ Done' enforcer."
---

# Wire Feature to UI

Wire the existing feature `${featureName}` into its target section UI:

## Process

1. **Locate the feature code** — find the util/service that implements it
2. **Identify the target section** — which section should surface this feature
3. **Add UI elements** — buttons, panels, or widgets in the section template
4. **Add i18n keys** — both `he` and `en` for all new visible strings
5. **Wire event handlers** — `data-action` + handler registration
6. **Add to section mount()** — ensure the feature initializes
7. **Test the flow** — verify end-to-end in dev server

## Rules

- Follow the section lifecycle pattern (mount/unmount)
- Use `data-action` delegation — no inline event listeners
- All strings via `t('key')` — both locales required
- CSS via custom properties only
- No new runtime dependencies

## Quality gate

```bash
npm run lint && npm test && npm run build && npm run check:i18n
```
