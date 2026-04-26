# ADR-013: Opt-in Production Monitoring + Supply-chain Workflows

**Status:** Accepted
**Date:** 2026-04-28
**Deciders:** Release Engineering · Security
**Supersedes / amends:** ADR-001 (zero-runtime-deps — relaxed: monitoring is an
opt-in *peer* dependency, never bundled by default)

## Context

Through v11.4.0 production runtime errors were invisible. The roadmap §4 register
listed this as a P0 item:

> **Zero production error tracking — failures invisible** — High likelihood,
> High impact (silent data loss).

In parallel, the project lacked verifiable supply-chain artefacts (SBOM,
Scorecard, vulnerability scan) — making downstream auditing impossible.

Two orthogonal but related concerns:

1. **Surface production errors** without bloating the default bundle or
   shipping PII to a third party.
2. **Document and audit our supply chain** so a contributor or downstream
   adopter can verify the project hygiene.

## Decision

### Runtime monitoring

- Wire `src/services/monitoring.js` (already shipped) from `src/main.js`.
- `initMonitoring()` is **no-op** unless `VITE_SENTRY_DSN` is provided at
  build time. The default public deploy ships with **no DSN**, preserving
  the zero-third-party-call default.
- When a DSN is set, `@sentry/browser` is **dynamically `import()`-ed**;
  it never enters the default chunk. Default users pay 0 KB.
- Global handlers (`window.error`, `window.unhandledrejection`) always run
  and forward to the local `error-pipeline.js` ring buffer regardless of
  remote transport — local debug history is the floor, remote is a bonus.
- All payloads pass through `scrubPii()` before send (`beforeSend` hook).
- Sample rate defaults to 5 % to stay within free-tier quotas.

### Supply-chain artefacts

Three new GitHub Actions workflows under `.github/workflows/`:

| Workflow | Trigger | Output |
| --- | --- | --- |
| `scorecard.yml` | weekly + push to main | OpenSSF Scorecard SARIF → code scanning |
| `sbom.yml` | weekly + on `v*` tag | CycloneDX JSON + XML SBOM artefact |
| `trivy.yml` | weekly + PR | Trivy fs + config SARIF → code scanning |

All three publish via `github/codeql-action/upload-sarif@v3` so findings
appear in the GitHub **Security** tab without a third-party dashboard.

## Consequences

**Positive:**

- Production errors surface within minutes when the project owner provides
  a DSN — without changing the public bundle for everyone else.
- Scorecard + SBOM + Trivy are visible in the GitHub Security tab and as
  downloadable artefacts; contributors and adopters can audit hygiene.
- No new mandatory runtime dependency: `@sentry/browser` is opt-in via
  build flag and dynamic import.
- The local `error-pipeline.js` ring buffer remains the floor of
  observability so dev mode, tests, and offline deploys still capture data.

**Negative / Trade-offs:**

- A misconfigured `VITE_SENTRY_DSN` (e.g. wrong project) silently sends
  events to the wrong Sentry inbox. Mitigation: rotate keys via the
  release-engineer agent's Pre-Release Checklist and verify in staging.
- Adding three weekly workflows costs minutes of GitHub Actions budget;
  acceptable on free tier for current activity.

## Alternatives considered

- **Build a homegrown error endpoint.** Rejected: re-implements Sentry
  poorly, no PII scrubber, no rate-limit, no de-dup.
- **Hard-bundle Sentry by default.** Rejected: violates zero-runtime-deps
  principle and forces every adopter onto a third-party SaaS.
- **Skip SBOM until v13.** Rejected: SBOM is cheap (one workflow file) and
  unblocks downstream procurement / OSS-card scoring today.

## References

- Roadmap §4 P0 — "Zero production error tracking"
- Roadmap §6 Phase A2 — "Sentry-compatible (or Glitchtip) wired"
- ADR-001 — Zero runtime deps (still authoritative for default bundle)
- `src/services/monitoring.js`, `src/services/error-pipeline.js`
- `.github/workflows/scorecard.yml`, `sbom.yml`, `trivy.yml`
