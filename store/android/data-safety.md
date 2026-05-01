# Google Play — Data Safety form (S579)

> Mirrors the iOS PrivacyInfo. Source of truth: this file. Update both
> when handling new data types.

## Data collected

| Data type | Collected | Shared | Optional | Purpose |
| --- | --- | --- | --- | --- |
| Email address | Yes | No | Yes (sign-in only) | Account, app functionality |
| Name | Yes | No | Yes | App functionality |
| Phone number | Yes | No | Yes | App functionality (RSVP) |
| Contacts (guest list) | Yes | No | Yes | App functionality |
| Photos (gallery) | Yes | No | Yes | App functionality |
| App interactions | No | — | — | — |
| Crash logs | No | — | — | — |
| Device or other IDs | No | — | — | — |

## Security practices

- **Data encrypted in transit**: Yes (HTTPS / TLS 1.3).
- **Data encrypted at rest on device**: Yes (AES-GCM via WebCrypto, see
  ADR-039).
- **Users can request deletion**: Yes (Settings → Account → Delete data).
- **Independent security review**: No.
- **Committed to Play Families Policy**: N/A (4+ rated, not directed at
  children under 13).

## Permissions justification (`AndroidManifest.xml`)

| Permission | Why |
| --- | --- |
| `INTERNET` | Sheets sync, Supabase auth |
| `NFC` | Door check-in (S576) |
| `VIBRATE` | Haptic feedback (S577) |
| `POST_NOTIFICATIONS` | RSVP reminders, sync errors |
| `READ_MEDIA_IMAGES` (Android 13+) | Gallery uploads |

No `READ_CONTACTS`, `ACCESS_FINE_LOCATION`, `RECORD_AUDIO`, `CAMERA` (handled by chooser intents).

## Content rating

- IARC questionnaire answers — all "No" to violence/sex/gambling/drugs.
- Result: **Everyone / 3+ / PEGI 3 / USK 0**.

## Target API

- `targetSdkVersion = 35` (Android 15) — required by Play from Aug 2025.
- `minSdkVersion = 24` (Android 7) — covers 96 % of devices.
