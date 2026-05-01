# Mobile signing & distribution (Capacitor)

> Sprint S575 — keep secrets in GitHub Secrets, never in the repo.

## Required secrets

### Android (Play Store)

| Secret | Purpose |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64 of release `.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Signing key alias |
| `ANDROID_KEY_PASSWORD` | Signing key password |
| `PLAY_STORE_JSON` | Service account JSON for Play Publishing API |

### iOS (App Store / TestFlight)

| Secret | Purpose |
| --- | --- |
| `IOS_P12_BASE64` | Base64 of distribution `.p12` |
| `IOS_P12_PASSWORD` | `.p12` password |
| `IOS_KEYCHAIN_PASSWORD` | Keychain unlock password (build-time only) |
| `IOS_CODE_SIGN_IDENTITY` | e.g. `Apple Distribution: Yair Rajwan (TEAMID)` |
| `IOS_TEAM_ID` | 10-char Apple Developer team ID |
| `APPSTORE_API_KEY_BASE64` | App Store Connect API key (`.p8`, base64) |
| `APPSTORE_API_KEY_ID` | API key ID |
| `APPSTORE_API_ISSUER_ID` | Issuer UUID |

## Workflow gates

- Forked-PR builds run **without** signing — the absence of secrets
  short-circuits the import + signing steps.
- Signing only fires on `push` to `main` or tag `v*.*.*`.
- Distribution (TestFlight / Play Internal) is a separate workflow
  triggered by tag — see S580.

## Local rotation

```bash
# Rotate Android keystore (every 25 years per Play policy):
keytool -genkey -v -keystore release.keystore -alias wedding -keyalg RSA -keysize 4096 -validity 9125
base64 -w 0 release.keystore | gh secret set ANDROID_KEYSTORE_BASE64

# Rotate iOS distribution cert (annually):
# 1. Create in Apple Developer portal, download .p12
base64 -w 0 wedding-dist.p12 | gh secret set IOS_P12_BASE64
```
