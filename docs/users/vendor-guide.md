# Vendor Guide — Wedding Manager

> Audience: a vendor (caterer, venue, photographer, …) being tracked by a couple's
> Wedding Manager instance.
> Companion docs: [Couple's Guide](couple-guide.md) · [Planner Guide](planner-guide.md)

This guide is a stub for v11.7.0. Vendors today do **not** sign in to Wedding Manager
directly — the couple maintains vendor records in their own instance. A vendor
inbox, e-sign contracts, and Stripe payouts arrive in v14.0.0 (ROADMAP §6 Phase C).

## What the couple tracks about you

| Field | Meaning |
| --- | --- |
| Name | Display label in the couple's vendor list |
| Category | catering / venue / photography / dj / florist / dress / suit / video / other |
| Phone & email | Couple uses these directly; not shared in-app |
| Contract amount | Total quoted |
| Paid amount | Sum of recorded payments |
| Outstanding | `contract − paid` (computed) |
| Notes | Free-text, RTL-friendly |
| Timeline events | Optional milestones (e.g. "send-final-menu", "tasting") |

## Working with the couple

1. **Quotes & contracts** — exchange via your normal channels (email, WhatsApp).
   The couple records the contract amount in Wedding Manager.
2. **Payments** — the couple records each payment with date + method (Bit / PayBox /
   PayPal / bank transfer). Receipts attach in v14.0.0.
3. **Day-of contact** — couples typically share one short list with all vendors
   the week of the wedding. Ask for a copy.

## See also

- [Couple's Guide](couple-guide.md)
- [Planner Guide](planner-guide.md)
- [ROADMAP — Phase C](../../ROADMAP.md)
