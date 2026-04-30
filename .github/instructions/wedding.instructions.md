---
applyTo: "**/*.html"
description: "Use when: editing the wedding app HTML file. Implementation patterns for CSS, JS, i18n, and data."
---

# Wedding HTML — Implementation Patterns

## CSS Custom Properties

Root variables in `:root` — never hardcode colors:

- Background: `--bg-primary`, `--bg-secondary`, `--bg-card`, `--bg-card-hover`
- Accent: `--accent`, `--accent-light`, `--accent-dark`, `--gold`, `--rose`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- States: `--positive`, `--negative`, `--warning`
- Theme overrides: `body.theme-{rosegold,gold,emerald,royal}` — replaces all vars

## Section Pattern

```html
<section class="section" id="sec-{name}">
  <div class="card">
    <h2 class="section-title" data-i18n="sec_{name}">כותרת</h2>
  </div>
</section>
```

## Modal Pattern

```html
<!-- Prefer data-action event delegation over inline onclick -->
<button data-action="openModal" data-modal="{name}Modal" data-i18n="btn_open">open</button>

<div class="modal-overlay" id="{name}Modal">
  <div class="modal-content">
    <button class="modal-close" data-action="closeModal" data-modal="{name}Modal">&#x2715;</button>
  </div>
</div>
```

## Event Delegation Pattern

```js
// src/core/events.js handles all data-action clicks globally
// Use data-action="actionName" + data-* params — never inline onclick
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  handlers[el.dataset.action]?.(el, e);
});
```

## JS Patterns

```js
// i18n
t('key')                          // JS string lookup
data-i18n="key"                   // HTML attribute binding
data-i18n-placeholder="key"       // input placeholder
data-i18n-tooltip="key"           // tooltip text

// Phone
cleanPhone('054-123-4567')        // → '972541234567' (wa.me ready)

// Input validation (valibot-backed)
import { sanitize } from '../utils/sanitize.js';
const { value, errors } = sanitize(rawInput, { type: 'string', maxLength: 100 });
if (errors.length) return showError(errors);

// ES2020+ patterns preferred
const x = obj?.prop ?? defaultVal;
```

## i18n Rules

- Every visible string: `data-i18n="key"` on HTML element
- JS strings: `t('key')` — never hardcoded Hebrew or English
- All 5 locale files require `he` + `en` entries at minimum: `he.json`, `en.json`, `ar.json`, `ru.json`, (fr/es optional)
- Language and theme both persisted in `localStorage`
- Run `npm run check:i18n` after adding keys — must exit 0

Project-wide data models and release rules are defined in `.github/copilot-instructions.md`.
