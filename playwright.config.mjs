// @ts-check
import { defineConfig, devices } from "@playwright/test";

/**
 * Wedding Manager — Playwright E2E configuration.
 *
 * Starts a local static file server before the test suite and runs smoke
 * tests against Chromium only, keeping CI fast.
 *
 * Install browsers once:  npx playwright install --with-deps chromium
 * Run tests:               npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",

  /* One minute per test; generous for slow CI containers */
  timeout: 60_000,

  /* Retry once on CI, never locally */
  retries: process.env.CI ? 1 : 0,

  /* Concurrency: one worker on CI to avoid port conflicts */
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://localhost:3000",
    /* Capture trace on the first retry so failures are diagnosable */
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    /* npx serve is available since serve is a devDependency */
    command: "npx serve . --listen 3000 --no-clipboard",
    url: "http://localhost:3000",
    /* Reuse an existing server in local dev; always start fresh in CI */
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
