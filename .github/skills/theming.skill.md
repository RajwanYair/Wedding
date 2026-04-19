---
description: "CSS theming, custom properties, and visual design conventions."
---

# Skill: Theming

## Layer Order

All CSS is organized in `@layer` blocks (in `css/variables.css`):

```text
variables → base → layout → components → auth → responsive → print
```

Never add styles outside a named layer.

## Color Tokens

All colors are CSS custom properties defined in `css/variables.css`:

```css
:root {
  --color-primary: #b8860b;
  --color-surface: rgba(255, 255, 255, 0.1);
  --color-text: #1a1a2e;
  /* ... */
}
```

- **Never hardcode hex/rgb values** outside `css/variables.css`.
- Use `var(--color-*)` everywhere else.

## Themes

Five themes applied via `body.theme-{name}`:

| Class                 | Name           |
| --------------------- | -------------- |
| (none)                | Default purple |
| `body.theme-rosegold` | Rose gold      |
| `body.theme-gold`     | Gold           |
| `body.theme-emerald`  | Emerald        |
| `body.theme-royal`    | Royal blue     |

Each theme overrides `--color-primary`, `--color-secondary`, `--color-accent` in `css/variables.css`.

## Glassmorphism

Standard glass card:

```css
.card {
  background: var(--color-surface);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-lg);
}
```

- Modal overlays use `blur(20px)`.
- Never exceed `blur(24px)` — performance degrades.

## Typography

Font stack: `tahoma, "Segoe UI", Arial, sans-serif` (RTL-optimized).

- `tahoma` — lowercase, no quotes.
- Multi-word fonts in double quotes: `"Segoe UI"`.
- Base font size: `16px`; scale via `--font-size-*` tokens.

## Animation

- Always wrap animations in `@media (prefers-reduced-motion: no-preference)`.
- Transition duration tokens: `--duration-fast` (150ms), `--duration-normal` (300ms).

## Responsive

- RTL-first: `dir="rtl"` on `<html>`.
- Breakpoints: `768px` (tablet), `480px` (mobile).
- Use logical properties: `padding-inline`, `margin-block`, `inset-inline-*`.

## Checklist

- [ ] No hardcoded colors — all use `var(--color-*)`.
- [ ] New components sit inside a `@layer` block.
- [ ] Animations wrapped in `prefers-reduced-motion` query.
- [ ] Font names match casing convention (`tahoma`, `"Segoe UI"`).
- [ ] `npm run lint:css` passes (0 errors, 0 warnings).
