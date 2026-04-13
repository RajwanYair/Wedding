<div align="center">

# 💍 Wedding Manager

![Version](https://img.shields.io/badge/version-v1.0.0-d4a574?style=flat-square)
![HTML](https://img.shields.io/badge/Single_File-HTML-E34F26?style=flat-square&logo=html5&logoColor=white)
![Dependencies](https://img.shields.io/badge/Dependencies-Zero-6ee7b7?style=flat-square)
![Hebrew](https://img.shields.io/badge/שפה-עברית_RTL-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)

**Wedding management app — RSVP, table seating, WhatsApp invitations.**
**Single-file, zero-dependency, Hebrew RTL with English support.**

</div>

---

## Features

| Feature | Description |
| --- | --- |
| 📊 **Dashboard** | Stats overview, countdown timer, progress bars, quick actions |
| 👥 **Guest List** | Full CRUD — search, filter by status, group tags (family/friends/work) |
| 🪑 **Table Seating** | Visual floor plan with round/rectangular tables, drag-and-drop assignment |
| 💌 **Invitation** | Auto-generated SVG invitation + custom JPG/PNG/SVG upload |
| 📱 **WhatsApp** | Templated messages with placeholders, bulk/individual send via wa.me |
| ✅ **RSVP** | Public-facing form for guest self-registration, auto-match existing |
| 📥 **Export** | CSV with UTF-8 BOM for Hebrew, print-friendly layout |
| 🌐 **i18n** | Full Hebrew/English support with language toggle |
| 🎨 **5 Themes** | Purple (default), Rose Gold, Classic Gold, Emerald, Royal Blue |
| 📲 **PWA** | Installable, offline-capable via Service Worker |

## Quick Start

```bash
# Clone
git clone https://github.com/RajwanYair/Wedding.git

# Open in browser (no build step needed!)
open index.html

# Or use Live Server in VS Code
```

## Development

```bash
# Run tests
node --test tests/wedding.test.mjs

# Watch mode
node --test --watch tests/wedding.test.mjs
```

## Project Structure

```text            # Full app (HTML + CSS + JS)
├── sw.js                 # Service Worker (offline + cache)
├── manifest.json         # PWA manifest
├── icon.svg              # App icon (512×512 rings + heart)
├── package.json          # Node test runner config
├── tests/
│   └── wedding.test.mjs  # Test suite
├── .github/
│   ├── copilot-instructions.md
│   ├── AGENTS.md
│   ├── copilot/config.json
│   ├── workflows/        # CI, deploy, release
│   ├── instructions/     # Copilot context files
│   ├── agents/           # Custom Copilot agents
│   └── prompts/          # Reusable Copilot prompts
└── .vscode/              # Workspace config
```

## Tech Stack

- **HTML5** — semantic markup, RTL-first
- **CSS3** — custom properties, glassmorphism, responsive grid
- **JavaScript** — vanilla ES2020+, zero frameworks
- **localStorage** — all data persisted client-side
- **Service Worker** — offline-first PWA
- **wa.me** — WhatsApp deep links for invitations

## Themes

| Theme | Preview |
| --- | --- |
| Default Purple | `--accent: #d4a574` elegant gold on dark purple |
| Rose Gold | `--accent: #e8a0b4` warm pink tones |
| Classic Gold | `--accent: #d4a030` traditional gold |
| Emerald | `--accent: #6ee7b7` fresh green |
| Royal Blue | `--accent: #60a5fa` cool blue |

## i18n

Full Hebrew (RTL) and English (LTR) support:

- Language toggle button in top bar
- All UI text uses `data-i18n` attributes
- Dynamic content uses `t('key')` function
- Persisted in localStorage

## License

MIT © [RajwanYair](https://github.com/RajwanYair)
