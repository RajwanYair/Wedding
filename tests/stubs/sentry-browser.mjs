/**
 * tests/stubs/sentry-browser.mjs — Minimal stub for @sentry/browser
 *
 * Used in the vitest test environment (alias in vite.config.js) so that
 * observability.js can be imported without @sentry/browser installed.
 * The real package is an optional runtime dep; .catch(() => null) already
 * handles the missing-package case at runtime.
 */

export const init = () => {};
export const captureException = () => {};
export const captureMessage = () => {};
export const addBreadcrumb = () => {};
