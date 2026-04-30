// @ts-check
/**
 * Wedding Manager — Visual Regression Tests (S405 expanded)
 *
 * Screenshots are stored in tests/e2e/visual.spec.mjs-snapshots/ alongside this file.
 * First run: `npx playwright test tests/e2e/visual.spec.mjs --update-snapshots`
 * Subsequent runs: diffs > 2% pixel threshold fail the test.
 *
 * S405 adds per-section × per-theme matrix for baseline capture in CI.
 * Run: npm run test:e2e
 */
import { test, expect } from "@playwright/test";

const VIEWS = ["dashboard", "guests", "tables", "vendors", "analytics"];

test.describe("Visual regression — desktop (1280×720)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("home page initial render", async ({ page }) => {
    await page.goto("/");
    // Wait for the app shell to be visible (tab bar)
    await page.waitForSelector('[role="tablist"]', { timeout: 10_000 });
    // Dismiss any banners / modals that might be present
    const closeBtn = page.locator('[aria-label="סגור"], [aria-label="Close"]');
    if (await closeBtn.count()) await closeBtn.first().click();

    await expect(page).toHaveScreenshot("home-desktop.png", {
      maxDiffPixelRatio: 0.02,
      fullPage: false,
    });
  });

  for (const view of VIEWS) {
    test(`${view} view`, async ({ page }) => {
      await page.goto(`/#${view}`);
      await page.waitForLoadState("networkidle");
      // Allow animations to settle
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot(`${view}-desktop.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: false,
      });
    });
  }
});

test.describe("Visual regression — mobile (390×844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("home page mobile render", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[role="tablist"]', { timeout: 10_000 });

    await expect(page).toHaveScreenshot("home-mobile.png", {
      maxDiffPixelRatio: 0.02,
      fullPage: false,
    });
  });

  test("guests view mobile", async ({ page }) => {
    await page.goto("/#guests");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot("guests-mobile.png", {
      maxDiffPixelRatio: 0.02,
      fullPage: false,
    });
  });
});

test.describe("Visual regression — themes", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  const THEMES = ["rosegold", "gold", "emerald", "royal"];

  for (const theme of THEMES) {
    test(`theme-${theme}`, async ({ page }) => {
      await page.goto("/");
      await page.waitForSelector('[role="tablist"]', { timeout: 10_000 });
      // Apply theme via class attribute (mirrors what settings.js does)
      await page.evaluate(
        (t) => document.body.setAttribute("class", `theme-${t}`),
        theme,
      );
      await page.waitForTimeout(150);

      await expect(page).toHaveScreenshot(`theme-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
        fullPage: false,
      });
    });
  }
});

// ── S405: Per-section × per-theme matrix ─────────────────────────────────
// Key sections × all 5 themes = 20 baseline screenshots.

const MATRIX_SECTIONS = ["landing", "dashboard", "guests", "tables"];
const ALL_THEMES = ["default", "rosegold", "gold", "emerald", "royal"];

test.describe("Visual regression — section × theme matrix (S405)", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  for (const section of MATRIX_SECTIONS) {
    for (const theme of ALL_THEMES) {
      test(`${section}__${theme}`, async ({ page }) => {
        await page.goto(`/#${section}`);
        await page.waitForLoadState("networkidle");

        // Apply theme (mirrors settings.js behaviour)
        if (theme === "default") {
          await page.evaluate(() => {
            document.body.className = document.body.className
              .replace(/\btheme-\S+/g, "")
              .trim();
          });
        } else {
          await page.evaluate(
            (t) => {
              document.body.className = document.body.className
                .replace(/\btheme-\S+/g, "")
                .trim();
              document.body.classList.add(`theme-${t}`);
            },
            theme,
          );
        }

        // Allow CSS transitions to settle
        await page.waitForTimeout(200);

        await expect(page).toHaveScreenshot(
          `matrix-${section}-${theme}.png`,
          {
            maxDiffPixelRatio: 0.02,
            fullPage: false,
          },
        );
      });
    }
  }
});
