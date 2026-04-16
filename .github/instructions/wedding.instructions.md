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
// DOM — always from `el` object, never getElementById inline
el.statTotal.textContent = n;

// i18n
t('key')                          // JS string lookup
data-i18n="key"                   // HTML attribute binding
data-i18n-placeholder="key"       // input placeholder
data-i18n-tooltip="key"           // tooltip text

// Storage
saveAll()                         // persists _guests, _tables, _weddingInfo, _vendors
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

## Data Models

### Guest (v1.1.0)

```text
{
  id, firstName, lastName, phone, email,
  count, children,
  status: 'pending'|'confirmed'|'declined'|'maybe',
  side:   'groom'|'bride'|'mutual',
  group:  'family'|'friends'|'work'|'other',
  relationship,
  meal: 'regular'|'vegetarian'|'vegan'|'gluten_free'|'kosher',  // label 'מהדרין/Mehadrin'
  mealNotes, accessibility: boolean,
  tableId, gift, notes, sent: boolean,
  rsvpDate, createdAt, updatedAt
}
```

### Vendor

```text
{
  id, category, name, contact, phone,
  price: number, paid: number,
  notes, updatedAt, createdAt
}
```

### Table

```text
{ id, name, capacity, shape: 'round'|'rect' }
```
