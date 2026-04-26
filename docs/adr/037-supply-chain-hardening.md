# ADR-037 — Supply-chain hardening: SBOM, Trivy, OpenSSF Scorecard

- Status: Proposed
- Date: 2026-04
- Related: ROADMAP §3.5 (Configuration) and §6 Phase B10

## Context

The project ships three runtime dependencies and ~50 dev dependencies. A
single compromised transitive can poison every user's browser. Today's
posture:

- **CodeQL** scans source for known patterns (good).
- **Dependabot** opens PRs for vulnerable deps (good).
- **No SBOM** ships with releases — auditors cannot enumerate what we
  ship.
- **No container/file-system scan** beyond Dependabot's npm advisories.
- **No OpenSSF Scorecard** — our public security posture is not measured.

ROADMAP §3.5 names CycloneDX SBOM, Trivy, and OpenSSF Scorecard as the
target stack.

## Decision

Add three GitHub Actions workflows running on a weekly cron and on every
push to `main`:

### 1. SBOM (CycloneDX)

```yaml
- uses: CycloneDX/gh-node-module-generatebom@v1
  with:
    output: sbom.cdx.json
- uses: actions/upload-artifact@v4
  with:
    name: sbom
    path: sbom.cdx.json
```

The SBOM is attached to every GitHub Release (per `gh release upload`)
and made available at `/sbom.cdx.json` from the static site.

### 2. Trivy file-system scan

```yaml
- uses: aquasecurity/trivy-action@master
  with:
    scan-type: "fs"
    severity: "HIGH,CRITICAL"
    exit-code: "1"
```

Trivy fails the workflow on any HIGH/CRITICAL CVE in the build artefact
(`dist/`) or in `package-lock.json`.

### 3. OpenSSF Scorecard

```yaml
- uses: ossf/scorecard-action@v2
  with:
    publish_results: true
    results_file: results.sarif
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: results.sarif
```

Score is published to deps.dev / OSSF and surfaced as a README badge.

### Phasing

| Phase | Scope                                              | Gate                   |
| ----- | -------------------------------------------------- | ---------------------- |
| SC0   | This ADR                                           | docs only              |
| SC1   | Add `sbom.yml` workflow; attach to releases        | advisory               |
| SC2   | Add `trivy.yml`; severity HIGH/CRITICAL fail       | enforce on `main` push |
| SC3   | Add `scorecard.yml`; publish results               | advisory               |
| SC4   | README badges for SBOM + Scorecard                 | docs                   |

## Consequences

Positive:

- Auditable supply chain: every release is enumerable via SBOM.
- CVEs caught at PR time, not after deploy.
- Public posture (Scorecard) provides external accountability.

Negative:

- ~3 extra weekly minutes of CI time.
- Trivy may report unfixable transitives; we maintain a `.trivyignore`
  with rationale per ignore.

## Non-goals

- Container scanning (we ship no containers).
- Provenance / SLSA L3 attestation (deferred to v15).
- Secret scanning beyond GitHub's built-in (already on).

## Rollout

- This release ships the ADR.
- SC1–SC3 land one workflow per release.
- README badges added once Scorecard publishes its first score.
