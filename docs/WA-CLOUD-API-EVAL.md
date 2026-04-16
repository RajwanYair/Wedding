# WhatsApp Business Cloud API — Evaluation (F4.2.2)

## Summary

**Recommendation:** Keep `wa.me` deep links as default. Add optional Cloud API support as a separate service module for users who configure a Meta Business account.

## Comparison

| Feature | wa.me Deep Links | Green API | WA Business Cloud API |
| --- | --- | --- | --- |
| Cost | Free | $5–10/mo | Free tier: 1,000 service conv/mo |
| Setup | None | API key + WA Business | Meta Business Account + phone |
| Automation | Manual (user clicks each) | Full automation | Full automation |
| Rate limits | Browser-enforced | 300 msg/day (varies) | 250 msg/sec (shared) |
| Phone required | User's personal WA | Dedicated WA Business | Dedicated phone number |
| SDK | N/A | REST API | REST API (graph.facebook.com) |
| Template messages | N/A | N/A | Required for business-initiated |
| Auth | None | Token | System User Token + Business ID |

## Implementation Plan (if adopted)

1. **Config keys**: `WA_CLOUD_PHONE_ID`, `WA_CLOUD_TOKEN`, `WA_CLOUD_BUSINESS_ID` in `src/core/config.js`
2. **Service module**: `src/services/wa-cloud.js` with `sendTemplateMessage()` and `sendTextMessage()`
3. **Template registration**: Pre-registered templates for invitation, reminder, thank-you in Meta dashboard
4. **Fallback chain**: Cloud API → Green API → wa.me deep links
5. **Rate limiting**: Batch sends with 350ms pacing (same as Green API)

## API Example

```js
// POST https://graph.facebook.com/v21.0/{phone_id}/messages
{
  "messaging_product": "whatsapp",
  "to": "972541234567",
  "type": "template",
  "template": {
    "name": "wedding_invitation",
    "language": { "code": "he" },
    "components": [{
      "type": "body",
      "parameters": [
        { "type": "text", "text": "אליאור" },
        { "type": "text", "text": "טובה" }
      ]
    }]
  }
}
```

## Decision

**Deferred to v5.4.** The free tier is attractive but requires:
- Meta Business verification (can take weeks)
- Pre-approved message templates (24h response window)
- A dedicated phone number (not personal)

Current `wa.me` + optional Green API is sufficient for MVP.
