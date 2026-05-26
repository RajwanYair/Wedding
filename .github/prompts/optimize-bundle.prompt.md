---
mode: agent
description: "Analyze and optimize bundle size — tree-shaking, code splitting, lazy loading."
---

# Bundle Optimization — Wedding Manager

Analyze the production bundle and identify optimization opportunities.

## Steps

### 1. Measure Current State

```bash
npm run build
npm run size
```

### 2. Analyze Chunk Distribution

- Check `vite.config.js` rollup output configuration
- Identify large chunks that could be split further
- Verify lazy-loaded sections/modals are in separate chunks

### 3. Find Tree-Shaking Opportunities

```bash
node scripts/dead-export-check.mjs
```

- Identify unused exports that bloat the bundle
- Check for barrel files re-exporting everything

### 4. Verify Lazy Loading

- All section modules loaded via dynamic `import()`
- Modal templates loaded on first open
- i18n locale files loaded on language switch
- Heavy third-party code (DOMPurify, Valibot) chunked separately

### 5. Report

Output a table with:

| Chunk | Size (gzip) | Optimization |
|-------|-------------|--------------|
| main | XX KB | ... |

Include actionable recommendations sorted by impact.
