# Tutorial: Run the Wedding Manager locally

> Audience: first-time contributor
> Outcome: dev server running on `http://localhost:5173` with the Hebrew RTL UI.
> Time: ~5 minutes (excluding `npm install`).

## Prerequisites

- **Node 22 LTS** or newer (`node --version` ≥ 22)
- **npm 11** (`npm --version` ≥ 11)
- A modern browser: Chrome 110+, Firefox 115+, Safari 16+, Edge 110+
- Git for Windows / macOS / Linux

## 1. Clone and install

The repo lives next to a shared `node_modules/` one directory up.
This is intentional (see ADR-001). Clone the repo as a sibling, then
install once at the parent.

```pwsh
# pick any folder; here we use C:\src
cd C:\src
git clone https://github.com/RajwanYair/Wedding.git
cd Wedding
cd ..
npm install            # populates ../node_modules
cd Wedding
```

## 2. Start the dev server

```pwsh
npm run dev
```

Vite will print:

```text
  ➜  Local:   http://localhost:5173/Wedding/
  ➜  Network: use --host to expose
```

Open the URL — the Hebrew (RTL) landing page loads. Toggle to English
from the language switcher in the header.

## 3. Run the test suite

```pwsh
npm test                # 2300+ Vitest unit/integration tests
```

Expected: `Test Files  142+ passed (142+) · Tests  2300+ passed`.

## 4. Run the lint suite

```pwsh
npm run lint
```

Expected: zero output, exit code 0.

## 5. Build for production

```pwsh
npm run build
```

The bundle is written to `dist/`. A precache manifest is generated and
embedded into `dist/sw.js` automatically (`postbuild`).

## 6. Optional — Playwright E2E

```pwsh
npx playwright install chromium    # one-time
npm run test:e2e                   # smoke
npm run test:e2e:visual            # visual regressions
```

## What to read next

| If you want to… | Read |
| --- | --- |
| Understand the architecture | [ARCHITECTURE.md](../../ARCHITECTURE.md) |
| Understand a specific decision | [docs/explanation/README.md](../explanation/README.md) |
| Add an audit script | [docs/reference/audit-scripts.md](../reference/audit-scripts.md) |
| Encrypt a new credential | [docs/how-to/encrypt-tokens.md](../how-to/encrypt-tokens.md) |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Cannot find module …` after install | Ensure `npm install` was run in the **parent** folder, not `Wedding/`. |
| Dev server returns 404 on `/` | The base path is `/Wedding/`. Use the printed URL exactly. |
| Hebrew text shows as boxes | Browser is missing the system font — install Tahoma or Segoe UI. |
| `audit:bundle` advisory fails locally | Run `npm run build` first; advisory reads `dist/`. |
