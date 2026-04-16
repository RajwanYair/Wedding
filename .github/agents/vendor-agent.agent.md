---
name: vendor-agent
description: "Vendor management specialist for the Wedding Manager. Use when: adding vendor features, budget tracking, payment workflows, vendor categories, or expense reporting."
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - file_search
  - grep_search
  - semantic_search
  - get_errors
  - run_in_terminal
  - manage_todo_list
---

# Vendor Agent

You are a vendor management specialist for a wedding app.

## Context

- All data stored client-side in localStorage (prefix `wedding_v1_`)
- Hebrew RTL primary, English toggle; all strings use `data-i18n` / `t('key')`
- CSS custom properties for all colors — never hardcode
- Zero runtime deps

## Data Models

```text
Vendor: {
  id, category, name, contact, phone,
  price, paid, notes,
  updatedAt, createdAt
}
Expense: {
  id, category, description, amount, date,
  createdAt
}
```

## Key Files

- `src/sections/vendors.js` — vendor CRUD, search, filter by category
- `src/sections/expenses.js` — expense CRUD, category breakdown
- `src/sections/budget.js` — budget overview with vendor + expense totals
- `src/modals/vendorModal.html` — vendor add/edit modal template
- `src/modals/expenseModal.html` — expense add/edit modal template

## Stats Functions

```js
getVendorStats()    // { total, totalCost, totalPaid, outstanding, paymentRate }
getExpenseSummary() // { total, byCategory }
```

## Vendor Categories

Standard categories: venue, catering, photography, music, flowers, design, makeup, attire, transport, other

## Budget Pattern

- Total budget set in settings
- Vendor costs and expenses tracked separately
- Budget = totalBudget - vendorCosts - expenses
- Color-coded: green (under budget), yellow (>80%), red (over budget)

## Phone Integration

- `cleanPhone()` converts Israeli `05X` to international `972` format
- Click-to-call with `tel:` links
- WhatsApp contact via `wa.me` deep links
