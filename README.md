<div align="center">

# 💍 Wedding Manager

![Version](https://img.shields.io/badge/version-v1.1.0-d4a574?style=flat-square)
![HTML](https://img.shields.io/badge/Single_File-HTML-E34F26?style=flat-square&logo=html5&logoColor=white)
![Dependencies](https://img.shields.io/badge/Runtime_Deps-Zero-6ee7b7?style=flat-square)
![Hebrew](https://img.shields.io/badge/שפה-עברית_RTL-60a5fa?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)

**Wedding management app — RSVP, table seating, WhatsApp invitations.**
**Single-file, zero-dependency, Hebrew RTL with English support.**

</div>

---

![Architecture](architecture.svg)

## Features

| Feature | Description |
| --- | --- |
| 📊 **Dashboard** | Stats overview, countdown timer, progress bars, quick actions |
| 👥 **Guest List** | CRUD with side (groom/bride/mutual), meal preferences, accessibility, children |
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
```

## Development

```bash
# Tests
node --test tests/wedding.test.mjs

# Lint — all must exit 0 (0 errors, 0 warnings)
npm run lint         # HTML + CSS + JS + Markdown
npm run lint:html    # HTMLHint
npm run lint:css     # Stylelint  (extracts <style>)
npm run lint:js      # ESLint     (extracts <script>)
npm run lint:md      # markdownlint-cli2
```

## Project Structure

```text
Wedding/
├── index.html            # App — HTML + CSS + JS (single file)
├── sw.js                 # Service Worker (offline cache)
├── manifest.json         # PWA manifest
├── icon.svg              # App icon (512×512 rings + heart)
├── invitation.jpg        # Default invitation background
├── architecture.svg      # Architecture diagram
├── package.json          # devDeps: eslint, stylelint, htmlhint, markdownlint-cli2
├── tests/
│   └── wedding.test.mjs  # 125 unit tests (Node built-in runner)
└── .github/              # Copilot instructions, agents, prompts, CI/CD workflows
```

## Guest Model (v1.1.0)

```text
{ id, firstName, lastName, phone, email, count, children,
  status: pending|confirmed|declined|maybe,
  side:   groom|bride|mutual,
  group:  family|friends|work|other,
  meal:   regular|vegetarian|vegan|gluten_free|kosher,
  mealNotes, accessibility: boolean,
  tableId, gift, notes, sent, rsvpDate, createdAt, updatedAt }
```

## Themes

| Theme | Accent Color |
| --- | --- |
| Default Purple | `#d4a574` — elegant gold on dark purple |
| Rose Gold | `#e8a0b4` — warm pink tones |
| Classic Gold | `#d4a030` — traditional gold |
| Emerald | `#6ee7b7` — fresh green |
| Royal Blue | `#60a5fa` — cool blue |

## License

MIT © [RajwanYair](https://github.com/RajwanYair)
