---
mode: agent
description: "Optimize a section module for performance: lazy loading, render batching, memory leaks."
---

# Optimize Section — Wedding Manager

Optimize the section: **`${input:sectionName}`**

## Audit Checklist

### 1. Load Performance

- [ ] Template loaded lazily via `loadTemplate()` — not bundled inline
- [ ] Heavy imports use dynamic `import()` — not top-level
- [ ] Event listeners registered in `mount()`, removed in `unmount()`
- [ ] No DOM queries outside `mount()`/render functions

### 2. Render Efficiency

- [ ] Batch DOM writes — avoid read/write interleaving (layout thrashing)
- [ ] Use `DocumentFragment` for list rendering (> 10 items)
- [ ] Debounce input handlers that trigger re-renders
- [ ] Avoid `querySelectorAll` in loops — cache references in `el` object

### 3. Memory & Cleanup

- [ ] `unmount()` nulls `el` references and removes listeners
- [ ] `storeSubscribe` callbacks are unsubscribed in `unmount()`
- [ ] Intervals/timeouts cleared via stored IDs
- [ ] No closures capturing large data structures

### 4. Network

- [ ] Sheets sync uses `enqueueWrite()` with debounce — no rapid-fire calls
- [ ] API calls deduplicated (abort controller or flag)
- [ ] Error states handled without rethrowing to unrelated callers

## Implementation

1. Read `src/sections/${input:sectionName}.js` and its template
2. Identify issues from checklist above
3. Fix each issue with minimal code changes
4. Run `npm run lint && npm test` — verify 0 errors
5. Commit with message: `perf(${input:sectionName}): optimize section load and render`
