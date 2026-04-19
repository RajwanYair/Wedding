---
mode: agent
description: Bump the app version across all version-bearing files
---

# Version Bump

Bump the app version from the current version to `${input:newVersion}`.

## Files to Update

Update the version string in ALL of these files:

1. `src/core/config.js` — `APP_VERSION`
2. `public/sw.js` — `CACHE_NAME` constant
3. `package.json` — `"version"` field
4. `tests/wedding.test.mjs` — expected version string in version test
5. `CHANGELOG.md` — add new entry at the top (see format below)
6. `README.md` — version badge `?label=version&message=vX.Y.Z`
7. `.github/copilot-instructions.md` — version in Quick Facts table
8. `.github/copilot/config.json` — `welcomeMessage` version string
9. `.github/instructions/workspace.instructions.md` — version in title
10. `.github/workflows/ci.yml` — version in header comment
11. `ARCHITECTURE.md` — version in h1
12. `ROADMAP.md` — current state block + release table

## CHANGELOG Entry Format

```markdown
## [vX.Y.Z] — YYYY-MM-DD

### Added
- ...

### Changed
- ...

### Fixed
- ...
```

## After Updating

Run `npm run sync:version` to verify all files are consistent, then:

```bash
npm run lint && npm test
```

Both must exit 0 before committing. Commit message format:

```text
chore(release): bump version to vX.Y.Z
```
