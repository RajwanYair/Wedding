# Security Policy

## Supported Versions

| Version | Supported     |
| ------- | ------------- |
| 8.x     | ✅ Active     |
| < 8.0   | ❌ No support |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

To report a security issue, please email the repository maintainer directly or use GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).

Include:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact assessment
4. Any suggested fix (optional)

You will receive a response within 72 hours acknowledging the report.

## Security Measures

This project applies the following security practices:

- **Zero runtime dependencies** — no third-party libraries in the browser bundle
- **Input sanitization** — all user inputs pass through `sanitize(input, schema)` in `src/utils/sanitize.js`
- **No `innerHTML` with user data** — `textContent` only for untrusted strings
- **CSP-friendly** — no inline scripts or `eval()` usage
- **OAuth only via approved allowlist** — `isApprovedAdmin(email)` gates all admin access
- **Session rotation** — auth sessions rotate every 2 hours via `maybeRotateSession()`
- **`npm audit`** — runs on every CI push at `--audit-level=high`
- **SRI hashes** — generated via `npm run sri` for all static assets

## Scope

| In scope                      | Out of scope                                  |
| ----------------------------- | --------------------------------------------- |
| `src/` ES modules             | Third-party OAuth SDKs            |
| `public/sw.js` service worker | GitHub Actions secrets management |
| `scripts/` build scripts      |                                   |

## Known Limitations

This is a **personal wedding management tool** deployed on GitHub Pages. Guest data is stored
in the user's own browser `localStorage` and optionally in the user's own Google Sheets.
**No data is transmitted to any server controlled by this repository.**
