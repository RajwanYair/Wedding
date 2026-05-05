// @ts-check
import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEMP_BASE = join(tmpdir(), "wedding-dev");

/**
 * Wedding Manager — Playwright E2E configuration.
 *
 * Browser coverage matrix (10 projects):
 *   Desktop : Chromium (Chrome/Opera), Firefox, WebKit (Safari), Edge
 *   Android : Pixel 7 (Chrome), Galaxy S9+ (Samsung Internet / Chrome), Galaxy Tab S4
 *   iOS     : iPhone 14 (Safari), iPhone SE (small), iPad Mini landscape, iPad Pro
 *
 * Engines covered:
 *   Chromium — Chrome, Edge, Opera, Samsung Internet, Android Chrome
 *   Gecko    — Firefox desktop + mobile
 *   WebKit   — Safari macOS/iOS, all iOS browsers, iPadOS
 *
 * Install browsers once:  npx playwright install --with-deps
 * Run tests:               npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/*.spec.mjs"],
  testIgnore: ["**/*-snapshots/**"],
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
    /* App auto-detects UI language from navigator.language; force Hebrew so
       the production default (dir=rtl) is exercised under test. */
    locale: "he-IL",
    /* Capture trace on the first retry so failures are diagnosable */
    trace: "on-first-retry",
  },

  projects: [
    /* ── Desktop browsers ────────────────────────────────────────── */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      /* Microsoft Edge — Chromium engine, distinct UA + EdgeHTML quirks */
      name: "edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" },
    },
    /* ── Android mobile ──────────────────────────────────────────── */
    {
      /* Android Chrome — most common Android browser (Pixel flagship) */
      name: "android-chrome",
      use: { ...devices["Pixel 7"] },
    },
    {
      /* Samsung Internet — default browser on Galaxy devices; Chromium-based
         but ships its own UA and has historically had layout differences. */
      name: "android-samsung",
      use: { ...devices["Galaxy S9+"] },
    },
    {
      /* Android tablet — landscape layout, touch targets */
      name: "android-tablet",
      use: { ...devices["Galaxy Tab S4 landscape"] },
    },
    /* ── iOS / iPadOS ────────────────────────────────────────────── */
    {
      /* Standard iPhone — existing portrait smoke coverage */
      name: "iphone",
      use: { ...devices["iPhone 14"] },
    },
    {
      /* iPhone SE — 375×667 viewport; tests small-screen layout */
      name: "iphone-se",
      use: { ...devices["iPhone SE"] },
    },
    {
      /* iPad Mini landscape — existing tablet coverage */
      name: "ipad-mini",
      use: { ...devices["iPad Mini landscape"] },
    },
    {
      /* iPad Pro landscape — large tablet, tests wide-screen layout */
      name: "ipad-pro",
      use: { ...devices["iPad Pro landscape"] },
    },
  ],

  webServer: {
    /* Serve the Vite build output. VITE_BASE=/ overrides the GH-Pages
       /Wedding/ base so absolute goto("/") in tests resolves to the app
       entry without redirect. */
    command: "npx vite preview --port 3000",
    env: { VITE_BASE: "/" },
    url: "http://localhost:3000",
    /* Reuse an existing server in local dev; always start fresh in CI */
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
