---
mode: agent
description: "Generate a roadmap status report — sprints completed, in-progress, and upcoming."
---

# Roadmap Status — Wedding Manager

Generate a concise status report of the project roadmap.

## Steps

### 1. Read Current State

- Read `ROADMAP.md` sections 2, 9, 10 (Current State, Phased Plan, Sprint Backlog)
- Read `CHANGELOG.md` last 3 entries
- Run `npm run check:canonical-facts` to verify version alignment

### 2. Collect Metrics

```bash
npm test -- --reporter=verbose 2>&1 | Select-String "Tests|Files"
npm run size 2>&1 | Select-String "gzip"
```

### 3. Generate Report

Output a table:

| Sprint | Status | Key Deliverable |
|--------|--------|-----------------|
| S### | ✅/⏳/❌ | Brief description |

### 4. Identify Blockers

- Any failing tests or lint errors
- Any unresolved TODOs tagged `SPRINT` or `ROADMAP`
- Any stale branches

### 5. Suggest Next Actions

Based on roadmap priority order, list the top 3 sprints to tackle next.
