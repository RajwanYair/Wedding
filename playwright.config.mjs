// @ts-check
import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP_BASE = join(tmpdir(), "wedding-dev");

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
  outputDir: join(TEMP_BASE, "playwright-results"),

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
    /* Serve the Vite build output */
    command: "npx vite preview --port 3000",
    url: "http://localhost:3000",
    /* Reuse an existing server in local dev; always start fresh in CI */
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
