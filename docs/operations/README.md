# Operations Runbooks

> Procedures for deploying, recovering, and operating Wedding Manager. These
> are companion docs to the [Architecture overview](../../ARCHITECTURE.md) and
> the [User guides](../users/).

## Runbooks

| Runbook | Purpose |
| --- | --- |
| [deploy-runbook.md](deploy-runbook.md) | GitHub Pages deployment, preview URLs, custom domain |
| [disaster-recovery.md](disaster-recovery.md) | Supabase PITR, GH Pages recovery, SW poison, secrets rotation, drill log |
| [incident-response.md](incident-response.md) | Triage, severity matrix, comms, retro template |
| [migrations.md](migrations.md) | Supabase migration authoring, RLS test, staging promotion |
| [rotation.md](rotation.md) | 90-day secrets rotation procedure for all credentials |

## Quick reference

| Task | Runbook |
| --- | --- |
| Restore data after accidental delete | [disaster-recovery.md](disaster-recovery.md) |
| Rotate `VITE_SUPABASE_*` secrets | [rotation.md](rotation.md) |
| Promote a Supabase migration | [migrations.md](migrations.md) |
| Cut a release | [../../.github/agents/release-engineer.agent.md](../../.github/agents/release-engineer.agent.md) |
| Diagnose a failed Lighthouse CI run | [deploy-runbook.md](deploy-runbook.md) |

## See also

- [SECURITY.md](../../SECURITY.md) — vulnerability disclosure & response.
- [ROADMAP §8](../../ROADMAP.md) — SLOs & error budgets.
