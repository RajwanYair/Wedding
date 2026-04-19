---
mode: agent
description: Add a new i18n key to all language files with proper translations
---

# Add i18n Key

Add the new translation key `${input:key}` with value `${input:heValue}` (Hebrew) to all 4 language files.

## Steps

1. **Add to `src/i18n/he.json`** — Hebrew (primary):
   - Value: the Hebrew text provided
   - Place alphabetically within the correct section

2. **Add to `src/i18n/en.json`** — English:
   - Translate the Hebrew meaning accurately
   - Keep the same tone (formal/informal) as surrounding keys

3. **Add to `src/i18n/ar.json`** — Arabic:
   - Translate to Modern Standard Arabic (RTL)
   - If uncertain, use a close approximation and add `// TODO: review` comment

4. **Add to `src/i18n/ru.json`** — Russian:
   - Translate to Russian
   - If uncertain, use a close approximation and add `// TODO: review` comment

## i18n Key Naming Rules

- Use `snake_case`
- Prefix by domain: `guest_`, `table_`, `rsvp_`, `vendor_`, `expense_`, `budget_`, `timeline_`, `nav_`, `error_`, `label_`, `btn_`, `msg_`
- Action buttons: `btn_save`, `btn_cancel`, `btn_delete_confirm`
- Error messages: `error_phone_invalid`, `error_required`
- Labels: `label_guest_name`, `label_table_number`

## Validation

After adding, run:

```bash
npm run check:i18n
```

Must exit 0 with 0 missing keys across all 4 files.

## Usage in Code

**HTML:** `<span data-i18n="${input:key}">fallback text</span>`

**JS:** `t('${input:key}')`
