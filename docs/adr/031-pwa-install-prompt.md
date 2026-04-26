# ADR-031: PWA install prompt UX

> Status: **Accepted** · Phase: A7 · Targets: v11.13 → v12.0
> Owner: UX/Platform

## Context

The app already ships a service worker (`public/sw.js`), a manifest
(`public/manifest.json`), and SW update detection in
[src/core/ui.js](../../src/core/ui.js). It does **not** prompt the user
to install. Browsers fire `beforeinstallprompt` (Chromium) or expose
"Add to Home Screen" (Safari) without app guidance.

Friction observed:

- Couples open the link on iOS Safari, do not see "Add to Home Screen".
- Returning admins on Chrome desktop never get an install banner because
  no `beforeinstallprompt` event handler exists.
- Hebrew RTL: the OS install sheet is LTR — no app-side framing.

## Decision

Implement an **opt-in, dismissible install nudge** with the following rules:

1. Capture `beforeinstallprompt`; defer the browser-default prompt.
2. After the user has spent ≥ 60 seconds in-app **and** visited ≥ 2 sections,
   show a small bottom-sheet inviting "Install Wedding Manager".
3. On Safari iOS (no `beforeinstallprompt`), show an **alternative
   instructions card** with a screenshot of the Share → Add-to-Home button.
4. Dismissal sets `wedding_v1_install_prompt_dismissed=<ts>` and is
   honoured for 30 days.
5. Successful `appinstalled` event clears the dismissal flag and hides
   the nudge forever.

## Phases

| Phase | Gate | Scope |
| --- | --- | --- |
| **I0** _(v11.12, this batch)_ | merged | This ADR. No code change. |
| **I1** _(v11.13)_ | landed | `src/services/install-prompt.js` capture + 60-sec engagement gate + tests. |
| **I2** _(v11.14)_ | landed | Bottom-sheet UI in `src/modals/install-prompt.html` + RTL screenshots for Safari path. |
| **I3** _(v11.15)_ | landed | Telemetry hook via `error-monitor.js` envelope (success/dismiss rate). |
| **I4** _(v12.0)_ | enforced | E2E Playwright spec covers prompt + dismissal. |

## Acceptance criteria

- I1: Capture handler does not call `prompt()` until engagement threshold is met.
- I2: Bottom sheet respects `dir="rtl"` and OS-level reduced motion.
- I3: Anonymized success/dismiss counts visible in observability.
- I4: 0 a11y violations (axe-core) on the prompt modal.

## Privacy

- No user identifier sent with telemetry events.
- Dismissal flag stored locally only.

## Non-goals

- Custom install for in-app browsers (Facebook, Instagram) — these
  intentionally suppress install. Show no prompt.

## Related

- [ADR-029: WCAG 2.2 AA roadmap](029-wcag-2-2-aa.md)
- [ADR-028: Error monitoring activation](028-error-monitoring.md)
