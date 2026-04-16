# Wedding Manager — API Reference

> Auto-generated from JSDoc by `scripts/generate-docs.mjs`
> Generated: 2026-04-16

## Table of Contents

- [`src/core/dom.js`](#srccoredomjs)
- [`src/core/events.js`](#srccoreeventsjs)
- [`src/core/i18n.js`](#srccorei18njs)
- [`src/core/nav.js`](#srccorenavjs)
- [`src/core/state.js`](#srccorestatejs)
- [`src/core/storage.js`](#srccorestoragejs)
- [`src/core/store.js`](#srccorestorejs)
- [`src/core/template-loader.js`](#srccoretemplateloaderjs)
- [`src/core/ui.js`](#srccoreuijs)
- [`src/handlers/guest-handlers.js`](#srchandlersguesthandlersjs)
- [`src/handlers/section-handlers.js`](#srchandlerssectionhandlersjs)
- [`src/handlers/settings-handlers.js`](#srchandlerssettingshandlersjs)
- [`src/handlers/table-handlers.js`](#srchandlerstablehandlersjs)
- [`src/handlers/vendor-handlers.js`](#srchandlersvendorhandlersjs)
- [`src/sections/analytics.js`](#srcsectionsanalyticsjs)
- [`src/sections/budget.js`](#srcsectionsbudgetjs)
- [`src/sections/changelog.js`](#srcsectionschangelogjs)
- [`src/sections/checkin.js`](#srcsectionscheckinjs)
- [`src/sections/contact-collector.js`](#srcsectionscontactcollectorjs)
- [`src/sections/dashboard.js`](#srcsectionsdashboardjs)
- [`src/sections/expenses.js`](#srcsectionsexpensesjs)
- [`src/sections/gallery.js`](#srcsectionsgalleryjs)
- [`src/sections/guest-landing.js`](#srcsectionsguestlandingjs)
- [`src/sections/guests.js`](#srcsectionsguestsjs)
- [`src/sections/invitation.js`](#srcsectionsinvitationjs)
- [`src/sections/landing.js`](#srcsectionslandingjs)
- [`src/sections/registry.js`](#srcsectionsregistryjs)
- [`src/sections/rsvp.js`](#srcsectionsrsvpjs)
- [`src/sections/settings.js`](#srcsectionssettingsjs)
- [`src/sections/tables.js`](#srcsectionstablesjs)
- [`src/sections/timeline.js`](#srcsectionstimelinejs)
- [`src/sections/vendors.js`](#srcsectionsvendorsjs)
- [`src/sections/whatsapp.js`](#srcsectionswhatsappjs)
- [`src/services/auth.js`](#srcservicesauthjs)
- [`src/services/backend.js`](#srcservicesbackendjs)
- [`src/services/presence.js`](#srcservicespresencejs)
- [`src/services/sheets-impl.js`](#srcservicessheetsimpljs)
- [`src/services/sheets.js`](#srcservicessheetsjs)
- [`src/services/supabase.js`](#srcservicessupabasejs)
- [`src/utils/date.js`](#srcutilsdatejs)
- [`src/utils/form-helpers.js`](#srcutilsformhelpersjs)
- [`src/utils/misc.js`](#srcutilsmiscjs)
- [`src/utils/phone.js`](#srcutilsphonejs)
- [`src/utils/sanitize.js`](#srcutilssanitizejs)
- [`src/utils/undo.js`](#srcutilsundojs)

---

### `src/core/dom.js`

#### `function clearDomCache()`
> Line 35

Clear the DOM cache (useful after re-renders or test resets).

#### `function warmDom(...ids)`
> Line 43

Pre-warm specific element IDs into the cache.
@param {...string} ids

---

### `src/core/events.js`

#### `function initEvents()`
> Line 33

Install the single document-level event listener (call once at startup).

#### `function on(action, fn)`
> Line 99

Register an action handler.
@param {string} action  Value of the `data-action` attribute
@param {(el: HTMLElement, e: Event) => void} fn

#### `function off(action)`
> Line 107

Remove an action handler.
@param {string} action

---

### `src/core/i18n.js`

#### `async function loadLocale(lang, _inlineDict)`
> Line 22

Load a language pack via Vite dynamic import().
Hebrew is bundled eagerly; other locales are split into lazy chunks.
@param {'he'|'en'|'ar'|'ru'} lang
@param {Record<string, string>} [_inlineDict]  Injected dict for unit tests only
@returns {Promise<void>}

#### `function t(key, paramsOrFallback, fallback)`
> Line 60

Translate a key, with optional ICU MessageFormat interpolation.
Supports:
 - Simple interpolation: `"Hello, {name}"` with `{ name: "Yair" }`
 - ICU plural: `"{count, plural, one {# guest} other {# guests}}"` with `{ count: 5 }`
 - Exact matches: `"{n, plural, =0 {none} one {# item} other {# items}}"`
Backward-compatible: `t(key)` and `t(key, "fallback")` still work.
@param {string} key
@param {Record<string, string|number> | string} [paramsOrFallback]
@param {string} [fallback]
@returns {string}

#### `function formatMessage(template, params)`
> Line 81

Resolve a lightweight ICU MessageFormat string.
Handles `{key}` simple interpolation and
`{key, plural, =N {…} one {…} few {…} many {…} other {…}}` plural blocks.
Uses native `Intl.PluralRules` for locale-correct plural categories
(important for Arabic few/many and Russian one/few/many).
@param {string} template
@param {Record<string, string|number>} params
@returns {string}

#### `function currentLang()`
> Line 164

Current active language.
@returns {'he'|'en'|'ar'|'ru'}

#### `function applyI18n(root = document)`
> Line 172

Apply translations to all elements with `data-i18n` attributes.
@param {Document | Element} [root]

#### `function formatDate(value, opts)`
> Line 201

Format a date string or Date using Intl.DateTimeFormat, respecting current locale.
@param {string | Date | number} value  ISO string, Date, or timestamp
@param {Intl.DateTimeFormatOptions} [opts]
@returns {string}

#### `function formatNumber(value, opts)`
> Line 220

Format a number using Intl.NumberFormat, respecting current locale.
@param {number} value
@param {Intl.NumberFormatOptions} [opts]
@returns {string}

#### `function formatCurrency(value, currency = "ILS")`
> Line 230

Format a number as currency (ILS by default).
@param {number} value
@param {string} [currency]
@returns {string}

---

### `src/core/nav.js`

#### `function navigateTo(name)`
> Line 44

Navigate to a section by name. Updates URL hash and triggers delegation.
@param {string} name

#### `function activeSection()`
> Line 63

Return the currently active section name.
@returns {string}

#### `function initRouter()`
> Line 72

Initialise the hash router. Reads the current URL hash on startup and
navigates to the matching section. Listens for hashchange (back/forward).

#### `function initSwipe(container = document.body)`
> Line 94

Enable swipe-left/right navigation between sections.
@param {HTMLElement} [container]

#### `function initPullToRefresh(onRefresh, container = document.body)`
> Line 135

Enable pull-to-refresh gesture. Triggers onRefresh() when the user
drags down > 64px from the top of the page while already at scroll-top.
CSS classes on body: ptr--pulling (dragging), ptr--refreshing (loading).
@param {() => Promise<void>} onRefresh   Async callback to run on release
@param {HTMLElement} [container]

#### `function initKeyboardShortcuts()`
> Line 207

Register Alt+1 through Alt+9 keyboard shortcuts to jump to sections.
Works on desktop browsers; ignored when focus is in an input/textarea.
Mapping: Alt+1 = _sections[0], Alt+2 = _sections[1], …, Alt+9 = _sections[8]
@returns {() => void} Cleanup function that removes the listener.

---

### `src/core/state.js`

#### `function listEvents()`
> Line 31

List all event IDs stored in localStorage.
@returns {Array<{id: string, label: string}>}

#### `function getActiveEventId()`
> Line 41

Get the active event ID.
@returns {string}

#### `function setActiveEvent(eventId)`
> Line 51

Switch the active event. Returns the new event's ID.
Call this BEFORE re-initialising the store — the store will read
from the new event's key namespace.
@param {string} eventId

#### `function addEvent(id, label)`
> Line 61

Add a new event to the registry.
@param {string} id
@param {string} label

#### `function removeEvent(id)`
> Line 73

Remove an event from the registry (does NOT clear its data).
@param {string} id

#### `function renameEvent(id, newLabel)`
> Line 84

Rename an event label.
@param {string} id
@param {string} newLabel

#### `function restoreActiveEvent()`
> Line 97

Restore the last-used event ID from localStorage.
Called during bootstrap before initStore.

#### `function save(key, value)`
> Line 139

Save a value to localStorage (scoped to current event).
@param {string} key   Key without prefix
@param {unknown} value

#### `function load(key, fallback)`
> Line 152

Load a value from localStorage (scoped to current event).
@template T
@param {string} key
@param {T} [fallback]
@returns {T | undefined}

#### `function remove(key)`
> Line 166

Remove a key from localStorage (scoped to current event).
@param {string} key

#### `function clearAll()`
> Line 175

Clear all keys for the ACTIVE event from localStorage.

#### `function clearEventData(eventId)`
> Line 188

Clear all keys for a specific event from localStorage.
@param {string} eventId

---

### `src/core/storage.js`

#### `async function initStorage()`
> Line 175

Initialise the storage layer. Call once during app bootstrap.
Selects the best adapter and optionally migrates data from localStorage.
@returns {Promise<AdapterType>} The chosen adapter type

#### `function getAdapterType()`
> Line 192

Returns the active adapter type.
@returns {AdapterType}

#### `async function storageGet(key)`
> Line 201

Get a value from storage by key.
@param {string} key
@returns {Promise<string | null>}

#### `async function storageSet(key, value)`
> Line 211

Set a value in storage.
@param {string} key
@param {string} value
@returns {Promise<void>}

#### `async function storageRemove(key)`
> Line 220

Remove a value from storage.
@param {string} key
@returns {Promise<void>}

#### `async function storageClear()`
> Line 228

Clear all storage.
@returns {Promise<void>}

#### `async function migrateFromLocalStorage(prefix = "wedding_v1_")`
> Line 238

Migrate all wedding_v1_* keys from localStorage to IndexedDB.
No-op if the active adapter is not IndexedDB.
@param {string} [prefix="wedding_v1_"]
@returns {Promise<number>} Number of keys migrated

---

### `src/core/store.js`

#### `function storeSubscribe(key, fn)`
> Line 50

Subscribe to a specific state key or all changes via "*".
@param {string} key
@param {Function} fn
@returns {() => void}  Unsubscribe function

#### `function onStorageError(fn)`
> Line 89

Register a callback invoked when localStorage persistence fails (F1.5.5).
Useful for surfacing quota errors in the UI or triggering cleanup.
@param {(key: string, err: unknown) => void} fn

#### `function initStore(defs)`
> Line 151

Initialise the store. Call once after state has been loaded from localStorage.
@param {Record<string, { value: unknown, storageKey?: string }>} defs

#### `function storeGet(key)`
> Line 163

Get a state value.
@param {string} key
@returns {unknown}

#### `function storeSet(key, value)`
> Line 172

Set a state value and notify subscribers.
@param {string} key
@param {unknown} value

#### `function storeFlush()`
> Line 181

Force-flush any pending saves to localStorage immediately.

#### `function reinitStore(defs)`
> Line 190

Re-initialise the store with new definitions (S9.1 event switch).
Flushes pending writes for the OLD event, then reloads all keys.
@param {Record<string, { value: unknown, storageKey?: string }>} defs

---

### `src/core/template-loader.js`

#### `function onTemplateLoaded(sectionName, fn)`
> Line 49

Register a callback to fire after a section template is injected.
@param {string} sectionName
@param {() => void} fn

#### `async function injectTemplate(container, sectionName)`
> Line 61

Inject the HTML template for the given section into its container element.
Skips injection if already done (data-loaded="1").
@param {HTMLElement} container   The <div class="section" id="sec-xxx"> element
@param {string} sectionName      e.g. "guests"
@returns {Promise<void>}

#### `function prefetchTemplates(names)`
> Line 102

Prefetch templates for sections that are likely to be visited soon.
Call on idle to avoid delaying the initial load.
@param {string[]} names

---

### `src/core/ui.js`

#### `function showToast(message, type = "info", duration = _TOAST_DURATION)`
> Line 37

Show a stacking toast notification.
@param {string} message
@param {'success'|'error'|'warning'|'info'} [type]
@param {number} [duration]

#### `async function openModal(modalId)`
> Line 115

Open a modal by ID, trapping focus inside it.
Lazy-loads modal HTML template on first open.
@param {string} modalId

#### `function closeModal(modalId)`
> Line 134

Close a modal by ID, restoring focus to the element that opened it.
@param {string} modalId

#### `function confirmDialog(messageKey)`
> Line 151

Show a confirmation dialog using the native `confirm()` API.
(Replace with a custom modal in a future sprint.)
@param {string} messageKey  i18n key
@returns {boolean}

#### `function showConfirmDialog(message, onConfirm)`
> Line 162

Show a confirmation dialog and invoke a callback if confirmed.
Passes the resolved i18n message to the native confirm dialog.
@param {string} message  — already-translated string (or i18n key fallback)
@param {() => void} onConfirm  — callback invoked when user confirms
@returns {boolean}  true if confirmed

#### `function cycleTheme()`
> Line 176

Cycle through the 5 design themes (applies a body class).

#### `function toggleLightMode()`
> Line 193

Toggle light/dark mode (adds/removes `.light-mode` on body).

#### `function toggleMobileNav()`
> Line 208

Toggle mobile nav drawer (adds/removes `.nav-open` on body).

#### `function restoreTheme()`
> Line 215

Restore persisted theme + light-mode on startup.

#### `function applyUpdate()`
> Line 246

Tell the waiting SW to skip waiting (triggers controllerchange → reload),
or hard-reload if no SW is pending.

#### `function showUpdateBanner()`
> Line 258

Show a persistent top banner prompting the user to reload for new content.
No-op if the banner is already visible.

#### `function initSW()`
> Line 291

Register the service worker and wire update detection.
Shows the update banner when a new SW is waiting or when the SW broadcasts
UPDATE_AVAILABLE (stale-while-revalidate content change detected).
Auto-refreshes silently if the page has been open ≥ 5 minutes.

#### `function initInstallPrompt()`
> Line 368

Listen for the browser's `beforeinstallprompt` event, defer it, then show
a bottom banner after a short delay inviting the user to install the PWA.
- Skips if already running in standalone mode (already installed).
- Skips if the user dismissed within the last 30 days.
- Clicking "Install" triggers the native browser install dialog.
- Clicking × snoozes the banner for 30 days.

#### `function announce(message, politeness = "polite")`
> Line 441

Announce a message to screen readers via a dedicated aria-live region.
Creates the live region on first call. Polite for info, assertive for errors.
@param {string} message      Text to announce
@param {'polite'|'assertive'} [politeness]  Default: 'polite'

---

### `src/handlers/guest-handlers.js`

#### `function registerGuestHandlers()`
> Line 45

Register all guest-related event handlers.

---

### `src/handlers/section-handlers.js`

#### `function registerSectionHandlers()`
> Line 54

Register budget, analytics, RSVP, gallery, WhatsApp and timeline handlers.

---

### `src/handlers/settings-handlers.js`

#### `function registerSettingsHandlers(ctx)`
> Line 50

Register settings, sheets/sync, and misc event handlers.
@param {{ pendingConflicts: () => any[], applyConflictResolutions: (choices: string[]) => void }} ctx

---

### `src/handlers/table-handlers.js`

#### `function registerTableHandlers()`
> Line 40

Register all table + check-in event handlers.

---

### `src/handlers/vendor-handlers.js`

#### `function registerVendorHandlers()`
> Line 31

Register all vendor + expense event handlers.

---

### `src/sections/analytics.js`

#### `function mount(_container)`
> Line 14


#### `function unmount()`
> Line 64


#### `function renderAnalytics()`
> Line 74

Render all analytics charts into their DOM containers.

#### `function renderBudgetChart()`
> Line 179

Render a budget breakdown bar chart (expenses by category + vendor totals).

#### `function exportMealPerTableCSV()`
> Line 427

Export meal-per-table matrix as CSV.

#### `function printMealPerTable()`
> Line 458

Print meal-per-table report.

#### `function exportAnalyticsPDF()`
> Line 741

F4.3.5 — Generate and print a one-page executive summary PDF.
Opens a new window with a formatted summary of all key stats + charts.

#### `function exportAnalyticsCSV()`
> Line 842

Export analytics summary as CSV.

#### `function renderSeatingMap()`
> Line 904

Render an SVG visual floor plan of all tables with guest names.

#### `function exportEventSummary()`
> Line 965

Export a comprehensive event summary as a printable page.

#### `function renderPaymentSchedule()`
> Line 1021

Render a chronological payment schedule for vendors with due dates.

#### `function renderRsvpTimeline()`
> Line 1065

Render an SVG timeline of RSVP responses over time.

#### `function printDietaryCards()`
> Line 1117

Generate and print per-table dietary requirement cards for the caterer.

#### `function renderExpenseDonut()`
> Line 1177

Render a donut chart of expenses broken down by category.

#### `function checkBudgetOvershoot()`
> Line 1224

Check if total committed (vendors + expenses) exceeds the budget target.
Returns { overBudget: boolean, committed: number, target: number }

#### `function predictNoShowRate()`
> Line 1247

Predict no-show rate based on RSVP timing patterns.
Guests who confirmed late (close to event date) historically have higher no-show rates.
@returns {{ noShowRate: number, expectedNoShows: number, confirmed: number, lateConfirmed: number, details: string }}

#### `function computeArrivalForecast()`
> Line 1285

Compute projected final headcount (heads, not unique guests).
@returns {{ projected: number, confirmed: number, maybe: number, pending: number, declined: number }}

#### `function renderArrivalForecast()`
> Line 1302

Render guest arrival forecast card into #dashForecastCard.

#### `function renderExpenseTrend()`
> Line 1335

Render a month-by-month expense trend as an SVG polyline in #expenseTrendSvg.

#### `function renderTagBreakdown()`
> Line 1428

Render a horizontal bar breakdown of guest tags in #analyticsTagBreakdown.

#### `function renderNoShowPrediction()`
> Line 1482

Render no-show prediction card into #noShowPrediction.

---

### `src/sections/budget.js`

#### `function mount(_container)`
> Line 17


#### `function unmount()`
> Line 31


#### `function saveBudgetEntry(data, existingId = null)`
> Line 41

@param {Record<string, unknown>} data
@param {string|null} [existingId]
@returns {{ ok: boolean, errors?: string[] }}

#### `function deleteBudgetEntry(id)`
> Line 68

@param {string} id

#### `function renderBudget()`
> Line 76


#### `function getBudgetSummary()`
> Line 164

Aggregate budget totals from entries + guest gift contributions.
@returns {{ total: number, gifts: number, expenses: number, balance: number }}

#### `function renderBudgetProgress()`
> Line 185

Render a progress bar showing spent budget vs target.
Reads `weddingInfo.budgetTarget` from the store for the target amount.

#### `function renderExpenseCategoryBreakdown()`
> Line 225

Render an expense breakdown by category in #expenseCategoryBreakdown.
Shows each category with count, total amount, and % of all expenses.

---

### `src/sections/changelog.js`

#### `function mount(_container)`
> Line 10


#### `function unmount()`
> Line 14


#### `async function renderChangelog()`
> Line 18


---

### `src/sections/checkin.js`

#### `function mount(_container)`
> Line 31


#### `function unmount()`
> Line 36


#### `function setCheckinSearch(query)`
> Line 46

@param {string} query

#### `function checkInGuest(guestId)`
> Line 55

Mark a guest as checked-in (present).
@param {string} guestId

#### `function renderCheckin()`
> Line 85


#### `function exportCheckinReport()`
> Line 203

Export check-in report as CSV (name, status, time).

#### `function resetAllCheckins()`
> Line 232

Reset all check-in flags (un-arrive everyone).

#### `function getCheckinStats()`
> Line 246

Aggregate check-in statistics.
@returns {{ total: number, checkedIn: number, checkinRate: number, remaining: number }}

#### `function toggleGiftMode()`
> Line 266

Toggle gift mode — shows/hides gift column in check-in table.

#### `function recordGift(guestId, amount)`
> Line 278

Record a gift for a specific guest.
@param {string} guestId
@param {number} amount

#### `async function startQrScan()`
> Line 293

Start QR scanner using BarcodeDetector API + camera.

#### `function stopQrScan()`
> Line 343

Stop QR scanner and release camera.

#### `function getGuestQrUrl(guestId)`
> Line 361

Generate a QR code URL for a guest (using QR API).
@param {string} guestId
@returns {string} QR code image URL

#### `function checkInByTable(tableId)`
> Line 412

Check in all confirmed guests assigned to a given table at once.
@param {string} tableId

#### `function exportGiftsCSV()`
> Line 439

S21.3 — Export guests who received gifts as a CSV download.

#### `function toggleAccessibilityFilter()`
> Line 469

Toggle accessibility-needs-only filter in the check-in list.

---

### `src/sections/contact-collector.js`

#### `function mount(container)`
> Line 17


#### `function unmount()`
> Line 20


#### `function submitContactForm(data)`
> Line 28

@param {Record<string, unknown>} data
@returns {{ ok: boolean, errors?: string[] }}

---

### `src/sections/dashboard.js`

#### `function mount(_container)`
> Line 28

Mount the dashboard into the given container element.
Wires store subscriptions and renders initial state.
@param {HTMLElement} _container

#### `function unmount()`
> Line 95

Unmount — unsubscribe from store, stop timers.

#### `function renderDashboard()`
> Line 109

Render all dashboard stat elements from the current store state.

#### `function updateTopBar()`
> Line 163

Update the top bar couple names.

#### `function updateCountdown()`
> Line 180

Update the countdown widget with live d:h:m:s (S13.1).

#### `function initStatCounterObserver()`
> Line 271

Set up IntersectionObserver for stat counter animation (S2.6).
Observes all `[data-stat]` elements in the stats grid.

#### `function updateRsvpDeadlineBanner()`
> Line 293

Show/hide the RSVP deadline banner based on rsvpDeadline in weddingInfo.
Shows a warning if the deadline is within 7 days or has passed.

#### `function renderExpenseSummary()`
> Line 325

Render expense/vendor summary widget on the dashboard.

#### `function renderBudgetForecast()`
> Line 387

Render a budget forecast card showing estimated total cost based on
confirmed guest headcount × per-plate estimate vs budget target.
Displays in #dashBudgetForecast.

#### `function renderVendorDueReminders()`
> Line 457

Show upcoming/overdue vendor payments in #dashVendorDueList.
Buckets: overdue, ≤3 days, ≤7 days.

#### `function renderActivityFeed()`
> Line 549

Render the activity feed into the dashboard widget.

#### `function renderVendorCategories()`
> Line 588

Render a summary of vendors grouped by category into #dashVendorCategories.

#### `function renderFollowUpList()`
> Line 634

Render guests who received an invitation but haven't RSVP'd (sent=true + pending).

#### `function renderInvitationStats()`
> Line 695

Render mini invitation statistics into #dashInviteStats.

#### `function renderCheckinProgress()`
> Line 725

Render a check-in progress bar in #dashCheckinCard.

#### `function renderGuestTargetRing()`
> Line 743

Render an SVG donut ring in #dashGuestTargetCard showing confirmed vs total invited.

#### `function renderSuggestedActions()`
> Line 813

Render up to 3 actionable suggestions in #dashSuggestedActions.

#### `function renderGiftProgress()`
> Line 895

Show how many confirmed guests have a gift recorded in #dashGiftProgress.

#### `function renderNextTimelineEvent()`
> Line 913

Show the next upcoming timeline event in #dashNextEventContent.
Hides #dashNextEventCard if no upcoming events found.

---

### `src/sections/expenses.js`

#### `function mount(_container)`
> Line 20


#### `function unmount()`
> Line 25


#### `function saveExpense(data, existingId = null)`
> Line 35

@param {Record<string, unknown>} data
@param {string|null} [existingId]
@returns {{ ok: boolean, errors?: string[] }}

#### `function deleteExpense(id)`
> Line 69

@param {string} id

#### `function renderExpenses()`
> Line 77


#### `function exportExpensesCSV()`
> Line 155

Export all expenses as CSV file download.

#### `function setExpenseCategoryFilter(category)`
> Line 182

S20.3 Set (or clear) the active expense category filter, then re-render.
@param {string} category — pass "all" to clear

#### `function filterExpensesByCategory(category)`
> Line 197

Filter expenses by category for display.
@param {string} category — pass "all" to clear filter
@deprecated Use setExpenseCategoryFilter instead

#### `function openExpenseForEdit(id)`
> Line 205

Pre-fill the expense modal with an existing expense and open it.
@param {string} id

#### `function getExpenseSummary()`
> Line 228

Aggregate expense statistics by category.
@returns {{ total: number, byCategory: Record<string, number> }}

---

### `src/sections/gallery.js`

#### `function mount(_container)`
> Line 17


#### `function unmount()`
> Line 28


#### `function handleGalleryUpload(input)`
> Line 38

Handle file input change — upload images from device.
Reads each selected file as a data-URL and adds to the gallery store.
@param {HTMLInputElement} input

#### `function addGalleryPhoto(photo)`
> Line 57

Add a photo to the gallery.
@param {{ url: string, caption?: string, credit?: string }} photo

#### `function deleteGalleryPhoto(id)`
> Line 67

@param {string} id

#### `function openLightbox(id)`
> Line 79

Open a lightbox showing a full-size photo.
@param {string} id

#### `function renderGallery()`
> Line 136


---

### `src/sections/guest-landing.js`

#### `function mount(container)`
> Line 15


#### `function unmount()`
> Line 20


---

### `src/sections/guests.js`

#### `function mount(_container)`
> Line 41

Mount the guests section.
@param {HTMLElement} _container

#### `function unmount()`
> Line 47


#### `function saveGuest(data, existingId = null)`
> Line 60

Add or update a guest in the store, optimistically mark as pending sync.
@param {Record<string, unknown>} data  Raw form data (validated internally)
@param {string|null} [existingId]      Omit to create; provide to update
@returns {{ ok: boolean, errors?: string[] }}

#### `function deleteGuest(id)`
> Line 136

Delete a guest by ID.
@param {string} id

#### `function clearGuestPendingSync()`
> Line 155

Mark all pending syncs as resolved (called by sheets service on success).

#### `function setFilter(filter)`
> Line 169

Set the active filter and re-render.
@param {string} filter

#### `function setSortField(field)`
> Line 178

Set the sort field and re-render.
@param {string} field

#### `function setSearchQuery(query)`
> Line 187

Set the search query and re-render.
@param {string} query

#### `function renderGuests()`
> Line 195

Render the guest table from current store state, applying filter + sort.

#### `function renderMealSummary()`
> Line 365

S21.1 — Render a meal-type summary bar in #mealSummaryBar.
Shows counts for each meal type across ALL guests (not filtered).

#### `function exportGuestsCsv()`
> Line 393

Export guest list as CSV blob URL.
@returns {string} object URL

#### `function isValidGuestPhone(phone)`
> Line 409


#### `function exportGuestsCSV()`
> Line 416

Export guest list as CSV file download.

#### `function setSideFilter(side)`
> Line 431

Set filter by side (groom/bride/mutual).
@param {string} side

#### `function printGuests()`
> Line 439

Trigger browser print for guest list.

#### `function printGuestsByTable()`
> Line 447

S23.2 — Open a print window with guests grouped by table assignment.
Confirmed guests first, then others; unseated guests in a separate section.

#### `function downloadCSVTemplate()`
> Line 501

Download a blank CSV template for bulk import.

#### `function importGuestsCSV(fileInput)`
> Line 525

Parse a CSV file chosen by the user and bulk-import guests.
Columns (row 0): FirstName, LastName, Phone, Email, Count, Children,
                 Status, Side, Group, Meal, Notes
Existing guests with a matching phone are UPDATED (last-write-wins).
@param {HTMLInputElement|null} [fileInput]  Optional pre-created input element

#### `function openGuestForEdit(id)`
> Line 624

Pre-fill the guest modal with an existing guest's data and open it.
@param {string} id

#### `function getGuestStats()`
> Line 677

Compute comprehensive guest statistics from the current store.
@returns {{
  total: number, confirmed: number, pending: number,
  declined: number, maybe: number,
  totalSeats: number, confirmedSeats: number,
  groom: number, bride: number, mutual: number,
  seated: number, unseated: number,
  vegetarian: number, vegan: number, glutenFree: number, kosher: number,
}}

#### `function filterGuestsByStatus(status)`
> Line 706

Return all guests matching a given status (or all if status is omitted / "all").
@param {string} [status]  e.g. "confirmed" | "pending" | "declined" | "maybe" | "all"
@returns {any[]}

#### `function toggleSelectAll()`
> Line 735


#### `function batchSetStatus(status)`
> Line 751

Set status for all selected guests.
@param {string} status

#### `function batchDeleteGuests()`
> Line 765

Delete all selected guests.

#### `function batchSetMeal(meal)`
> Line 781

Set meal type for all selected guests.
@param {string} meal

#### `function toggleGuestVip(guestId)`
> Line 798

Toggle the VIP flag on a single guest.
@param {string} guestId

#### `function toggleVipFilter()`
> Line 814

Toggle the VIP-only filter and re-render.

#### `function batchMarkUnsent()`
> Line 826

Reset the `sent` flag for all selected guests (mark as not yet sent).

#### `function printGuestBadges()`
> Line 841

Open a print window with a 2-column badge grid for all filtered/confirmed guests.

#### `function findDuplicates()`
> Line 886

Scan for duplicate guests by phone or name similarity.
@returns {{ groupA: any, groupB: any, reason: string }[]}

#### `function mergeGuests(keepId, mergeId)`
> Line 922

Merge two guests — keep target, transfer data from source, delete source.
@param {string} keepId  Guest to keep
@param {string} mergeId Guest to merge into keepId and then delete

#### `function renderDuplicates()`
> Line 950

Render duplicate detection results in the DOM.

#### `function addGuestNote(guestId, noteText)`
> Line 1004

Add a timestamped note to a guest's history log.
@param {string} guestId
@param {string} noteText
@returns {{ ok: boolean }}

#### `function renderGuestHistory(guestId)`
> Line 1024

Render guest notes history in the modal.
@param {string} guestId

#### `function setMultiFilter(field, value)`
> Line 1064

Set a multi-criteria filter and re-render.
@param {string} field — filter dimension (status|side|group|meal|table)
@param {string} value — filter value or "all"

#### `function getMultiFilter()`
> Line 1075

Get current multi-filter state (for UI highlighting).
@returns {typeof _multiFilter}

#### `function addGuestTag(guestId, tag)`
> Line 1086

Add a tag to a guest.
@param {string} guestId
@param {string} tag

#### `function removeGuestTag(guestId, tag)`
> Line 1106

Remove a tag from a guest.
@param {string} guestId
@param {string} tag

---

### `src/sections/invitation.js`

#### `function mount(_container)`
> Line 15


#### `function unmount()`
> Line 20


#### `function updateWeddingDetails()`
> Line 28

Collect wedding detail form fields and persist them.

#### `function handleInvitationUpload(input)`
> Line 77

Handle invitation image upload (file input change).
@param {HTMLInputElement} input

#### `function renderInvitation()`
> Line 102


---

### `src/sections/landing.js`

#### `function mount(_container)`
> Line 13


#### `function unmount()`
> Line 20


#### `function renderLanding()`
> Line 25


#### `function findTableByQuery(query)`
> Line 118

Table finder — look up a guest's assigned table by name/phone.
@param {string} query
@returns {{ table?: any, guest?: any, found: boolean }}

#### `function showTableFinder(query)`
> Line 139

Display table finder result in the DOM.
@param {string} query

---

### `src/sections/registry.js`

#### `function mount(_container)`
> Line 13


#### `function unmount()`
> Line 18


#### `function renderRegistry()`
> Line 23


#### `function addLink(link)`
> Line 57

Add a new registry link to the weddingInfo store.
@param {{ url: string, name?: string }} link

---

### `src/sections/rsvp.js`

#### `function mount(container)`
> Line 18


#### `function unmount()`
> Line 33


#### `function lookupRsvpByPhone(rawPhone)`
> Line 85

Phone-first lookup: search for guest by normalised phone, pre-fill form.
@param {string} rawPhone
@returns {{ found: boolean, guest?: any }}

#### `function submitRsvp(data)`
> Line 102

Submit the RSVP form.
@param {Record<string, unknown>} data
@returns {{ ok: boolean, errors?: string[] }}

#### `function collectPlusOneNames()`
> Line 228

Collect plus-one names from the dynamic fields.
@returns {string[]}

#### `function getRsvpFunnelStats()`
> Line 371

Get RSVP funnel stats for analytics.
@returns {{ invited: number, sent: number, linkClicked: number, formStarted: number, submitted: number, checkedIn: number }}

---

### `src/sections/settings.js`

#### `function mount(_container)`
> Line 23

@param {HTMLElement} _container

#### `function unmount()`
> Line 30


#### `function saveWeddingInfo(data)`
> Line 42

Save wedding info fields from a plain object.
@param {Record<string, unknown>} data
@returns {{ ok: boolean, errors?: string[] }}

#### `async function switchLanguage(lang)`
> Line 66

Switch the app language.
@param {"he"|"en"|"ar"|"ru"} lang

#### `function setTheme(theme)`
> Line 80

Set a CSS theme on <body>.
@param {"rosegold"|"gold"|"emerald"|"royal"|""} theme

#### `function populateSettings()`
> Line 92

Populate settings form fields from current store state.

#### `function updateDataSummary()`
> Line 112

Update the data summary card (guest count, admin emails displayed).

#### `function clearAllData()`
> Line 124

Wipe all local data after user confirmation.

#### `function exportJSON()`
> Line 136

Export all app data as a JSON download.

#### `function importJSON(btn)`
> Line 162

Import data from a JSON file (reads from file input).
@param {HTMLElement} btn  The import button or the file input itself

#### `function copyRsvpLink()`
> Line 210

Copy the RSVP public link to the clipboard.

#### `function copyContactLink()`
> Line 218

Copy the contact form link to the clipboard.

#### `function generateRsvpQrCode()`
> Line 230

Generate and display an RSVP QR code image using the free qrserver.com API.
Renders the QR code into an <img id="rsvpQrCode"> element (if present)
and also opens the direct download URL.
Uses the public, no-key-required API — no runtime dependency.
@returns {string}  The QR code image URL

#### `function saveWebAppUrl(form)`
> Line 249

Save the Apps Script Web App URL from settings form.
@param {HTMLFormElement|null} form

#### `function saveSupabaseConfig()`
> Line 269

Save Supabase configuration (URL + anon key) from Settings inputs.

#### `function saveBackendType()`
> Line 291

Save the selected backend type from the dropdown.

#### `function saveTransportSettings()`
> Line 307

Save transport settings (bus stop times + addresses).
Reads directly from named input elements (no form wrapper required).

#### `function addApprovedEmail()`
> Line 332

Add an email to the approved admin allowlist.

#### `function clearAuditLog()`
> Line 352

Clear the audit log.

#### `function clearErrorLog()`
> Line 359

Clear the error log.

#### `function startAutoBackup(intervalMin = 30)`
> Line 412

Start automatic periodic backups to localStorage.
Saves a snapshot every `intervalMin` minutes.
@param {number} [intervalMin=30]

#### `function stopAutoBackup()`
> Line 423

Stop automatic backups.

#### `function downloadAutoBackup()`
> Line 453

Download the latest auto-backup as a JSON file.

#### `function restoreAutoBackup()`
> Line 465

Restore from the latest auto-backup.

#### `function initQueueMonitor()`
> Line 486

Start monitoring the sync queue and update the badge in settings.
Registers an onSyncStatus listener that refreshes the queue badge.

---

### `src/sections/tables.js`

#### `function mount(_container)`
> Line 24

@param {HTMLElement} _container

#### `function unmount()`
> Line 30


#### `function saveTable(data, existingId = null)`
> Line 42

@param {Record<string, unknown>} data
@param {string|null} [existingId]
@returns {{ ok: boolean, errors?: string[] }}

#### `function deleteTable(id)`
> Line 69

@param {string} id

#### `function autoAssignTables()`
> Line 91

Auto-assign unassigned guests to tables by group priority.
Fills tables in capacity order, preferring family > friends > work > other.

#### `function renderTables()`
> Line 135


#### `function exportTransportCSV()`
> Line 395

Export transport manifest as CSV.

#### `function printTransportManifest()`
> Line 424

Print transport manifest.

#### `function printSeatingChart()`
> Line 433

Trigger browser print for the seating chart.

#### `function printPlaceCards()`
> Line 440

Trigger browser print for place cards.

#### `function printTableSigns()`
> Line 449

Trigger browser print for table signs.

#### `function findTable()`
> Line 459

Look up what table a guest is seated at.
Shows a result in the find-table output element.

#### `function openTableForEdit(id)`
> Line 494

Pre-fill the table modal with an existing table and open it.
@param {string} id

#### `function getTableStats()`
> Line 518

Compute table occupancy statistics from the current store.
@returns {{ totalTables: number, totalCapacity: number, totalSeated: number, available: number }}

#### `function smartAutoAssign()`
> Line 543

Smart table auto-assign that balances guests by side, group, and dietary.
Groups guests by (side + group), then assigns each group to the best-fit table,
keeping same-side/group guests together and considering dietary preferences.

#### `function suggestTableAssignments()`
> Line 608

Return table assignment suggestions without applying them.
Each suggestion includes the guest, recommended table, and reasoning.
@returns {{ guestId: string, guestName: string, tableId: string, tableName: string, reason: string }[]}

---

### `src/sections/timeline.js`

#### `function mount(_container)`
> Line 17


#### `function unmount()`
> Line 25


#### `function saveTimelineItem(data, existingId = null)`
> Line 35

@param {Record<string, unknown>} data
@param {string|null} [existingId]

#### `function deleteTimelineItem(id)`
> Line 58


#### `function renderTimeline()`
> Line 68


#### `function openTimelineForEdit(id)`
> Line 148

Pre-fill the timeline modal with an existing item and open it.
@param {string} id

#### `function checkTimelineAlarms()`
> Line 176

Check timeline items due within the next 24 h.
Shows a browser Notification (if granted) or in-app banner.

#### `function startTimelineAlarms()`
> Line 208

Start the periodic alarm check (runs every 5 minutes after mount).

#### `function stopTimelineAlarms()`
> Line 218

Stop the periodic alarm interval.

#### `function printTimeline()`
> Line 260

Open a print window containing the full timeline schedule.

#### `function toggleTimelineDone(id)`
> Line 304

Toggle the done state of a timeline item.
Persists in the "timelineDone" store key and syncs to Sheets.
@param {string} id

---

### `src/sections/vendors.js`

#### `function mount(_container)`
> Line 18


#### `function unmount()`
> Line 25


#### `function saveVendor(data, existingId = null)`
> Line 35

@param {Record<string, unknown>} data
@param {string|null} [existingId]
@returns {{ ok: boolean, errors?: string[] }}

#### `function deleteVendor(id)`
> Line 68

@param {string} id

#### `function renderVendors()`
> Line 82


#### `function exportVendorsCSV()`
> Line 189

Export all vendors as CSV file download.

#### `function filterVendorsByCategory(category)`
> Line 219

Filter vendors by category for display.
@param {string} category — pass "all" to show all

#### `function openVendorForEdit(id)`
> Line 235

Pre-fill the vendor modal with an existing vendor and open it.
@param {string} id

#### `function getVendorStats()`
> Line 263

Aggregate vendor payment statistics.
@returns {{ total: number, totalCost: number, totalPaid: number, outstanding: number, paymentRate: number }}

#### `function renderOverdueChip()`
> Line 281

Show/hide the overdue vendor count chip in the vendors section header.

#### `function exportVendorPaymentsCSV()`
> Line 303

Export a detailed vendor payments CSV including outstanding and status columns.

---

### `src/sections/whatsapp.js`

#### `function mount(_container)`
> Line 23


#### `function unmount()`
> Line 29


#### `function toggleDeclinedFilter()`
> Line 40

S23.1 — Toggle the declined follow-up filter.
When active, shows only declined guests + loads follow-up template.

#### `function renderWhatsApp()`
> Line 60


#### `function getWhatsAppLink(guestId)`
> Line 135

Get the wa.me URL for a single guest.
@param {string} guestId
@returns {string|null}

#### `function buildWhatsAppMessage(guestId, template)`
> Line 157

Build a preview of the WhatsApp message for a given guest.
Uses the default template (or a supplied custom `template` string) and
interpolates guest + weddingInfo placeholders.
Placeholder tokens: {name}, {date}, {venue}, {groom}, {bride}
@param {string} guestId  — id of the guest
@param {string} [template]  — optional custom template; defaults to wa_default_template
@returns {{ message: string, link: string } | null}

#### `function markGuestSent(guestId)`
> Line 198

Mark a guest as having received a WhatsApp message.
@param {string} guestId

#### `function updateWaPreview(templateText, guest)`
> Line 213

Update the WhatsApp preview bubble with the current template text.
Interpolates using the first guest found (or dummy data).
@param {string} [templateText]
@param {object} [guest]

#### `function sendWhatsAppAll(filter = "all")`
> Line 242

Open all WhatsApp chat links (filter: 'pending' | 'all').
Uses window.open — browsers may block multiple popups; user must allow them.
@param {string} [filter]  'pending' to send only to pending guests, 'all' for everyone

#### `async function sendWhatsAppAllViaApi(filter = "all")`
> Line 273

Send WhatsApp messages via Green API.
@param {string} [filter]  'pending' | 'all'

#### `async function checkGreenApiConnection()`
> Line 326

Test Green API connection (getStateInstance endpoint).

#### `function saveGreenApiConfig(form)`
> Line 359

Save Green API credentials from form.
@param {HTMLFormElement|null} form

#### `function sendWhatsAppReminder()`
> Line 385

Send WhatsApp reminder to guests who were sent an invite but haven't RSVP'd.
Opens wa.me links for each matching guest.

#### `function getScheduledQueue()`
> Line 431

Get the scheduled message queue from localStorage.
@returns {ScheduledMsg[]}

#### `function scheduleReminders(scheduledAt, template)`
> Line 457

Schedule reminders for all pending guests at a specific datetime.
@param {string} scheduledAt  ISO datetime string
@param {string} [template]   Custom message template
@returns {number} Number of reminders scheduled

#### `function processScheduledQueue()`
> Line 479

Check for due scheduled messages and process them.
Call on app boot and periodically.
@returns {string[]} Array of guest IDs that were sent

#### `function cancelScheduledReminders(type = "reminder")`
> Line 511

Cancel all scheduled reminders for a given type.
@param {'reminder'|'thankyou'} [type]

#### `function updateReminderCount()`
> Line 519

Update the reminder count badge shown next to the reminder button.

#### `function sendThankYouMessages()`
> Line 534

Send thank-you WhatsApp messages to checked-in guests.
Opens wa.me links for each guest who checked in.

#### `function getThankYouCount()`
> Line 573

Get count of eligible thank-you recipients.
@returns {number}

#### `async function sendThankYouViaApi()`
> Line 587

Send thank-you messages via Green API with pacing (350ms between sends).
Falls back to wa.me links if Green API is not configured.
@returns {Promise<{ sent: number, failed: number }>}

#### `function generateMailtoLink(guest, templateType = "invitation")`
> Line 671

Generate a mailto: link for a guest with the specified email template.
@param {object} guest  Guest object
@param {'invitation'|'reminder'|'thankyou'} templateType
@returns {string|null}  mailto: URI or null if no email

#### `function sendBatchEmails(templateType = "invitation")`
> Line 704

Open email client for a batch of guests.
@param {'invitation'|'reminder'|'thankyou'} templateType
@returns {number} Number of emails opened

#### `function getUnsentCount()`
> Line 733

Get count of guests who have not yet received a WhatsApp message.
@returns {number}

#### `function toggleUnsentFilter()`
> Line 743

Toggle the "show unsent only" filter in the WhatsApp list.

#### `function renderUnsentBadge()`
> Line 754


#### `function generateICS()`
> Line 772

Generate an iCalendar (.ics) string for the wedding event.
@returns {string|null} iCalendar file content or null if no date

#### `function downloadCalendarInvite()`
> Line 811

Download the wedding .ics calendar invite file.

---

### `src/services/auth.js`

#### `function onAuthChange(fn)`
> Line 28

Register an auth-change listener.
@param {(user: AuthUser | null) => void} fn

#### `function loadSession()`
> Line 36

Load persisted session from localStorage.
@returns {AuthUser | null}

#### `function saveSession(user)`
> Line 46

Save user session to localStorage.
@param {AuthUser} user

#### `function clearSession()`
> Line 55

Clear the current session (logout).

#### `function currentUser()`
> Line 65

Return the currently authenticated user.
@returns {AuthUser | null}

#### `function isApprovedAdmin(email)`
> Line 74

Check if an email is in the admin allowlist.
@param {string} email
@returns {boolean}

#### `function loginOAuth(email, name, picture, provider)`
> Line 95

Handle successful OAuth login. Creates and saves admin session if approved.
@param {string} email
@param {string} name
@param {string} picture
@param {string} provider
@returns {AuthUser | null}  null if email not approved

#### `function loginAnonymous()`
> Line 114

Enter as anonymous guest (RSVP-only, not persisted).
@returns {AuthUser}

#### `function maybeRotateSession()`
> Line 134

Check if the session should be rotated and rotate if needed.
Call this from a setInterval (every 15 min) after admin login.
@returns {boolean}  true if rotation occurred

---

### `src/services/backend.js`

#### `function getBackendType()`
> Line 41

Return the active backend type.
Priority: runtime localStorage → build-time config → "sheets".
@returns {'sheets'|'supabase'|'both'|'none'}

#### `async function syncStoreKey(storeKey)`
> Line 77

Sync a store key to the active backend.
"both" mode writes to sheets AND supabase in parallel.
@param {string} storeKey
@returns {Promise<void>}

#### `async function appendRsvpLog(entry)`
> Line 101

Append an RSVP log entry to the active backend.
"both" mode appends to sheets AND supabase in parallel.
@param {{ phone: string, firstName: string, lastName: string, status: string, count: number, timestamp: string }} entry
@returns {Promise<void>}

#### `async function checkConnection()`
> Line 124

Check connection to the active backend.
"both" mode checks sheets (primary) first.
@returns {Promise<boolean>}

#### `async function createMissingTabs()`
> Line 140

Create missing tables/tabs (Sheets-specific; no-op for Supabase).
@returns {Promise<unknown>}

#### `async function pullAll()`
> Line 155

Pull all data from the active backend into the local store.
"both" mode pulls from sheets (authoritative source).
Supabase-only: no-op (use supabaseRead directly for targeted reads).
@returns {Promise<Record<string, number>>}

#### `async function pushAll()`
> Line 166

Force-push ALL stores to the active backend (ignores the write queue).
"both" mode pushes to sheets (primary). Individual key syncs cover supabase.
@returns {Promise<Record<string, number>>}

---

### `src/services/presence.js`

#### `function onPresenceChange(fn)`
> Line 33

Subscribe to presence updates.
@param {(users: Array<{ email: string, name: string, lastSeen: string }>) => void} fn
@returns {() => void} Unsubscribe

#### `function getPresence()`
> Line 42

Get the current list of active users.
@returns {Array<{ email: string, name: string, lastSeen: string }>}

#### `function startPresence()`
> Line 49

Start sending heartbeats and polling for other users' presence.

#### `function stopPresence()`
> Line 58

Stop presence tracking.

---

### `src/services/sheets-impl.js`

#### `async function sheetsPostImpl(payload)`
> Line 146

POST data to the Apps Script Web App.
F2.1.6: Handles HTTP 429 (Too Many Requests) with exponential backoff.
@param {Record<string, unknown>} payload
@returns {Promise<unknown>}

#### `async function syncStoreKeyToSheetsImpl(storeKey)`
> Line 175

Sync all records of a store key to their Sheets tab (replaceAll).
No-op when Sheets Web App URL is not configured.
@param {string} storeKey
@returns {Promise<void>}

#### `async function appendToRsvpLogImpl(entry)`
> Line 224

Append a single RSVP log entry to the RSVP_Log sheet.
No-op when Sheets Web App URL is not configured.
@param {{ phone: string, firstName: string, lastName: string, status: string, count: number, timestamp: string }} entry
@returns {Promise<void>}

#### `async function sheetsCheckConnectionImpl()`
> Line 243

Verify the Apps Script Web App is reachable.
@returns {Promise<boolean>}

#### `async function createMissingSheetTabsImpl()`
> Line 261

Ask the Apps Script to create any missing sheet tabs.
@returns {Promise<unknown>}

#### `async function sheetsReadImpl(spreadsheetId, sheetName)`
> Line 271

Read data from Google Sheets via GViz query.
@param {string} spreadsheetId
@param {string} sheetName
@returns {Promise<Array<Record<string, unknown>>>}

#### `async function pullAllFromSheetsImpl()`
> Line 342

Pull all data from Google Sheets via GViz and merge into the local store.
Requires the spreadsheet to be shared ("Anyone with the link can view").
Sheets must have been pushed at least once (to establish column header rows).
@returns {Promise<Record<string, number>>}  counts of records per store key

#### `async function pushAllToSheetsImpl()`
> Line 408

Push ALL stores to Google Sheets in one shot (replaceAll for each tab).
Pushes every key in _SHEET_NAMES regardless of the write queue.
For empty stores the tab will contain just the header row (column schema).
This is the "force full sync" used by the Push All button.
@returns {Promise<Record<string, number>>}  row counts written per store key

#### `async function fetchServerSchema()`
> Line 429

Fetch the server schema via GAS `getSchema` action (F2.1.1).
Returns column order + sheet names + GAS version from the server.
@returns {Promise<{ colOrder?: Record<string,string[]>, sheetNames?: Record<string,string>, version?: string } | null>}

#### `function validateSchema(serverColOrder)`
> Line 444

Validate the local `_COL_ORDER` against the server schema (F2.1.2).
Returns an array of mismatch descriptions, or empty if schemas match.
@param {Record<string, string[]>} serverColOrder
@returns {string[]}

#### `async function schemaHandshake(clientVersion)`
> Line 471

Perform schema + version handshake before first sync (F2.1.3).
Calls getSchema, validates columns, checks version compatibility.
@param {string} clientVersion  Current app version
@returns {Promise<{ ok: boolean, errors: string[], serverVersion?: string }>}

---

### `src/services/sheets.js`

#### `function onSyncStatus(fn)`
> Line 36

Register a status-change listener.
@param {(status: 'idle'|'syncing'|'synced'|'error') => void} fn

#### `function syncStatus()`
> Line 49

Return current sync status.
@returns {'idle'|'syncing'|'synced'|'error'}

#### `function enqueueWrite(key, syncFn)`
> Line 58

Enqueue a debounced write operation. Coalesces per `key`.
@param {string} key       Unique key per data type (e.g. 'guests', 'vendors')
@param {() => Promise<void>} syncFn  Async function that performs the actual POST

#### `function mergeLastWriteWins(local, remote)`
> Line 107

Last-write-wins conflict resolution (S3.4).
@param {any[]} local
@param {any[]} remote
@returns {any[]}

#### `function detectConflicts(local, remote)`
> Line 130

S10.2 — Detect conflicts between local and remote arrays.
Returns an array of conflict descriptions where local and remote differ.
@param {any[]} local
@param {any[]} remote
@returns {Array<{ id: string, field: string, localVal: unknown, remoteVal: unknown }>}

#### `async function syncStoreKeyToSheets(storeKey)`
> Line 161

Sync all records of a store key to the active backend.
@param {string} storeKey   e.g. "guests", "vendors", "expenses"
@returns {Promise<void>}

#### `async function sheetsPost(payload)`
> Line 171

POST to the active backend (Sheets-specific — delegates via backend.js).
Kept for backward compat with direct callers; prefers backend dispatcher.
@param {Record<string, unknown>} payload
@returns {Promise<unknown>}

#### `async function sheetsRead(spreadsheetId, sheetName)`
> Line 182

Read data from Google Sheets via GViz query (Sheets-specific).
@param {string} spreadsheetId
@param {string} sheetName
@returns {Promise<Array<Record<string, unknown>>>}

#### `async function syncSheetsNow()`
> Line 191

Flush all queued writes immediately (e.g. triggered by "Sync Now" button).
@returns {Promise<void>}

#### `function initOnlineSync()`
> Line 202

S3.9 — Offline-to-online sync.
Registers a window "online" listener that flushes the write queue
whenever the browser regains network connectivity.
Also sets up "offline", and "visibilitychange" listeners.

#### `async function recoverOfflineQueue(syncFnFactory)`
> Line 256

Recover queued keys from storage after a page reload.
Must be called after initStorage() and after store has been loaded.
@param {(key: string) => () => Promise<void>} syncFnFactory
  Given a store key, returns the async sync function for that key.
@returns {Promise<string[]>} The keys that were recovered

#### `async function sheetsCheckConnection()`
> Line 278

Verify the active backend is reachable.
@returns {Promise<boolean>}

#### `async function createMissingSheetTabs()`
> Line 286

Create missing tables/tabs on the active backend.
@returns {Promise<unknown>}

#### `async function appendToRsvpLog(entry)`
> Line 296

Append a single RSVP log entry to the active backend.
Delegates to backend.js → sheets-impl (RSVP_Log sheet) or supabase (rsvp_log table).
@param {{ phone: string, firstName: string, lastName: string, status: string, count: number, timestamp: string }} entry
@returns {Promise<void>}

#### `async function pullFromSheets()`
> Line 304

Pull all sheets data into the local store (two-way sync: Sheets → App).
@returns {Promise<Record<string, number>>}  counts per store key

#### `async function pushAllToSheets()`
> Line 314

Force-push ALL local stores to Google Sheets regardless of what is in the
write queue. Useful to seed column headers on a fresh spreadsheet or to do
a one-shot full sync.
@returns {Promise<Record<string, number>>}  row counts written per store key

#### `function startLiveSync(intervalMs = _DEFAULT_POLL_MS)`
> Line 337

Start polling for remote changes at a configurable interval.
Calls pullFromSheets() silently at each interval.
@param {number} [intervalMs] Poll interval in milliseconds (default 30 000)
@returns {() => void} Stop function

#### `function stopLiveSync()`
> Line 353

Stop the live sync polling.

#### `function isLiveSyncActive()`
> Line 364

Check whether live sync is currently active.
@returns {boolean}

#### `function queueSize()`
> Line 374

Return the number of pending write entries in the queue.
@returns {number}

#### `function queueKeys()`
> Line 382

Return an array of pending queue keys.
@returns {string[]}

---

### `src/services/supabase.js`

#### `function isConfigured()`
> Line 32


#### `async function syncStoreKeyToSupabase(storeKey)`
> Line 98

Replace all rows in a Supabase table with the current store data.
Uses DELETE + INSERT in a single call via PostgREST bulk insert.
No-op when Supabase is not configured.
@param {string} storeKey   e.g. "guests", "vendors"
@returns {Promise<void>}

#### `async function appendToRsvpLogSupabase(entry)`
> Line 133

Append a single RSVP log entry.
@param {{ phone: string, firstName: string, lastName: string, status: string, count: number, timestamp: string }} entry
@returns {Promise<void>}

#### `async function supabaseRead(table)`
> Line 153

Read all rows from a Supabase table.
@param {string} table  Supabase table name
@returns {Promise<any[]>}

#### `async function supabaseCheckConnection()`
> Line 166

Verify Supabase connection by reading from a health-check-safe table.
@returns {Promise<boolean>}

---

### `src/utils/date.js`

#### `function formatDateHebrew(iso)`
> Line 17

Format an ISO date string (or Date) in the current app locale.
Falls back to Hebrew locale if i18n module not ready.
@param {string|Date} iso
@returns {string}  e.g. "יום שישי, 12 בספטמבר 2025"

#### `function daysUntil(targetIso)`
> Line 28

Count full days remaining until a target date.
@param {string|Date} targetIso  Future date
@returns {number}  Positive if in the future, 0 on the day, negative if passed

#### `function nowISOJerusalem()`
> Line 39

Current ISO timestamp in Asia/Jerusalem timezone.
@returns {string}

---

### `src/utils/form-helpers.js`

#### `function getVal(id)`
> Line 13

Extract the trimmed value of a form element by ID.
For checkboxes returns "true" or "".
@param {string} id  DOM element ID
@returns {string}

#### `function getFormValues(fieldMap)`
> Line 26

Extract multiple form values at once from a map of { resultKey: elementId }.
@param {Record<string, string>} fieldMap  e.g. { firstName: "guestFirstName", ... }
@returns {Record<string, string>}

#### `function openAddModal(modalId, idInputId, titleElId, titleI18n, openModalFn)`
> Line 43

Open an "add new" modal: clear the hidden ID input, set the title i18n key, open.
@param {string} modalId     e.g. "guestModal"
@param {string} idInputId   e.g. "guestModalId"
@param {string} titleElId   e.g. "guestModalTitle"
@param {string} titleI18n   e.g. "modal_add_guest"
@param {(id: string) => void} openModalFn

---

### `src/utils/misc.js`

#### `function uid()`
> Line 9

Generate a short unique ID using Date.now + random base-36.
@returns {string}

#### `function guestFullName(g)`
> Line 18

Return a guest's display name.
@param {{ firstName?: string, lastName?: string }} g
@returns {string}

---

### `src/utils/phone.js`

#### `function cleanPhone(raw)`
> Line 15

Clean and normalise a phone number to international E.164 format.
Israeli 05X numbers → +9725XXXXXXXX (without leading +).
@param {string} raw  Raw phone input from user
@returns {string}    Normalised digits string (digits only, no +)

#### `function isValidPhone(phone)`
> Line 28

Validate a cleaned phone number.
@param {string} phone  Already cleaned (cleanPhone output)
@returns {boolean}

---

### `src/utils/sanitize.js`

#### `function sanitizeInput(str, max = 500)`
> Line 21

Clean a raw input string: trim + length-clamp.
@param {unknown} str
@param {number} [max=500]
@returns {string}

#### `function sanitize(input, schema)`
> Line 34

Sanitize an object against a field schema.
Unknown keys are dropped. Values are coerced to their declared type.
@param {Record<string, unknown>} input
@param {Record<string, SanitizeField>} schema
@returns {{ value: Record<string, unknown>, errors: string[] }}

---

### `src/utils/undo.js`

#### `function pushUndo(label, key, snapshot)`
> Line 20

Push a snapshot onto the undo stack.
@param {string} label  Human-readable description (e.g. "Delete guest Yair")
@param {string} key    Store key that was modified (e.g. "guests")
@param {unknown} snapshot  Deep copy of the store value BEFORE the change

#### `function popUndo()`
> Line 29

Pop the last undo entry and return it, or null if stack is empty.
@returns {UndoEntry | null}

#### `function peekUndo()`
> Line 37

Peek at the top of the undo stack without removing it.
@returns {UndoEntry | null}

#### `function undoStackSize()`
> Line 45

Get the current undo stack size.
@returns {number}

#### `function clearUndo()`
> Line 52

Clear the entire undo stack.

