# Uptime Monitoring (UptimeRobot)

> S559 — external uptime probe for the GitHub Pages deployment of Wedding
> Manager.  Free tier (50 monitors, 5-min interval) is sufficient.

## Decision

We use [UptimeRobot](https://uptimerobot.com) (free tier) over self-hosted
alternatives (Uptime-Kuma, Statping) because the deploy target is a static
GitHub Pages site with no server we control — there is nothing to host an
internal monitor on.  UptimeRobot also publishes a status-page URL we embed
in the README badge.

## Monitors

| # | Name                | URL                                                        | Type       | Interval |
| - | ------------------- | ---------------------------------------------------------- | ---------- | -------- |
| 1 | Wedding Pages       | <https://rajwanyair.github.io/Wedding/>                    | HTTPS      | 5 min    |
| 2 | Wedding SW          | <https://rajwanyair.github.io/Wedding/sw.js>               | HTTPS      | 5 min    |
| 3 | Wedding manifest    | <https://rajwanyair.github.io/Wedding/manifest.json>       | HTTPS      | 5 min    |
| 4 | Supabase REST       | `${SUPABASE_URL}/rest/v1/`                                 | HTTPS      | 5 min    |

## Alerting

- **Email**: `yair.rajwan@gmail.com` — primary.
- **Webhook**: optional Slack/Discord webhook (not configured by default).
- **Down threshold**: 2 consecutive failures (10 min) before alert.

## Status badge

Add to `README.md` once a public status page slug is configured:

```markdown
[![Uptime Robot](https://img.shields.io/uptimerobot/status/<MONITOR_KEY>.svg)](https://stats.uptimerobot.com/<PAGE_KEY>)
```

`MONITOR_KEY` and `PAGE_KEY` are obtained from the UptimeRobot dashboard
under "My Settings → Public Status Pages".  These are not secrets and are
safe to commit.

## Setup steps

1. Sign up at <https://uptimerobot.com> (free).
2. Create the four monitors above.
3. Create a public status page named `wedding-status` (or similar).
4. Copy the monitor key (starts with `m`) into the badge URL.
5. Open a PR updating `README.md` with the badge.
6. Verify the badge renders green within 10 minutes.

## Owner & SLO

- **Owner**: deploy team (currently @RajwanYair).
- **SLO**: 99.5% monthly uptime (≤ 3.6 h/month downtime).
- **Action on alert**: see [incident-response.md](./incident-response.md).
