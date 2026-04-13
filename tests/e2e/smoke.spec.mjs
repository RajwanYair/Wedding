// @ts-check
import { test, expect } from "@playwright/test";

/**
 * Wedding Manager — E2E Smoke Tests
 *
 * These tests verify the app loads correctly and core UI elements are present.
 * They run against the local static server configured in playwright.config.mjs.
 */

test.describe("Wedding Manager — Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    /* Wait for app JS to initialise (avoids race on first render) */
    await page.waitForFunction(() => document.title.length > 0, {
      timeout: 8_000,
    });
  });

  test("page loads with wedding title", async ({ page }) => {
    await expect(page).toHaveTitle(/Wedding|חתונה/i);
  });

  test("DOM direction is RTL by default", async ({ page }) => {
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
  });

  test("at least one app section is rendered", async ({ page }) => {
    const section = page.locator("section.section").first();
    await expect(section).toBeAttached();
  });

  test("navigation tab bar is visible", async ({ page }) => {
    const nav = page.locator("#navTabs");
    await expect(nav).toBeVisible();
  });

  test("RSVP section reachable via hash navigation", async ({ page }) => {
    await page.goto("/#rsvp");
    await page.waitForTimeout(500);
    const rsvpSection = page.locator("#sec-rsvp");
    await expect(rsvpSection).toBeAttached();
  });

  test("language toggle button is present", async ({ page }) => {
    const langBtn = page.locator("#btnLang");
    await expect(langBtn).toBeVisible();
  });

  test("language toggle switches to English", async ({ page }) => {
    const langBtn = page.locator("#btnLang");
    await langBtn.click();
    await page.waitForTimeout(400);
    /* After toggle, at least one English nav label should be visible */
    await expect(page.locator("body")).toContainText(
      /Dashboard|Guests|RSVP|Settings/i,
    );
  });

  test("no critical console errors on load", async ({ page }) => {
    const errors = /** @type {string[]} */ ([]);
    page.on("pageerror", (err) => errors.push(err.message));

    /* Reload freshly and let the app settle */
    await page.reload();
    await page.waitForTimeout(1_500);

    /* Filter out known benign errors in a static test environment */
    const critical = errors.filter(
      (msg) =>
        !msg.includes("ServiceWorker") &&
        !msg.includes("Failed to fetch") &&
        !msg.includes("NetworkError"),
    );
    expect(
      critical,
      `Unexpected console errors:\n${critical.join("\n")}`,
    ).toHaveLength(0);
  });

  test("theme toggle button is present", async ({ page }) => {
    const themeBtn = page.locator("#btnTheme");
    await expect(themeBtn).toBeVisible();
  });
});
