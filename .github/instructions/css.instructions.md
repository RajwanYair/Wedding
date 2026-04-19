---
applyTo: "css/**/*.css"
---

# CSS Conventions — Wedding Manager

## Layer Order

CSS is organized with `@layer` in this strict order:

```text
variables → base → layout → components → auth → responsive → print
```

New rules must go into the appropriate layer. Never add rules outside a layer.

## Custom Properties

- **All colors** via CSS custom properties defined in `css/variables.css`. Never hardcode hex, rgb, or hsl values.
- **All spacing** via `--space-*` scale. Never hardcode `px` values for margins/padding unless it's a single pixel border.
- Theme variants use `body.theme-{rosegold,gold,emerald,royal}` selectors scoped inside the `variables` layer.

## Nesting

- Use native CSS nesting with `&`. Do NOT use preprocessor syntax.
- Maximum 3 levels of nesting. Flatten deeper structures.
- Example:

  ```css
  .card {
    padding: var(--space-4);
    & .card__title { font-weight: 700; }
    &:hover { box-shadow: var(--shadow-md); }
  }
  ```

## RTL First

- The app is RTL-first (`dir="rtl"`, `lang="he"`).
- Use `inset-inline-start` / `inset-inline-end` instead of `left` / `right`.
- Use `margin-inline-start` / `margin-inline-end` instead of `margin-left` / `margin-right`.
- LTR overrides go inside `[dir="ltr"]` selectors.

## Glassmorphism

- Standard glass card: `backdrop-filter: blur(16px)` + semi-transparent background via `--glass-bg`.
- Do not invent new blur values — use only `8px`, `16px`, or `24px`.

## Typography

- Font stack: `tahoma, "Segoe UI", arial, sans-serif` (lowercase for single-word fonts per Stylelint).
- RTL text: `font-family` must include `tahoma` first for Hebrew rendering.
- Never use `font-size` in `px` inside components — use `rem` or `em`.

## Responsive Breakpoints

- Mobile-first media queries: `min-width: 480px` (small), `min-width: 768px` (tablet).
- All responsive overrides go in `css/responsive.css` inside the `responsive` layer.

## Animation

- Use `prefers-reduced-motion` media query to disable animations:

  ```css
  @media (prefers-reduced-motion: reduce) {
    .animated-element { animation: none; transition: none; }
  }
  ```
