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
<div class="modal-overlay" id="{name}Modal" onclick="closeModal('{name}Modal')">
  <div class="modal-content" onclick="event.stopPropagation()">
    <span class="modal-close" onclick="closeModal('{name}Modal')">×</span>
  </div>
</div>
```

## JS Patterns

```js
// DOM — always from `el` object, never getElementById inline
el.statTotal.textContent = n;

// i18n
t('key')                          // JS string lookup
data-i18n="key"                   // HTML attribute binding
data-i18n-placeholder="key"       // input placeholder
data-i18n-tooltip="key"           // tooltip text

// Storage
saveAll()                         // persists _guests, _tables, _weddingInfo
const g = _guests.find(x => x.id === id);

// Phone
cleanPhone('054-123-4567')        // → '972541234567' (wa.me ready)

// ES2020+ patterns preferred
const x = obj?.prop ?? defaultVal;
```

## i18n Rules

- Every visible string: `data-i18n="key"` on HTML element
- JS strings: `t('key')` — never hardcoded Hebrew or English
- Both `he` and `en` entries required in the `I18N` object
- Language and theme both persisted in `localStorage`

## Guest Data Model (v1.1.0)

```text
{
  id, firstName, lastName, phone, email,
  count, children,
  status: 'pending'|'confirmed'|'declined'|'maybe',
  side:   'groom'|'bride'|'mutual',
  group:  'family'|'friends'|'work'|'other',
  relationship,
  meal: 'regular'|'vegetarian'|'vegan'|'gluten_free'|'kosher',
  mealNotes, accessibility: boolean,
  tableId, gift, notes, sent: boolean,
  rsvpDate, createdAt, updatedAt
}
```
