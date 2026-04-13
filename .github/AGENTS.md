# Agents — Wedding Manager

## Available Custom Agents

### `@wedding-designer`

UI/UX specialist for the glassmorphism theme, CSS custom properties, RTL layout, responsive design, 5 elegant wedding themes, card animations, and mobile-friendly layout.

**Use when**: redesigning sections, changing themes, adjusting layout, improving responsiveness, card animations.

### `@guest-manager`

Guest management specialist for RSVP workflows, table seating logic, WhatsApp message templates, CSV export, and data persistence.

**Use when**: adding guest features, modifying RSVP flow, table assignment logic, WhatsApp integration, data import/export.

## Available Prompts (type `/` in chat)

| Prompt | Purpose |
| --- | --- |
| `/code-review` | Full security + UI + i18n + data integrity audit |
| `/add-feature` | Scaffold a new feature section |

## Available Instructions (auto-loaded by file pattern)

| Instruction | Applies To | Purpose |
| --- | --- | --- |
| `wedding` | `*.html` | HTML/CSS/JS implementation patterns |
| `cicd` | `*.yml, *.yaml, .github/**` | CI/CD workflow standards |
| `workspace` | on-demand | File structure and resource map |

## MCP Servers (`.vscode/mcp.json`)

| Server | Package | Purpose |
| --- | --- | --- |
| `fetch` | `@modelcontextprotocol/server-fetch` | Test API endpoints in chat |
| `filesystem` | `@modelcontextprotocol/server-filesystem` | Scoped read/write to project |
