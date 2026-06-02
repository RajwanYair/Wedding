---
mode: agent
description: "Add a new section to the app with template, i18n, constants, and tests."
---

# Add Section — Wedding Manager

Create a new section: **`${input:sectionName}`**
Description: `${input:sectionDescription}`

## Steps

### 1. Check Existing Sections

```bash
Get-ChildItem src/sections -Filter "*.js" | Select-Object Name | Sort-Object Name
```

Read `src/core/constants.ts` — check `SECTION_LIST` for conflicts.

### 2. Create Section Module

File: `src/sections/${input:sectionName}.js`

```js
/**
 * src/sections/${input:sectionName}.js — ${input:sectionDescription}
 * @module ${input:sectionName}
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { t } from "../core/i18n.js";
import { loadTemplate } from "../core/template-loader.js";

let el = {};
let _unsubs = [];

export function mount(container) {
  // Load template, bind el refs, subscribe to store, register actions
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs = [];
  el = {};
}

export function render${input:sectionName}() {
  // Render logic
}
```

### 3. Create Template

File: `src/templates/${input:sectionName}.html`

- Use `data-i18n="key"` on all visible strings
- Use `data-action="sectionName:actionName"` for interactions
- Use semantic HTML with proper ARIA roles

### 4. Register in Constants

Add to `SECTION_LIST` in `src/core/constants.ts`.

### 5. Import in main.js

```js
import * as ${input:sectionName}Section from "./sections/${input:sectionName}.js";
```

### 6. Add i18n Keys

Add matching keys to both `src/i18n/he.json` and `src/i18n/en.json`.

### 7. Create Handler

File: `src/handlers/${input:sectionName}-handlers.js` (if section has actions).

### 8. Validate

```bash
npm run lint
npm test
node scripts/check-i18n-parity.mjs
```
