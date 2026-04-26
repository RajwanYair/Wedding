# Why zero runtime dependencies?

> Diátaxis: explanation. The contractual decision is
> [ADR-001](../adr/001-zero-runtime-deps.md). This page is the prose answer
> to *why*, not *what* or *how*.

## The short version

Wedding Manager ships ~45 KB gzip and runs entirely in the user's browser
on GitHub Pages. Every byte we add is a byte the bride's phone has to pull
over a venue Wi-Fi network the day of the wedding. Most of our users open
the app once, on a hotel network, on a phone with a 1-year-old battery.
That context dictates an unusual constraint: **the dependency that doesn't
exist is the dependency that can't break**.

## What "zero runtime deps" actually means

We hold to a **near-zero** policy, not a literal zero:

- Three runtime dependencies: `@supabase/supabase-js`, `dompurify`,
  `valibot`. Each earned its place via its own ADR-style review.
- Everything else — date formatting, i18n, routing, storage, rendering,
  state, validation primitives — is hand-written in the repo.

## Why we chose this over the React/Next default

### 1. Supply-chain surface

A typical React + Next + Tailwind starter installs 1,500+ transitive
packages. Each is a potential `event-stream`-style compromise vector. Our
production runtime is auditable in an afternoon.

### 2. Forever-cacheable bundle

With no framework runtime, our service worker can precache the whole app
on first visit. The wedding day is never the day the network gets tested.

### 3. Skill durability

Vanilla DOM, ES2025 modules, and CSS `@layer` are platform features. They
will still work in 2030 without a migration. A 2024 framework choice
forces a 2027 migration.

### 4. Mobile reality

The bride is checking guests in on her phone, in a venue, on 3G. A 200 KB
framework runtime competes with the photo gallery for bandwidth. We chose
the gallery.

### 5. The app is small

Wedding Manager has ~18 screens and ~12 forms. Frameworks pay off when
view-state complexity dominates DOM updates. Ours doesn't. A `data-action`
event delegator and a small store are enough.

## What we give up

- **Ecosystem velocity.** No `npm install` of a fancy date picker — we
  write one. This is a real cost on greenfield features and a real win on
  bug-fix velocity (no upstream to wait on).
- **Hiring-pool optics.** "We're hiring vanilla JS" reads as anachronistic
  to some candidates. We accept this; the engineers who self-select tend
  to be the ones we want.
- **Some convenience APIs.** No `useEffect`, no JSX. We use `mount/unmount`
  per-section and `data-action` delegation. It is more verbose. It is also
  obviously correct.

## When we'd reconsider

- The app grows past ~50 sections with deep cross-cutting state.
- A direct-runtime browser API standard (e.g. signals) would replace half
  our store layer.
- A new dep proves itself essential and tree-shakes to <2 KB gzip.

Until then, the answer to "should we add Lodash for one helper?" is: write
the helper.

## See also

- [ADR-001](../adr/001-zero-runtime-deps.md) — the formal decision.
- [docs/operations/deploy-runbook.md](../operations/deploy-runbook.md) —
  what the lean bundle enables in practice.
