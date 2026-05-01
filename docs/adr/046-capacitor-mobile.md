# ADR-046 — Capacitor 6 for iOS + Android shells

- Status: Accepted
- Date: 2026-05-18
- Sprint: S574

## Context

PWA install on iOS is brittle (no Push, no Background Sync, prompt
hidden). Vendors have asked for a native iOS app that wraps the same
ESM bundle. We want one source of truth and platform-specific bridges
only where the web cannot deliver (NFC, haptics, native share).

## Decision

Adopt **Capacitor 6** as the native shell for iOS + Android.

- Web is the source of truth — `dist/` is loaded by the WebView.
- Native bridges live under `src/native/` with safe web fallbacks
  guarded by `isNative()`.
- Capacitor is a **devDependency** — runtime stays minimal-deps for
  the web build.
- `capacitor.config.json` is the single config file (no `.ts` form
  needed; we already pilot TS only in `worker/`).
- iOS/Android native projects are generated lazily by
  `npx cap add ios` / `npx cap add android` and are **not** committed
  until S575 (signing + CI matrix).

## Consequences

- (+) Native NFC + Haptics + Share unlock S576/S577.
- (+) App Store + Play Store distribution (S578–S580) without a SaaS
  wrapper.
- (-) Two new build matrices in CI; iOS requires macOS runners.
- (-) Privacy manifests must stay in sync with our IDB encryption ADRs.
