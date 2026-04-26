# Planner Guide — Wedding Manager

> Audience: wedding planners and agencies running multiple events through Wedding
> Manager.
> Companion docs: [Couple's Guide](couple-guide.md) · [Vendor Guide](vendor-guide.md)

This guide is a stub for v11.7.0 and is intentionally short. The full planner
workflow lands in v15.0.0 (ROADMAP Phase D — org / team mode).

## Multi-event today

Wedding Manager already supports multiple events per account through the
`event_id` scope. Switch active events from the header dropdown.

| Capability | Status |
| --- | --- |
| Switch between events | ✅ Header dropdown |
| Per-event guests / tables / vendors | ✅ Scoped by `event_id` |
| Per-event RSVP page | ✅ Public link per event |
| Cross-event vendor reuse | ⏳ v15.0.0 (ROADMAP §6 Phase D) |
| Org / team workspaces | ⏳ v15.0.0 |
| Role-based access | ⏳ v15.0.0 |

## Recommended workflow

1. Create one event per couple under your single planner account.
2. Use a consistent naming convention: `<couple>-<date>` (e.g. `tal-noa-2026-09`).
3. Export each completed event's archive (Settings → Export) at hand-off.
4. Track planner-level analytics via the Dashboard's per-event stats.

## See also

- [Couple's Guide](couple-guide.md)
- [Vendor Guide](vendor-guide.md)
- [Operations runbooks](../operations/)
- [ROADMAP — Phase D](../../ROADMAP.md)
