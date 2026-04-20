# ADR-005: Campaign State Machine Design

**Status:** Accepted
**Date:** 2025-06-15
**Context:** Wedding Manager v6.5.0 — Sprint 42–43

## Problem

Bulk messaging campaigns (WhatsApp, email) require lifecycle management:
creating a campaign, queuing it, running it, tracking per-guest send outcomes,
and recording the final result.  Without a formal state machine the code would
have ad-hoc status checks scattered across services.

## Decision

Implement `src/services/campaign.js` as a **finite state machine** with explicit transitions.

### State Machine

```text
draft ──queueCampaign──► queued ──startCampaign──► sending
  │                                                   │
  │           cancelCampaign (from draft or queued)   ├── recordSent (all done, any failed) ──► failed
  └──────────────────────────────► cancelled          ├── recordSent (all done, all sent)  ──► completed
                                                       └── cancelCampaign ──────────────────► cancelled
```

### Data model

```js
{
  id: string,          // cmp_{timestamp}_{rand5}
  name: string,
  type: 'whatsapp' | 'email' | 'sms',
  templateName: string,
  guestIds: string[],
  results: Record<guestId, 'pending' | 'sent' | 'failed'>,
  status: CampaignStatus,
  createdAt: number,
  startedAt?: number,
  completedAt?: number,
}
```

### Auto-complete logic

`recordSent` checks whether all `guestIds` now have a non-`"pending"` result.
If yes, transitions to `"completed"` (all sent) or `"failed"` (at least one failed).

## Consequences

**Positive:**

- Invalid transitions throw immediately (fail fast)
- `getCampaignStats` always consistent with `results` map
- Integration with `wa-campaign.js` and `email-service.js` is clean (protocol-agnostic)

**Negative:**

- Campaigns stored in `localStorage` — not suitable for campaigns with thousands of guests
- No retry-at-campaign-level (only per-guest retry in wa-campaign)

## Alternatives Considered

- **XState** — full HSM; rejected (runtime dep, overkill)
- **Plain status string** — no enforcement; rejected (ad-hoc checks everywhere)
- **Supabase-backed campaigns** — planned for v7.x when multi-device sync is needed
